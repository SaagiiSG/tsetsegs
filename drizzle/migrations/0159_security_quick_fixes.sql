-- Security scan 20 Nov 2026, the fixes that change nothing students see (full write-up:
-- flowersos/reports/security-scan-2026-11-20.md). The third one, teachers deleting only their own classes' students,
-- is in the delete-student edge function.
-- #9 all_time_leaderboard: signed-out callers could read a whole cohort's names, points and SAT scores with the public
--    key. Main students still connect as anon with x-student-token, so EXECUTE stays; the rows need a student token or
--    staff. Classmates seeing each other's SAT scores is by design (AllTimeTab, profile card). Limit capped at the app's
--    largest choice (100). The unused 2-argument version goes.
-- #10 generate_ngee_sessions: admin check, and weeks clamped to 1-52.
-- Safe to run twice.
SET lock_timeout = '3s';

CREATE OR REPLACE FUNCTION public.all_time_leaderboard(p_window text DEFAULT 'all'::text, p_limit integer DEFAULT 100, p_cohort text DEFAULT 'mn'::text)
 RETURNS TABLE(student_account_id uuid, username text, total_points bigint, highest_tier text, ruby_weeks integer, sat_math_score integer, sat_english_score integer, sat_total_score integer, sat_score_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cutoff AS (
    SELECT CASE
      WHEN p_window = 'last30' THEN now() - interval '30 days'
      ELSE '-infinity'::timestamptz
    END AS ts
  ), totals AS (
    SELECT pt.student_account_id AS sid, SUM(pt.points)::bigint AS pts
    FROM public.point_transactions pt, cutoff c
    WHERE pt.created_at >= c.ts
    GROUP BY pt.student_account_id
  ), tiers AS (
    SELECT r.student_account_id AS sid,
           MAX(array_position(ARRAY['bronze','silver','gold','platinum','diamond','ruby'], r.current_tier)) AS tier_idx,
           COUNT(*) FILTER (WHERE r.current_tier = 'ruby')::int AS ruby_weeks
    FROM public.student_sprint_rankings r
    GROUP BY r.student_account_id
  )
  SELECT sa.id,
         COALESCE(
           NULLIF(TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(LEFT(s.last_name, 1) || '.', '')), ''),
           RIGHT(sa.phone_number, 4),
           'Anonymous'
         ) AS username,
         t.pts,
         COALESCE((ARRAY['bronze','silver','gold','platinum','diamond','ruby'])[ti.tier_idx], 'unranked') AS highest_tier,
         COALESCE(ti.ruby_weeks, 0),
         sa.sat_math_score,
         sa.sat_english_score,
         sa.sat_total_score,
         sa.sat_score_date
  FROM totals t
  JOIN public.student_accounts sa ON sa.id = t.sid AND sa.is_ghost = false
       AND sa.cohort = COALESCE(NULLIF(p_cohort, ''), 'mn')
  LEFT JOIN public.students s ON s.id = sa.linked_student_id
  LEFT JOIN tiers ti ON ti.sid = t.sid
  -- Signed-in main students (a student token) and staff only; signed-out callers get nothing (security scan 20 Nov).
  WHERE (SELECT public.request_student_id()) IS NOT NULL OR (SELECT public.is_platform_staff())
  ORDER BY t.pts DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 0), 100);
$function$;

DROP FUNCTION IF EXISTS public.all_time_leaderboard(text, integer);

CREATE OR REPLACE FUNCTION public.generate_ngee_sessions(p_course_id uuid, p_weeks_ahead integer DEFAULT 12)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  d date;
  end_d date;
  inserted_count int := 0;
  session_dt timestamptz;
  session_end_dt timestamptz;
  open_at timestamptz;
  close_at timestamptz;
  tz text := 'Asia/Ulaanbaatar';
BEGIN
  -- Admins only (security scan 20 Nov): any signed-in account could add sessions; NGEEAdmin is the only caller.
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  p_weeks_ahead := LEAST(GREATEST(COALESCE(p_weeks_ahead, 12), 1), 52);
  SELECT * INTO c FROM public.ngee_courses WHERE id = p_course_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Course not found'; END IF;
  d := GREATEST(c.start_date, CURRENT_DATE);
  end_d := CURRENT_DATE + (p_weeks_ahead * 7);
  WHILE d <= end_d LOOP
    IF EXTRACT(ISODOW FROM d)::int = ANY(c.weekdays) THEN
      session_dt := ((d::text || ' ' || c.start_time::text)::timestamp) AT TIME ZONE tz;
      session_end_dt := ((d::text || ' ' || c.end_time::text)::timestamp) AT TIME ZONE tz;
      open_at := ((d::text || ' ' || lpad(c.booking_opens_hour::text,2,'0') || ':00')::timestamp) AT TIME ZONE tz;
      close_at := session_dt - (c.booking_closes_hours_before || ' hours')::interval;
      BEGIN
        INSERT INTO public.ngee_sessions(course_id, session_date, session_end_date, booking_opens_at, booking_closes_at, total_seats)
        VALUES (c.id, session_dt, session_end_dt, open_at, close_at, c.total_seats);
        inserted_count := inserted_count + 1;
      EXCEPTION WHEN unique_violation THEN
      END;
    END IF;
    d := d + 1;
  END LOOP;
  RETURN inserted_count;
END;
$function$;

NOTIFY pgrst, 'reload schema';
