-- Badges are unlocked by the server only. The app used to decide unlocks with its
-- own rules and ask; when the two disagreed, earned badges stayed locked at 99%.
-- Now the app only reports progress, and student_claim_badges() unlocks every
-- badge the server rules below say is earned.

-- Hot Streak also counts days with paid speed answers (rule copied from 0027).
CREATE OR REPLACE FUNCTION public.student_badge_earned_core(p_student uuid, p_badge uuid)
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
    -- Saved sessions only go back to 26 Jul 2026; paid speed answers go back to January.
    SELECT public.longest_day_run(array_agg(d)) INTO v FROM (
      SELECT (created_at AT TIME ZONE 'Asia/Ulaanbaatar')::date d FROM public.speed_sessions
      WHERE student_account_id = p_student AND total_questions > 0
      UNION
      SELECT (created_at AT TIME ZONE 'Asia/Ulaanbaatar')::date FROM public.point_transactions
      WHERE student_account_id = p_student AND category = 'speed_session' AND points > 0
    ) x;
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

CREATE OR REPLACE FUNCTION public.guard_student_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    IF TG_OP = 'UPDATE' AND OLD.is_unlocked THEN
      -- earned steps are never lost, and the date stays the original one
      NEW.is_unlocked := true; NEW.unlocked_at := OLD.unlocked_at; NEW.progress := 100;
    ELSE
      NEW.is_unlocked := false; NEW.unlocked_at := NULL;
      NEW.progress := least(greatest(coalesce(NEW.progress, 0), 0), 99);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.student_claim_badges()
RETURNS SETOF uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET statement_timeout = '15s' AS $$
DECLARE me uuid := public.request_student_id(); b record; earned boolean;
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  FOR b IN SELECT bg.id FROM public.badges bg WHERE NOT EXISTS (
    SELECT 1 FROM public.student_badges sb
    WHERE sb.student_account_id = me AND sb.badge_id = bg.id AND sb.is_unlocked)
  LOOP
    BEGIN
      earned := public.student_badge_earned(me, b.id);
    EXCEPTION WHEN others THEN
      earned := false; -- one broken rule must not block the other badges
    END;
    IF earned THEN
      -- pay_badge_points pays the badge's points on this unlock
      INSERT INTO public.student_badges (student_account_id, badge_id, is_unlocked, unlocked_at, progress)
      VALUES (me, b.id, true, now(), 100)
      ON CONFLICT (student_account_id, badge_id)
      DO UPDATE SET is_unlocked = true, unlocked_at = now(), progress = 100;
      RETURN NEXT b.id;
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.student_claim_badges() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_claim_badges() TO anon, authenticated;

-- Nothing calls this directly any more (the claim runs as the owner). Open, it let
-- anyone signed out look up any student's badges and run slow checks.
REVOKE ALL ON FUNCTION public.student_badge_earned(uuid, uuid) FROM PUBLIC, anon, authenticated;

UPDATE public.badges SET description = 'Complete 10 speed sessions of 5+ questions with 95%+ accuracy'
WHERE name = 'Peak of Speed';
