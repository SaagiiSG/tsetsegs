
-- Celebration "already seen" lives on the server
ALTER TABLE public.student_badges ADD COLUMN IF NOT EXISTS celebrated_at timestamptz;
UPDATE public.student_badges SET celebrated_at = coalesce(unlocked_at, now()) WHERE is_unlocked AND celebrated_at IS NULL;

CREATE OR REPLACE FUNCTION public.student_mark_badges_celebrated(p_badge_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := public.request_student_id();
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  UPDATE public.student_badges SET celebrated_at = now()
  WHERE student_account_id = me AND is_unlocked AND celebrated_at IS NULL AND badge_id = ANY(p_badge_ids);
END $$;
GRANT EXECUTE ON FUNCTION public.student_mark_badges_celebrated(uuid[]) TO anon, authenticated;

-- Speed sessions: students record their own, and the totals are checked against real answers
CREATE OR REPLACE FUNCTION public.speed_window_counts(p_student uuid, p_seconds int)
RETURNS TABLE(total int, correct int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int, count(*) FILTER (WHERE is_correct)::int
  FROM public.student_attempts
  WHERE student_account_id = p_student AND attempted_at > now() - make_interval(secs => p_seconds);
$$;

CREATE OR REPLACE FUNCTION public.guard_speed_session()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE w record;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    IF NEW.student_account_id IS DISTINCT FROM public.request_student_id() THEN
      RAISE EXCEPTION 'Please sign in again' USING ERRCODE = '42501';
    END IF;
    NEW.duration_seconds := least(greatest(coalesce(NEW.duration_seconds, 0), 0), 1800);
    SELECT * INTO w FROM public.speed_window_counts(NEW.student_account_id, NEW.duration_seconds + 120);
    NEW.total_questions := least(greatest(coalesce(NEW.total_questions, 0), 0), w.total);
    NEW.correct_count := least(greatest(coalesce(NEW.correct_count, 0), 0), w.correct, NEW.total_questions);
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_speed_session ON public.speed_sessions;
CREATE TRIGGER guard_speed_session BEFORE INSERT ON public.speed_sessions
  FOR EACH ROW EXECUTE FUNCTION public.guard_speed_session();

DROP POLICY IF EXISTS "Public can insert speed sessions" ON public.speed_sessions;
DROP POLICY IF EXISTS "Public can update speed sessions" ON public.speed_sessions;
CREATE POLICY "Students record own speed sessions" ON public.speed_sessions FOR INSERT
  WITH CHECK (student_account_id = public.request_student_id());
DROP POLICY IF EXISTS "Public can insert speed session items" ON public.speed_session_items;
CREATE POLICY "Students record own speed session items" ON public.speed_session_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.speed_sessions s WHERE s.id = session_id AND s.student_account_id = public.request_student_id()));

-- Longest run of consecutive days
CREATE OR REPLACE FUNCTION public.longest_day_run(p_days date[])
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(max(n), 0)::int FROM (
    SELECT count(*) n FROM (
      SELECT d, d - (row_number() OVER (ORDER BY d))::int AS grp FROM (SELECT DISTINCT unnest(p_days) d) x
    ) y GROUP BY grp
  ) z;
$$;

