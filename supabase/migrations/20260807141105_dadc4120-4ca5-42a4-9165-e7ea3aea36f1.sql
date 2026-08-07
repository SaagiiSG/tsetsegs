-- ============ 1. PREP CLASSES ============
ALTER TABLE public.intense_prep_groups
  ADD COLUMN IF NOT EXISTS join_code text,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

UPDATE public.intense_prep_groups
   SET join_code = upper(substring(encode(extensions.gen_random_bytes(4), 'hex') from 1 for 6))
 WHERE join_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS intense_prep_groups_join_code_key
  ON public.intense_prep_groups (upper(join_code));

ALTER TABLE public.intense_prep_members
  ADD COLUMN IF NOT EXISTS student_account_id uuid REFERENCES public.student_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS joined_via_qr boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS intense_prep_members_group_phone_key
  ON public.intense_prep_members (group_id, manual_phone)
  WHERE manual_phone IS NOT NULL;

ALTER TABLE public.intense_prep_tracking
  ADD COLUMN IF NOT EXISTS bluebook_math_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS review_notes text;

GRANT SELECT ON public.intense_prep_groups TO anon;

-- Public QR join: resolves phone -> prep class membership, awards farewell badge.
CREATE OR REPLACE FUNCTION public.prep_class_join(p_join_code text, p_phone text)
RETURNS TABLE(status text, member_id uuid, group_id uuid, group_name text, display_name text, badge_awarded boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g record;
  s record;
  acc_id uuid;
  digits text;
  v_name text;
  m record;
  v_badge_id uuid;
  v_awarded boolean := false;
BEGIN
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(digits) > 8 THEN digits := right(digits, 8); END IF;
  IF length(digits) <> 8 THEN
    RAISE EXCEPTION 'Please enter a valid 8-digit phone number';
  END IF;

  SELECT * INTO g FROM public.intense_prep_groups pg
   WHERE upper(pg.join_code) = upper(coalesce(p_join_code, ''))
     AND pg.is_active = true
   LIMIT 1;
  IF g.id IS NULL THEN
    RAISE EXCEPTION 'This prep class is not open';
  END IF;
  IF g.end_date IS NOT NULL AND g.end_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Registration for this prep class has closed';
  END IF;

  SELECT st.* INTO s FROM public.students st
   WHERE right(regexp_replace(st.phone, '[^0-9]', '', 'g'), 8) = digits
     AND st.is_ghost = false
   ORDER BY st.created_at DESC
   LIMIT 1;

  SELECT sa.id INTO acc_id FROM public.student_accounts sa
   WHERE right(regexp_replace(sa.phone_number, '[^0-9]', '', 'g'), 8) = digits
     AND sa.is_ghost = false
   ORDER BY sa.created_at DESC
   LIMIT 1;

  IF s.id IS NULL AND acc_id IS NULL THEN
    RETURN QUERY SELECT 'needs_onboarding'::text, NULL::uuid, g.id, g.name, NULL::text, false;
    RETURN;
  END IF;

  v_name := btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''));
  IF v_name = '' THEN v_name := coalesce(s.name, digits); END IF;

  SELECT * INTO m FROM public.intense_prep_members ipm
   WHERE ipm.group_id = g.id AND ipm.manual_phone = digits
   LIMIT 1;

  IF m.id IS NULL THEN
    INSERT INTO public.intense_prep_members(group_id, student_id, student_account_id, manual_name, manual_phone, joined_via_qr)
    VALUES (g.id, s.id, acc_id, v_name, digits, true)
    RETURNING * INTO m;
    INSERT INTO public.intense_prep_tracking(member_id) VALUES (m.id)
      ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.intense_prep_members ipm
       SET student_id = COALESCE(ipm.student_id, s.id),
           student_account_id = COALESCE(ipm.student_account_id, acc_id),
           manual_name = COALESCE(NULLIF(ipm.manual_name, ''), v_name)
     WHERE ipm.id = m.id;
  END IF;

  IF acc_id IS NOT NULL THEN
    SELECT b.id INTO v_badge_id FROM public.badges b
     WHERE b.name = 'One last dance with Tsetsegs family' LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.student_badges(student_account_id, badge_id, progress, is_unlocked, unlocked_at)
      VALUES (acc_id, v_badge_id, 100, true, now())
      ON CONFLICT (student_account_id, badge_id) DO NOTHING;
      v_awarded := true;
    END IF;
  END IF;

  RETURN QUERY SELECT 'joined'::text, m.id, g.id, g.name, v_name, v_awarded;
