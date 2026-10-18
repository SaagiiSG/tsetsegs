
-- ============ 1. Password hashes move to a server-only table ============
CREATE TABLE IF NOT EXISTS public.student_credentials (
  student_account_id uuid PRIMARY KEY REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.student_credentials TO service_role;
ALTER TABLE public.student_credentials ENABLE ROW LEVEL SECURITY;
-- no policies: only the server (service role / definer functions) can read it

INSERT INTO public.student_credentials (student_account_id, password_hash)
SELECT id, password_hash FROM public.student_accounts
WHERE password_hash IS NOT NULL AND password_hash <> 'set'
ON CONFLICT (student_account_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now();

UPDATE public.student_accounts SET password_hash = 'set'
WHERE password_hash IS NOT NULL AND password_hash <> 'set';

COMMENT ON COLUMN public.student_accounts.password_hash IS 'Marker only: ''set'' when a password exists. Real hash lives in student_credentials.';

-- ============ 2. Server-issued secret session tokens ============
ALTER TABLE public.student_sessions ADD COLUMN IF NOT EXISTS token_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS student_sessions_token_hash_key ON public.student_sessions (token_hash) WHERE token_hash IS NOT NULL;

CREATE OR REPLACE FUNCTION public.request_student_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t text; sid uuid;
BEGIN
  BEGIN
    t := nullif(current_setting('request.headers', true), '')::json->>'x-student-token';
  EXCEPTION WHEN others THEN t := NULL;
  END;
  IF t IS NULL OR length(t) < 32 THEN RETURN NULL; END IF;
  SELECT s.student_account_id INTO sid
  FROM public.student_sessions s
  JOIN public.student_accounts a ON a.id = s.student_account_id
  WHERE s.token_hash = encode(sha256(convert_to(t, 'UTF8')), 'hex')
    AND s.is_active AND s.expires_at > now()
    AND NOT coalesce(a.is_blocked, false)
  LIMIT 1;
  RETURN sid;
END $$;
GRANT EXECUTE ON FUNCTION public.request_student_id() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));
$$;
GRANT EXECUTE ON FUNCTION public.is_platform_staff() TO anon, authenticated;

-- Session helpers for the student app
CREATE OR REPLACE FUNCTION public.student_session_alive()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.request_student_id();
$$;
GRANT EXECUTE ON FUNCTION public.student_session_alive() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.student_logout()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t text;
BEGIN
  BEGIN t := nullif(current_setting('request.headers', true), '')::json->>'x-student-token';
  EXCEPTION WHEN others THEN t := NULL; END;
  IF t IS NULL THEN RETURN; END IF;
  UPDATE public.student_sessions SET is_active = false
  WHERE token_hash = encode(sha256(convert_to(t, 'UTF8')), 'hex');
END $$;
GRANT EXECUTE ON FUNCTION public.student_logout() TO anon, authenticated;