-- The server's rule for every badge a student can earn from the app
CREATE OR REPLACE FUNCTION public.student_badge_earned(p_student uuid, p_badge uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; req jsonb; t text; target int; v int; mon int; secs int; acc numeric; ok boolean;
BEGIN
  SELECT requirements INTO b FROM public.badges WHERE id = p_badge;
  IF NOT FOUND THEN RETURN false; END IF;
  req := CASE WHEN jsonb_typeof(b.requirements) = 'array' THEN b.requirements->0 ELSE b.requirements END;
  t := req->>'type';
  target := coalesce((req->>'target')::int, 0);
  mon := (req->>'month')::int;
  secs := (req->>'max_seconds')::int;
  acc := (req->>'min_accuracy')::numeric;

  IF t = 'streak' THEN
    SELECT greatest(coalesce(longest_streak, 0), coalesce(current_streak, 0)) INTO v
    FROM public.student_streaks WHERE student_account_id = p_student;
    RETURN target > 0 AND coalesce(v, 0) >= target;

  ELSIF t = 'speed_session' THEN
    RETURN EXISTS (SELECT 1 FROM public.speed_sessions
      WHERE student_account_id = p_student AND total_questions >= (req->>'min_questions')::int
        AND duration_seconds <= secs AND correct_count * 100 >= acc * total_questions);

  ELSIF t = 'speed_days' THEN
    SELECT public.longest_day_run(array_agg((created_at AT TIME ZONE 'Asia/Ulaanbaatar')::date)) INTO v
    FROM public.speed_sessions WHERE student_account_id = p_student AND total_questions > 0;
    RETURN v >= target;

  ELSIF t = 'perfect_drills_in_row' THEN
    SELECT coalesce(max(n), 0) INTO v FROM (
      SELECT count(*) n FROM (
        SELECT perfect, sum(CASE WHEN perfect THEN 0 ELSE 1 END) OVER (ORDER BY created_at) grp
        FROM (SELECT created_at, (total_questions > 0 AND correct_count = total_questions) perfect
              FROM public.speed_sessions WHERE student_account_id = p_student) s
      ) r WHERE perfect GROUP BY grp
    ) z;
    RETURN v >= target;

  ELSIF t = 'speed_high_accuracy' THEN
    SELECT count(*) INTO v FROM public.speed_sessions
    WHERE student_account_id = p_student AND total_questions >= 5 AND correct_count * 100 >= acc * total_questions;
    RETURN v >= target;

  ELSIF t = 'days_both' THEN
    SELECT public.longest_day_run(array_agg(d)) INTO v FROM (
      SELECT (created_at AT TIME ZONE 'Asia/Ulaanbaatar')::date d FROM public.speed_sessions WHERE student_account_id = p_student
      INTERSECT
      SELECT (attempted_at AT TIME ZONE 'Asia/Ulaanbaatar')::date FROM public.student_attempts WHERE student_account_id = p_student
    ) x;
    RETURN v >= target;

  ELSIF t = 'correct_run_under_time' AND target BETWEEN 2 AND 500 THEN
    EXECUTE format($q$
      SELECT EXISTS (SELECT 1 FROM (
        SELECT count(*) OVER w c, sum(time_spent_seconds) OVER w s
        FROM (SELECT time_spent_seconds, attempted_at,
                     sum(CASE WHEN is_correct THEN 0 ELSE 1 END) OVER (ORDER BY attempted_at) grp, is_correct
              FROM public.student_attempts WHERE student_account_id = $1) a
        WHERE is_correct
        WINDOW w AS (PARTITION BY grp ORDER BY attempted_at ROWS BETWEEN %s PRECEDING AND CURRENT ROW)
      ) z WHERE c = %s AND s <= $2)$q$, target - 1, target)
    INTO ok USING p_student, secs;
    RETURN ok;

  ELSIF t = 'window_accuracy_under_time' AND target BETWEEN 2 AND 500 THEN
    EXECUTE format($q$
      SELECT EXISTS (SELECT 1 FROM (
        SELECT count(*) OVER w c, sum(time_spent_seconds) OVER w s, count(*) FILTER (WHERE is_correct) OVER w k
        FROM public.student_attempts WHERE student_account_id = $1
        WINDOW w AS (ORDER BY attempted_at ROWS BETWEEN %s PRECEDING AND CURRENT ROW)
      ) z WHERE c = %s AND s <= $2 AND k * 100 >= $3 * c)$q$, target - 1, target)
    INTO ok USING p_student, secs, acc;
    RETURN ok;

  ELSIF t = 'first_try_correct' THEN
    SELECT count(*) INTO v FROM public.student_attempts
    WHERE student_account_id = p_student AND attempt_number = 1 AND is_correct;
    RETURN v >= target;

  ELSIF t = 'month_questions' THEN
    SELECT count(*) INTO v FROM public.student_attempts
    WHERE student_account_id = p_student AND extract(month FROM attempted_at AT TIME ZONE 'Asia/Ulaanbaatar') = mon
    GROUP BY extract(year FROM attempted_at AT TIME ZONE 'Asia/Ulaanbaatar') ORDER BY 1 DESC LIMIT 1;
    RETURN coalesce(v, 0) >= target;

  ELSIF t = 'month_accuracy' THEN
    RETURN EXISTS (SELECT 1 FROM public.student_attempts
      WHERE student_account_id = p_student AND extract(month FROM attempted_at AT TIME ZONE 'Asia/Ulaanbaatar') = mon
      GROUP BY extract(year FROM attempted_at AT TIME ZONE 'Asia/Ulaanbaatar')
      HAVING count(*) >= coalesce((req->>'min_questions')::int, 50)
         AND count(*) FILTER (WHERE is_correct) * 100 >= target * count(*));

  ELSIF t = 'month_daily' THEN
    RETURN EXISTS (SELECT 1 FROM public.student_attempts
      WHERE student_account_id = p_student AND extract(month FROM attempted_at AT TIME ZONE 'Asia/Ulaanbaatar') = mon
      GROUP BY extract(year FROM attempted_at AT TIME ZONE 'Asia/Ulaanbaatar')
      HAVING count(DISTINCT (attempted_at AT TIME ZONE 'Asia/Ulaanbaatar')::date) >= target);
  END IF;

  -- Everything else (sprint wins, Ruby Legend, Penguin, test-based badges)
  -- is awarded by server jobs only.
  RETURN false;
END $$;