END;
$$;

REVOKE ALL ON FUNCTION public.prep_class_join(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prep_class_join(text, text) TO anon, authenticated;

-- ============ 2. PROCTORED BLUEBOOK SESSIONS ============
CREATE TABLE IF NOT EXISTS public.proctor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.bluebook_tests(id) ON DELETE CASCADE,
  title text NOT NULL,
  teacher_username text,
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  join_code text NOT NULL UNIQUE,
  unlock_code text NOT NULL,
  status text NOT NULL DEFAULT 'lobby',
  current_module integer NOT NULL DEFAULT 1,
  module_started_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proctor_sessions TO authenticated;
GRANT SELECT ON public.proctor_sessions TO anon;
GRANT ALL ON public.proctor_sessions TO service_role;
ALTER TABLE public.proctor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage proctor sessions" ON public.proctor_sessions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read proctor session state" ON public.proctor_sessions
  FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER update_proctor_sessions_updated_at
  BEFORE UPDATE ON public.proctor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.proctor_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.proctor_sessions(id) ON DELETE CASCADE,
  student_account_id uuid REFERENCES public.student_accounts(id) ON DELETE SET NULL,
  linked_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  phone text NOT NULL,
  display_name text NOT NULL,
  code_verified_at timestamptz,
  oath_accepted_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  current_module integer NOT NULL DEFAULT 1,
  focus_violations integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers_saved_at timestamptz,
  rw_correct integer,
  math_correct integer,
  rw_total integer,
  math_total integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, phone)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proctor_participants TO authenticated;
GRANT ALL ON public.proctor_participants TO service_role;
ALTER TABLE public.proctor_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage proctor participants" ON public.proctor_participants
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_proctor_participants_updated_at
  BEFORE UPDATE ON public.proctor_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.proctor_join(p_join_code text, p_phone text)