-- ============ 3. Protect student_accounts ============
CREATE OR REPLACE FUNCTION public.guard_student_account()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE guarded boolean := current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff();
BEGIN
  IF guarded THEN
    IF TG_OP = 'INSERT' THEN
      NEW.password_hash := NULL; NEW.password_set_at := NULL;
      NEW.registered_device_id := NULL; NEW.device_registered_at := NULL; NEW.device_fingerprint := NULL;
      NEW.is_blocked := false; NEW.blocked_reason := NULL; NEW.blocked_at := NULL;
      NEW.is_dev_account := false; NEW.auth_user_id := NULL; NEW.is_ghost := false;
    ELSE
      NEW.password_hash := OLD.password_hash; NEW.password_set_at := OLD.password_set_at;
      NEW.registered_device_id := OLD.registered_device_id; NEW.device_registered_at := OLD.device_registered_at;
      NEW.device_fingerprint := OLD.device_fingerprint;
      NEW.is_blocked := OLD.is_blocked; NEW.blocked_reason := OLD.blocked_reason; NEW.blocked_at := OLD.blocked_at;
      NEW.is_dev_account := OLD.is_dev_account; NEW.auth_user_id := OLD.auth_user_id; NEW.is_ghost := OLD.is_ghost;
      NEW.phone_number := OLD.phone_number; NEW.is_active := OLD.is_active;
      NEW.share_token := OLD.share_token; NEW.share_token_created_at := OLD.share_token_created_at;
      NEW.last_login := OLD.last_login; NEW.rank_unlocked_at := OLD.rank_unlocked_at;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.store_student_password_hash()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash <> 'set' THEN
    INSERT INTO public.student_credentials (student_account_id, password_hash)
    VALUES (NEW.id, NEW.password_hash)
    ON CONFLICT (student_account_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = now();
    NEW.password_hash := 'set';
  ELSIF NEW.password_hash IS NULL AND TG_OP = 'UPDATE' AND OLD.password_hash IS NOT NULL THEN
    DELETE FROM public.student_credentials WHERE student_account_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS a_guard_student_account ON public.student_accounts;
CREATE TRIGGER a_guard_student_account BEFORE INSERT OR UPDATE ON public.student_accounts
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_account();
DROP TRIGGER IF EXISTS b_store_student_password_hash ON public.student_accounts;
CREATE TRIGGER b_store_student_password_hash BEFORE INSERT OR UPDATE ON public.student_accounts
  FOR EACH ROW EXECUTE FUNCTION public.store_student_password_hash();

DROP POLICY IF EXISTS "Public can update student accounts" ON public.student_accounts;
CREATE POLICY "Students update own account" ON public.student_accounts FOR UPDATE
  USING (id = public.request_student_id()) WITH CHECK (id = public.request_student_id());

-- ============ 4. Lock sign-in records ============
DROP POLICY IF EXISTS "Public can insert sessions" ON public.student_sessions;
DROP POLICY IF EXISTS "Allow session creation" ON public.student_sessions;
DROP POLICY IF EXISTS "Allow session update" ON public.student_sessions;
DROP POLICY IF EXISTS "Allow session read" ON public.student_sessions;
CREATE POLICY "Students read own sessions" ON public.student_sessions FOR SELECT
  USING (student_account_id = public.request_student_id() OR public.is_platform_staff());

-- ============ 5. Server grading of answers ============
CREATE OR REPLACE FUNCTION public.grade_student_answer(p_question uuid, p_answer text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q record;
BEGIN
  SELECT answer, alternate_answers INTO q FROM public.questions WHERE id = p_question;
  IF NOT FOUND OR q.answer IS NULL OR p_answer IS NULL THEN RETURN false; END IF;
  RETURN upper(btrim(p_answer)) = upper(btrim(q.answer))
      OR public.fill_answer_matches(p_answer, q.answer, q.alternate_answers);
END $$;

CREATE OR REPLACE FUNCTION public.guard_student_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE me uuid;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    me := public.request_student_id();
    IF me IS NULL OR NEW.student_account_id IS DISTINCT FROM me THEN
      RAISE EXCEPTION 'Please sign in again' USING ERRCODE = '42501';
    END IF;
    NEW.is_correct := public.grade_student_answer(NEW.question_id, NEW.answer_submitted);
    NEW.attempted_at := now();
    NEW.time_spent_seconds := greatest(coalesce(NEW.time_spent_seconds, 0), 0);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_student_attempt ON public.student_attempts;
CREATE TRIGGER guard_student_attempt BEFORE INSERT ON public.student_attempts
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_attempt();

DROP POLICY IF EXISTS "Public can insert attempts" ON public.student_attempts;
DROP POLICY IF EXISTS "Public can update attempts" ON public.student_attempts;
CREATE POLICY "Students insert own attempts" ON public.student_attempts FOR INSERT
  WITH CHECK (student_account_id = public.request_student_id());

-- ============ 6. Server-decided points ============
CREATE OR REPLACE FUNCTION public.student_points_allowed(p_student uuid, p_category text, p_points integer, p_meta jsonb, p_sprint uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE qid uuid; att record;
BEGIN
  IF p_student IS NULL OR p_student IS DISTINCT FROM public.request_student_id() THEN
    RAISE EXCEPTION 'Please sign in again' USING ERRCODE = '42501';
  END IF;
  IF p_sprint IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sprints WHERE id = p_sprint AND is_active) THEN
    RETURN NULL;
  END IF;

  IF p_category IN ('questions', 'speed_session') THEN
    IF coalesce(p_meta->>'session_summary', '') = 'true' THEN
      RETURN 0; -- speed summary rows carry stats only, never points
    END IF;
    BEGIN qid := (p_meta->>'question_id')::uuid;
    EXCEPTION WHEN others THEN RETURN NULL; END;
    IF qid IS NULL THEN RETURN NULL; END IF;
    SELECT attempt_number, is_correct, attempted_at INTO att
    FROM public.student_attempts
    WHERE student_account_id = p_student AND question_id = qid
    ORDER BY attempt_number DESC LIMIT 1;
    IF NOT FOUND OR NOT att.is_correct OR att.attempted_at < now() - interval '15 minutes' THEN
      RETURN NULL;
    END IF;
    -- Repeat answers pay nothing: a question pays once, ever.
    IF EXISTS (
      SELECT 1 FROM public.point_transactions
      WHERE student_account_id = p_student
        AND category IN ('questions', 'speed_session')
        AND points > 0
        AND metadata->>'question_id' = qid::text
    ) THEN RETURN NULL; END IF;
    IF p_category = 'questions' THEN
      RETURN CASE att.attempt_number WHEN 1 THEN 10 WHEN 2 THEN 5 WHEN 3 THEN 2 ELSE NULL END;
    END IF;
    RETURN least(greatest(coalesce(p_points, 0), 0), 15);
  ELSIF p_category = 'streak_daily' THEN
    IF EXISTS (
      SELECT 1 FROM public.point_transactions
      WHERE student_account_id = p_student AND category = 'streak_daily'
        AND created_at > now() - interval '20 hours'
    ) THEN RETURN NULL; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.student_attempts
      WHERE student_account_id = p_student AND attempted_at > now() - interval '1 day'
    ) THEN RETURN NULL; END IF;
    RETURN least(greatest(coalesce(p_points, 0), 0), 100);
  END IF;
  RETURN NULL; -- every other kind of point is awarded by the server only
END $$;

CREATE OR REPLACE FUNCTION public.add_league_points(p_student uuid, p_sprint uuid, p_points integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.student_sprint_rankings
  SET total_points = coalesce(total_points, 0) + p_points, updated_at = now()
  WHERE student_account_id = p_student AND sprint_id = p_sprint;
$$;
REVOKE EXECUTE ON FUNCTION public.add_league_points(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_point_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE allowed integer;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    allowed := public.student_points_allowed(NEW.student_account_id, NEW.category, NEW.points, NEW.metadata, NEW.sprint_id);
    IF allowed IS NULL THEN RETURN NULL; END IF; -- silently not paid
    NEW.points := allowed;
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_point_transaction ON public.point_transactions;
CREATE TRIGGER guard_point_transaction BEFORE INSERT ON public.point_transactions
  FOR EACH ROW EXECUTE FUNCTION public.guard_point_transaction();

CREATE OR REPLACE FUNCTION public.apply_student_league_points()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  -- Only student-app rows: server functions update rankings themselves.
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff()
     AND NEW.sprint_id IS NOT NULL AND NEW.points > 0 AND NEW.category <> 'streak_daily' THEN
    PERFORM public.apply_league_points_definer(NEW.student_account_id, NEW.sprint_id, NEW.points);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.apply_league_points_definer(p_student uuid, p_sprint uuid, p_points integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_student IS DISTINCT FROM public.request_student_id() THEN RETURN; END IF;
  -- only called right after a validated insert of this exact row
  IF NOT EXISTS (
    SELECT 1 FROM public.point_transactions
    WHERE student_account_id = p_student AND sprint_id = p_sprint AND points = p_points
      AND created_at > now() - interval '5 seconds'
  ) THEN RETURN; END IF;
  PERFORM public.add_league_points(p_student, p_sprint, p_points);
END $$;
REVOKE EXECUTE ON FUNCTION public.apply_league_points_definer(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_league_points_definer(uuid, uuid, integer) TO anon, authenticated;

DROP TRIGGER IF EXISTS apply_student_league_points ON public.point_transactions;
CREATE TRIGGER apply_student_league_points AFTER INSERT ON public.point_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_student_league_points();

DROP POLICY IF EXISTS "Public can insert point transactions" ON public.point_transactions;
CREATE POLICY "Students insert own points" ON public.point_transactions FOR INSERT
  WITH CHECK (student_account_id = public.request_student_id());

-- ============ 7. Rankings: students may only join a sprint ============
CREATE OR REPLACE FUNCTION public.student_league_sum(p_student uuid, p_sprint uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(points), 0)::int FROM public.point_transactions
  WHERE student_account_id = p_student AND sprint_id = p_sprint AND category <> 'streak_daily';
$$;

CREATE OR REPLACE FUNCTION public.student_inherited_tier(p_student uuid, p_sprint uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(reserved_next_tier, current_tier) FROM public.student_sprint_rankings
  WHERE student_account_id = p_student AND sprint_id <> p_sprint
  ORDER BY created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.guard_student_ranking()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE prev text;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    IF NOT EXISTS (SELECT 1 FROM public.sprints WHERE id = NEW.sprint_id AND is_active) THEN
      RAISE EXCEPTION 'Sprint is not active' USING ERRCODE = '42501';
    END IF;
    prev := public.student_inherited_tier(NEW.student_account_id, NEW.sprint_id);
    IF prev IS NOT NULL THEN
      NEW.current_tier := prev;
    ELSIF NEW.current_tier NOT IN ('bronze', 'silver') THEN
      NEW.current_tier := 'bronze';
    END IF;
    NEW.total_points := public.student_league_sum(NEW.student_account_id, NEW.sprint_id);
    NEW.final_rank := NULL; NEW.is_top_1 := false; NEW.reserved_next_tier := NULL;
    NEW.group_number := greatest(coalesce(NEW.group_number, 1), 1);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_student_ranking ON public.student_sprint_rankings;
CREATE TRIGGER guard_student_ranking BEFORE INSERT ON public.student_sprint_rankings
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_ranking();

DROP POLICY IF EXISTS "Public can insert rankings" ON public.student_sprint_rankings;
DROP POLICY IF EXISTS "Public can update rankings" ON public.student_sprint_rankings;
CREATE POLICY "Students join sprints" ON public.student_sprint_rankings FOR INSERT
  WITH CHECK (student_account_id = public.request_student_id());

-- ============ 8. Streaks: one step per day, only after practising ============
CREATE OR REPLACE FUNCTION public.student_practised_recently(p_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_attempts WHERE student_account_id = p_student AND attempted_at > now() - interval '1 day');
$$;

CREATE OR REPLACE FUNCTION public.guard_student_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.current_streak := least(coalesce(NEW.current_streak, 0), 1);
      NEW.longest_streak := NEW.current_streak;
      NEW.total_practice_days := NEW.current_streak;
      NEW.freezers_available := 0; NEW.freezers_earned_total := 0;
    ELSE
      IF NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date THEN
        IF NOT public.student_practised_recently(NEW.student_account_id) OR NEW.last_activity_date > (now() + interval '1 day')::date THEN
          RETURN OLD;
        END IF;
        NEW.current_streak := least(greatest(coalesce(NEW.current_streak, 0), 0), coalesce(OLD.current_streak, 0) + 1);
        NEW.total_practice_days := least(coalesce(NEW.total_practice_days, 0), coalesce(OLD.total_practice_days, 0) + 1);
      ELSE
        NEW.current_streak := OLD.current_streak;
        NEW.total_practice_days := OLD.total_practice_days;
      END IF;
      NEW.longest_streak := greatest(coalesce(OLD.longest_streak, 0), coalesce(NEW.current_streak, 0));
      NEW.freezers_available := least(coalesce(NEW.freezers_available, 0), coalesce(OLD.freezers_available, 0) + 1);
      NEW.freezers_earned_total := least(coalesce(NEW.freezers_earned_total, 0), coalesce(OLD.freezers_earned_total, 0) + 1);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_student_streak ON public.student_streaks;
CREATE TRIGGER guard_student_streak BEFORE INSERT OR UPDATE ON public.student_streaks
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_streak();

DROP POLICY IF EXISTS "Students can insert their own streak" ON public.student_streaks;
DROP POLICY IF EXISTS "Students can update their own streak" ON public.student_streaks;
CREATE POLICY "Students insert own streak" ON public.student_streaks FOR INSERT
  WITH CHECK (student_account_id = public.request_student_id());
CREATE POLICY "Students update own streak" ON public.student_streaks FOR UPDATE
  USING (student_account_id = public.request_student_id()) WITH CHECK (student_account_id = public.request_student_id());
CREATE POLICY "Admins manage streaks" ON public.student_streaks FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ 9. Badges and featured badges: own rows only ============
DROP POLICY IF EXISTS "Public can insert student badges" ON public.student_badges;
DROP POLICY IF EXISTS "Public can update student badges" ON public.student_badges;
CREATE POLICY "Students insert own badges" ON public.student_badges FOR INSERT
  WITH CHECK (student_account_id = public.request_student_id());
CREATE POLICY "Students update own badges" ON public.student_badges FOR UPDATE
  USING (student_account_id = public.request_student_id()) WITH CHECK (student_account_id = public.request_student_id());

DROP POLICY IF EXISTS "Public can insert featured badges" ON public.featured_badges;
DROP POLICY IF EXISTS "Public can update featured badges" ON public.featured_badges;
DROP POLICY IF EXISTS "Public can delete featured badges" ON public.featured_badges;
CREATE POLICY "Students manage own featured badges" ON public.featured_badges FOR ALL
  USING (student_account_id = public.request_student_id()) WITH CHECK (student_account_id = public.request_student_id());