RETURNS TABLE(participant_id uuid, session_id uuid, display_name text, code_verified boolean, oath_accepted boolean, submitted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ps record; s record; acc_id uuid; digits text; v_name text; p record;
BEGIN
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(digits) > 8 THEN digits := right(digits, 8); END IF;
  IF length(digits) <> 8 THEN
    RAISE EXCEPTION 'Please enter a valid 8-digit phone number';
  END IF;

  SELECT * INTO ps FROM public.proctor_sessions x
   WHERE upper(x.join_code) = upper(coalesce(p_join_code, ''))
     AND x.status <> 'finished'
   ORDER BY x.created_at DESC LIMIT 1;
  IF ps.id IS NULL THEN
    RAISE EXCEPTION 'This test session is not open';
  END IF;

  SELECT st.* INTO s FROM public.students st
   WHERE right(regexp_replace(st.phone, '[^0-9]', '', 'g'), 8) = digits
     AND st.is_ghost = false
   ORDER BY st.created_at DESC LIMIT 1;
  IF s.id IS NULL THEN
    RAISE EXCEPTION 'This number is not registered with us';
  END IF;

  SELECT sa.id INTO acc_id FROM public.student_accounts sa
   WHERE right(regexp_replace(sa.phone_number, '[^0-9]', '', 'g'), 8) = digits
   ORDER BY (sa.linked_student_id = s.id) DESC LIMIT 1;

  v_name := btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''));
  IF v_name = '' THEN v_name := coalesce(s.name, digits); END IF;

  SELECT * INTO p FROM public.proctor_participants pp
   WHERE pp.session_id = ps.id AND pp.phone = digits LIMIT 1;

  IF p.id IS NULL THEN
    INSERT INTO public.proctor_participants(session_id, student_account_id, linked_student_id, phone, display_name)
    VALUES (ps.id, acc_id, s.id, digits, v_name)
    RETURNING * INTO p;
  END IF;

  RETURN QUERY SELECT p.id, ps.id, p.display_name,
                      p.code_verified_at IS NOT NULL, p.oath_accepted_at IS NOT NULL, p.submitted_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.proctor_unlock(p_participant_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean := false;
BEGIN
  UPDATE public.proctor_participants pp
     SET code_verified_at = COALESCE(pp.code_verified_at, now())
   WHERE pp.id = p_participant_id
     AND EXISTS (
       SELECT 1 FROM public.proctor_sessions ps
        WHERE ps.id = pp.session_id
          AND upper(ps.unlock_code) = upper(btrim(coalesce(p_code, '')))
     )
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.proctor_accept_oath(p_participant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  UPDATE public.proctor_participants pp
     SET oath_accepted_at = COALESCE(pp.oath_accepted_at, now())
   WHERE pp.id = p_participant_id AND pp.code_verified_at IS NOT NULL
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.proctor_save_progress(
  p_participant_id uuid, p_answers jsonb, p_module integer DEFAULT 1, p_violations integer DEFAULT 0)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  UPDATE public.proctor_participants pp
     SET answers = COALESCE(p_answers, '{}'::jsonb),
         answers_saved_at = now(),
         current_module = GREATEST(pp.current_module, COALESCE(p_module, 1)),
         started_at = COALESCE(pp.started_at, now()),
         focus_violations = GREATEST(pp.focus_violations, COALESCE(p_violations, 0))
   WHERE pp.id = p_participant_id AND pp.submitted_at IS NULL
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

-- Server-side grading for a proctored bluebook session.
CREATE OR REPLACE FUNCTION public.proctor_submit(
  p_participant_id uuid, p_answers jsonb, p_violations integer DEFAULT 0)
RETURNS TABLE(rw_correct integer, math_correct integer, rw_total integer, math_total integer, submitted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session uuid;
  v_rw_c integer := 0; v_m_c integer := 0; v_rw_t integer := 0; v_m_t integer := 0;
  v_sub timestamptz;
BEGIN
  SELECT pp.session_id INTO v_session FROM public.proctor_participants pp WHERE pp.id = p_participant_id;
  IF v_session IS NULL THEN RAISE EXCEPTION 'participant not found'; END IF;

  WITH paper AS (
    SELECT bmq.question_id, lower(bm.section) AS section
    FROM public.proctor_sessions ps
    JOIN public.bluebook_modules bm ON bm.test_id = ps.test_id
    JOIN public.bluebook_module_questions bmq ON bmq.module_id = bm.id
    WHERE ps.id = v_session
  ), graded AS (
    SELECT pa.section,
           CASE
             WHEN COALESCE(q.question_type, '') LIKE '%fill%'
               THEN public.fill_answer_matches(COALESCE(p_answers ->> pa.question_id::text, ''), q.answer, q.alternate_answers)
             ELSE upper(btrim(COALESCE(p_answers ->> pa.question_id::text, ''))) = upper(btrim(COALESCE(q.answer, '')))
           END AS is_correct
    FROM paper pa
    JOIN public.questions q ON q.id = pa.question_id
  )
  SELECT COUNT(*) FILTER (WHERE section LIKE 'math%')::integer,
         COUNT(*) FILTER (WHERE section NOT LIKE 'math%')::integer,
         COUNT(*) FILTER (WHERE section LIKE 'math%' AND is_correct)::integer,
         COUNT(*) FILTER (WHERE section NOT LIKE 'math%' AND is_correct)::integer
    INTO v_m_t, v_rw_t, v_m_c, v_rw_c
  FROM graded;

  UPDATE public.proctor_participants pp
     SET answers = COALESCE(p_answers, pp.answers),
         answers_saved_at = now(),
         submitted_at = COALESCE(pp.submitted_at, now()),
         focus_violations = GREATEST(pp.focus_violations, COALESCE(p_violations, 0)),
         rw_correct = v_rw_c, math_correct = v_m_c, rw_total = v_rw_t, math_total = v_m_t
   WHERE pp.id = p_participant_id
  RETURNING pp.submitted_at INTO v_sub;

  RETURN QUERY SELECT v_rw_c, v_m_c, v_rw_t, v_m_t, v_sub;
END;
$$;

REVOKE ALL ON FUNCTION public.proctor_join(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proctor_unlock(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proctor_accept_oath(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proctor_save_progress(uuid, jsonb, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proctor_submit(uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proctor_join(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proctor_unlock(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proctor_accept_oath(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proctor_save_progress(uuid, jsonb, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proctor_submit(uuid, jsonb, integer) TO anon, authenticated;

-- ============ 3. FLOWERS CHALLENGE ============
CREATE TABLE IF NOT EXISTS public.flowers_challenge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  challenge_key text NOT NULL,
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  correct_count integer NOT NULL DEFAULT 0,
  answered_count integer NOT NULL DEFAULT 0,
  duration_ms bigint NOT NULL DEFAULT 0,
  goal_met boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT flowers_challenge_key_check CHECK (challenge_key IN ('68', '150'))
);

CREATE INDEX IF NOT EXISTS flowers_challenge_attempts_board_idx
  ON public.flowers_challenge_attempts (challenge_key, correct_count DESC, duration_ms ASC);

GRANT SELECT, INSERT, UPDATE ON public.flowers_challenge_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.flowers_challenge_attempts TO anon;
GRANT ALL ON public.flowers_challenge_attempts TO service_role;
ALTER TABLE public.flowers_challenge_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own challenge attempts" ON public.flowers_challenge_attempts
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_flowers_challenge_attempts_updated_at
  BEFORE UPDATE ON public.flowers_challenge_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.flowers_challenge_submit(
  p_attempt_id uuid, p_answers jsonb, p_duration_ms bigint)
RETURNS TABLE(correct_count integer, answered_count integer, goal_met boolean, results jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  v_correct integer := 0; v_answered integer := 0; v_results jsonb := '{}'::jsonb; v_goal boolean := false;
  v_badge_id uuid;
BEGIN
  SELECT * INTO a FROM public.flowers_challenge_attempts x WHERE x.id = p_attempt_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;

  WITH given AS (
    SELECT (kv.key)::uuid AS question_id, kv.value AS selected
    FROM jsonb_each_text(COALESCE(p_answers, '{}'::jsonb)) kv
    WHERE kv.value IS NOT NULL AND btrim(kv.value) <> ''
  ), graded AS (
    SELECT g.question_id,
           CASE
             WHEN COALESCE(q.question_type, '') LIKE '%fill%'
               THEN public.fill_answer_matches(g.selected, q.answer, q.alternate_answers)
             ELSE upper(btrim(g.selected)) = upper(btrim(COALESCE(q.answer, '')))
           END AS is_correct
    FROM given g JOIN public.questions q ON q.id = g.question_id
  )
  SELECT COUNT(*) FILTER (WHERE is_correct)::integer, COUNT(*)::integer,
         COALESCE(jsonb_object_agg(question_id::text, is_correct), '{}'::jsonb)
    INTO v_correct, v_answered, v_results
  FROM graded;

  v_goal := v_correct >= 20 AND COALESCE(p_duration_ms, 0) <= 1200000;

  UPDATE public.flowers_challenge_attempts x
     SET answers = COALESCE(p_answers, '{}'::jsonb),
         correct_count = v_correct,
         answered_count = v_answered,
         duration_ms = GREATEST(0, COALESCE(p_duration_ms, 0)),
         goal_met = v_goal,
         submitted_at = COALESCE(x.submitted_at, now())
   WHERE x.id = p_attempt_id;

  INSERT INTO public.point_transactions(student_account_id, points, category, metadata)
  VALUES (a.student_account_id, v_correct * 5, 'flowers_challenge',
          jsonb_build_object('challenge_key', a.challenge_key, 'attempt_id', p_attempt_id, 'goal_met', v_goal));

  IF v_goal THEN
    SELECT b.id INTO v_badge_id FROM public.badges b
     WHERE b.name = CASE WHEN a.challenge_key = '68' THEN 'Flowers Challenge: 68' ELSE 'Flowers Challenge: Hard 150' END
     LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.student_badges(student_account_id, badge_id, progress, is_unlocked, unlocked_at)
      VALUES (a.student_account_id, v_badge_id, 100, true, now())
      ON CONFLICT (student_account_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_correct, v_answered, v_goal, v_results;
END;
$$;

CREATE OR REPLACE FUNCTION public.flowers_challenge_leaderboard(p_challenge_key text, p_limit integer DEFAULT 20)
RETURNS TABLE(student_account_id uuid, display_name text, correct_count integer, duration_ms bigint, goal_met boolean, submitted_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (f.student_account_id)
         f.student_account_id,
         COALESCE(NULLIF(btrim(coalesce(st.first_name,'') || ' ' || coalesce(st.last_name,'')), ''), 'Student') AS display_name,
         f.correct_count, f.duration_ms, f.goal_met, f.submitted_at
  FROM public.flowers_challenge_attempts f
  JOIN public.student_accounts sa ON sa.id = f.student_account_id AND sa.is_ghost = false
  LEFT JOIN public.students st ON st.id = sa.linked_student_id
  WHERE f.challenge_key = p_challenge_key AND f.submitted_at IS NOT NULL
  ORDER BY f.student_account_id, f.correct_count DESC, f.duration_ms ASC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
$$;

REVOKE ALL ON FUNCTION public.flowers_challenge_submit(uuid, jsonb, bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.flowers_challenge_leaderboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flowers_challenge_submit(uuid, jsonb, bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.flowers_challenge_leaderboard(text, integer) TO anon, authenticated;