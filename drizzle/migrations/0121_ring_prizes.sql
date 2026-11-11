-- Daily ring prizes (Saagii, 10 Nov 2026). Closing a daily ring (Speed, Hard, Medium) pays once a day, and
-- closing all three on the same day pays a 25-point bonus. The server counts the progress and decides the amount;
-- the page only asks. Same numbers as src/lib/ringPrizes.ts: speed 10 per run, hard 5 and medium 2 per question,
-- the goal counted toward the prize capped at 5 / 15 / 30. "Today" starts at the student's local midnight: the page
-- sends tz_offset_min = -new Date().getTimezoneOffset(), clamped here to -840..840.
-- Center students claim through tenant_claim_ring_prize() into tenant_ring_prizes, which the center board counts as
-- practice points. Main students insert a 'ring_prize' point_transactions row, priced by student_points_allowed()
-- through guard_point_transaction (0024), which also adds it to league points.
-- A ring pays once per local day: the date at the student's offset when it was paid. A claim is refused while that ring
-- has a payout dated today or later, so moving the offset west can't pay a ring twice (moving east pays a day early, once).
-- The center profile counts prizes too, so it agrees with the board again. Safe to run twice.
SET lock_timeout = '3s';

-- Widen point_transactions.category to allow 'ring_prize' (latest list: supabase/migrations/20260807155004).
ALTER TABLE public.point_transactions DROP CONSTRAINT IF EXISTS point_transactions_category_check;
-- NOT VALID, then VALIDATE: the row scan needs only SHARE UPDATE EXCLUSIVE (the DROP's lock still lasts until commit).
ALTER TABLE public.point_transactions ADD CONSTRAINT point_transactions_category_check
  CHECK (category = ANY (ARRAY['questions','section_bonus','speed_session','badge','bank_completion','streak_daily','flowers_challenge','class_test','challenge','ring_prize'])) NOT VALID;
ALTER TABLE public.point_transactions VALIDATE CONSTRAINT point_transactions_category_check;

CREATE OR REPLACE FUNCTION public.ring_prize_points(_ring text, _goal int)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _ring = 'all' THEN 25
    WHEN coalesce(_goal, 0) <= 0 THEN 0
    WHEN _ring = 'speed' THEN least(_goal, 5) * 10
    WHEN _ring = 'hard' THEN least(_goal, 15) * 5
    WHEN _ring = 'medium' THEN least(_goal, 30) * 2
    ELSE 0 END
$$;

-- The student's local date at _at for the offset the page sent (minutes east of UTC): junk counts as 0, clamped to
-- -840..840. Both claims date today and every past payout with it, so the two always agree.
CREATE OR REPLACE FUNCTION public.ring_prize_day(_at timestamptz, _tz_offset_min text)
RETURNS date LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT ((_at AT TIME ZONE 'UTC') + make_interval(mins => least(840, greatest(-840, coalesce(
    CASE WHEN _tz_offset_min ~ '^-?[0-9]{1,6}$' THEN _tz_offset_min::int END, 0)))))::date
$$;

-- ============ Center: prizes table and claim ============
CREATE TABLE IF NOT EXISTS public.tenant_ring_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  ring text NOT NULL CHECK (ring IN ('speed', 'hard', 'medium', 'all')),
  points int NOT NULL CHECK (points >= 0),
  day date NOT NULL, -- the student's local date when it was paid (ring_prize_day)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, ring, day)
);
CREATE INDEX IF NOT EXISTS tenant_ring_prizes_student_idx ON public.tenant_ring_prizes (student_id, created_at DESC);
-- tenant_student_board reads prizes by center and window, like 0087's indexes on attempts and speed runs.
CREATE INDEX IF NOT EXISTS tenant_ring_prizes_institution_created_idx ON public.tenant_ring_prizes (institution_id, created_at);
-- Rows are written only by tenant_claim_ring_prize.
REVOKE ALL ON public.tenant_ring_prizes FROM anon, authenticated;
GRANT SELECT ON public.tenant_ring_prizes TO authenticated;
GRANT ALL ON public.tenant_ring_prizes TO service_role;
ALTER TABLE public.tenant_ring_prizes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students read own ring prizes" ON public.tenant_ring_prizes;
CREATE POLICY "Students read own ring prizes" ON public.tenant_ring_prizes FOR SELECT TO authenticated
  USING (student_id = public.tenant_my_student_id(institution_id));

CREATE OR REPLACE FUNCTION public.tenant_claim_ring_prize(_institution uuid, _ring text, _tz_offset_min int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid; tz_off int; day_start timestamptz; today date; goal int; prog int; prize int;
BEGIN
  me := public.tenant_my_student_id(_institution);
  IF me IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  -- Two tabs claiming at once take turns, and the second one sees the first one's row.
  PERFORM pg_advisory_xact_lock(hashtext('ring' || me::text));
  IF _ring IS NULL OR _ring NOT IN ('speed', 'hard', 'medium', 'all') THEN RETURN 0; END IF;
  tz_off := least(840, greatest(-840, coalesce(_tz_offset_min, 0)));
  -- Truncated in UTC so the session's TimeZone setting can't move the student's midnight.
  day_start := date_trunc('day', now() + make_interval(mins => tz_off), 'UTC') - make_interval(mins => tz_off);
  today := public.ring_prize_day(now(), tz_off::text);
  -- Once per ring per local day, so raising the goal after a payout pays nothing more.
  IF EXISTS (SELECT 1 FROM public.tenant_ring_prizes WHERE student_id = me AND ring = _ring AND day >= today) THEN RETURN 0; END IF;
  IF _ring = 'all' THEN
    IF (SELECT count(DISTINCT ring) FROM public.tenant_ring_prizes
        WHERE student_id = me AND ring IN ('speed', 'hard', 'medium') AND day = today) < 3 THEN RETURN 0; END IF;
    prize := public.ring_prize_points('all', 0);
  ELSE
    SELECT CASE _ring WHEN 'speed' THEN g.speed WHEN 'hard' THEN g.hard ELSE g.medium END INTO goal
      FROM public.tenant_student_goals g WHERE g.student_id = me;
    goal := coalesce(goal, CASE _ring WHEN 'speed' THEN 2 WHEN 'hard' THEN 5 ELSE 10 END);
    IF _ring = 'speed' THEN
      -- A run with nothing correct is an empty row, not a run.
      SELECT count(*) INTO prog FROM public.tenant_speed_runs
        WHERE student_id = me AND correct > 0 AND created_at >= day_start;
    ELSE
      SELECT count(DISTINCT a.question_id) INTO prog FROM public.tenant_attempts a
        JOIN public.intl_questions q ON q.id = a.question_id
        WHERE a.student_id = me AND a.is_correct AND a.created_at >= day_start AND lower(q.difficulty_level) = _ring;
    END IF;
    prize := public.ring_prize_points(_ring, goal);
    IF prog < goal OR prize = 0 THEN RETURN 0; END IF;
  END IF;
  INSERT INTO public.tenant_ring_prizes (institution_id, student_id, ring, points, day) VALUES (_institution, me, _ring, prize, today);
  RETURN prize;
END $$;
REVOKE ALL ON FUNCTION public.tenant_claim_ring_prize(uuid, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_claim_ring_prize(uuid, text, int) TO authenticated;

-- ============ Main: 'ring_prize' points ============
-- 0051's function plus the ring_prize branch. VOLATILE (was STABLE) so the ring branch's reads after its lock see a
-- payout another tab committed while this one waited; the guard trigger is its only caller.
CREATE OR REPLACE FUNCTION public.student_points_allowed(p_student uuid, p_category text, p_points integer, p_meta jsonb, p_sprint uuid)
 RETURNS integer LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE qid uuid; att record; ring_key text; tz_off int; day_start timestamptz; today date; intl boolean; goal int; prog int; prize int;
BEGIN
  IF p_student IS NULL OR p_student IS DISTINCT FROM public.request_student_id() THEN
    RAISE EXCEPTION 'Please sign in again' USING ERRCODE = '42501';
  END IF;
  IF p_sprint IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sprints WHERE id = p_sprint AND is_active) THEN
    RETURN NULL;
  END IF;
  IF p_category IN ('questions', 'speed_session') THEN
    IF coalesce(p_meta->>'session_summary', '') = 'true' THEN RETURN 0; END IF;
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
    IF p_category = 'questions' THEN
      -- Practice: a question pays once, ever.
      IF EXISTS (SELECT 1 FROM public.point_transactions
        WHERE student_account_id = p_student AND category = 'questions' AND points > 0
          AND metadata->>'question_id' = qid::text) THEN RETURN NULL; END IF;
      RETURN CASE att.attempt_number WHEN 1 THEN 10 WHEN 2 THEN 5 WHEN 3 THEN 2 ELSE NULL END;
    END IF;
    -- Speed: reviewing solved questions fast is the point; each question pays once per day in speed.
    IF EXISTS (SELECT 1 FROM public.point_transactions
      WHERE student_account_id = p_student AND category = 'speed_session' AND points > 0
        AND metadata->>'question_id' = qid::text AND created_at > now() - interval '20 hours') THEN RETURN NULL; END IF;
    RETURN least(greatest(coalesce(p_points, 0), 0), 15);
  ELSIF p_category = 'streak_daily' THEN
    IF EXISTS (SELECT 1 FROM public.point_transactions
      WHERE student_account_id = p_student AND category = 'streak_daily' AND created_at > now() - interval '20 hours') THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.student_attempts
      WHERE student_account_id = p_student AND attempted_at > now() - interval '1 day') THEN RETURN NULL; END IF;
    RETURN least(greatest(coalesce(p_points, 0), 0), 100);
  ELSIF p_category = 'ring_prize' THEN
    -- Metadata: { "ring": "speed"|"hard"|"medium"|"all", "tz_offset_min": <int> }. The page's p_points is ignored.
    ring_key := p_meta->>'ring';
    IF ring_key IS NULL OR ring_key NOT IN ('speed', 'hard', 'medium', 'all') THEN RETURN NULL; END IF;
    PERFORM pg_advisory_xact_lock(hashtext('ring' || p_student::text));
    tz_off := least(840, greatest(-840, coalesce(
      CASE WHEN p_meta->>'tz_offset_min' ~ '^-?[0-9]{1,6}$' THEN (p_meta->>'tz_offset_min')::int END, 0)));
    day_start := date_trunc('day', now() + make_interval(mins => tz_off), 'UTC') - make_interval(mins => tz_off);
    today := public.ring_prize_day(now(), p_meta->>'tz_offset_min');
    -- Once per ring per local day; each payout's day is taken at the offset it was paid with (its own metadata).
    IF EXISTS (SELECT 1 FROM public.point_transactions
      WHERE student_account_id = p_student AND category = 'ring_prize' AND metadata->>'ring' = ring_key
        AND public.ring_prize_day(created_at, metadata->>'tz_offset_min') >= today) THEN RETURN NULL; END IF;
    IF ring_key = 'all' THEN
      IF (SELECT count(DISTINCT metadata->>'ring') FROM public.point_transactions
          WHERE student_account_id = p_student AND category = 'ring_prize' AND metadata->>'ring' IN ('speed', 'hard', 'medium')
            AND public.ring_prize_day(created_at, metadata->>'tz_offset_min') = today) < 3 THEN RETURN NULL; END IF;
      RETURN public.ring_prize_points('all', 0);
    END IF;
    SELECT cohort = 'intl', CASE ring_key WHEN 'speed' THEN daily_goal_speed WHEN 'hard' THEN daily_goal_hard ELSE daily_goal_medium END
      INTO intl, goal FROM public.student_accounts WHERE id = p_student;
    goal := coalesce(goal, CASE ring_key WHEN 'speed' THEN 2 WHEN 'hard' THEN 5 ELSE 10 END);
    IF ring_key = 'speed' THEN
      -- A logged run counts only alongside a paid speed answer, so bare log rows can't fill the ring.
      prog := least(
        (SELECT count(*) FROM public.student_activity_logs
          WHERE student_account_id = p_student AND activity_type = 'speed_mode_complete' AND created_at >= day_start),
        (SELECT count(*) FROM public.point_transactions
          WHERE student_account_id = p_student AND category = 'speed_session' AND points > 0 AND created_at >= day_start));
    ELSE
      -- Same bank as useDailyProgress's qEmbed: Mongolian rows -> questions, intl students' rows -> intl_questions.
      SELECT count(DISTINCT a.question_id) INTO prog FROM public.student_attempts a
        LEFT JOIN public.questions q ON intl IS NOT TRUE AND q.id = a.question_id AND q.bank = a.mn_bank
        LEFT JOIN public.intl_questions iq ON intl AND iq.id = a.question_id AND iq.bank = a.intl_bank
        WHERE a.student_account_id = p_student AND a.is_correct AND a.attempted_at >= day_start
          AND lower(coalesce(iq.difficulty_level, q.difficulty_level)) = ring_key;
    END IF;
    prize := public.ring_prize_points(ring_key, goal);
    IF prog < goal OR prize = 0 THEN RETURN NULL; END IF;
    RETURN prize;
  END IF;
  RETURN NULL;
END $function$;

-- ============ Center board: prizes count as practice points ============
-- 0031's board; only the pr CTE changed: it also adds tenant_ring_prizes points (not answers) in the same window.
CREATE OR REPLACE FUNCTION public.tenant_student_board(_institution uuid, _sprint uuid DEFAULT NULL::uuid, _since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(student_id uuid, name text, class_name text, points bigint, answered bigint, standing bigint, tier text, practice_points bigint, speed_points bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE sp public.tenant_sprints; _from timestamptz; _to timestamptz;
BEGIN
IF NOT (public.tenant_my_student_id(_institution) IS NOT NULL OR public.tenant_has_role(_institution,'teacher') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF _sprint IS NOT NULL THEN
  SELECT * INTO sp FROM public.tenant_sprints WHERE id=_sprint AND institution_id=_institution;
  IF sp.id IS NULL THEN RAISE EXCEPTION 'Unknown sprint'; END IF;
  _from := sp.starts_on::timestamptz; _to := (sp.ends_on+1)::timestamptz;
ELSE _from := COALESCE(_since, '-infinity'::timestamptz); _to := 'infinity'::timestamptz; END IF;
RETURN QUERY WITH pr AS (
  SELECT x.sid, COALESCE(sum(x.pts),0) pts, COALESCE(sum(x.n),0) n FROM (
    SELECT a.student_id sid, COALESCE(a.points, CASE WHEN a.is_correct THEN 10 ELSE 0 END) pts, 1 n FROM public.tenant_attempts a
    WHERE a.institution_id=_institution AND a.created_at>=_from AND a.created_at<_to
    UNION ALL
    SELECT p.student_id, p.points, 0 FROM public.tenant_ring_prizes p
    WHERE p.institution_id=_institution AND p.created_at>=_from AND p.created_at<_to
  ) x GROUP BY x.sid
), sr AS (
  SELECT r.student_id sid, COALESCE(sum(r.correct),0)*10 pts, COALESCE(sum(r.total),0) n FROM public.tenant_speed_runs r
  WHERE r.institution_id=_institution AND r.created_at>=_from AND r.created_at<_to GROUP BY r.student_id
), scores AS (
  SELECT s.id, s.name, c.name class_name, COALESCE(pr.pts,0)::bigint ppts, COALESCE(sr.pts,0)::bigint spts,
    (COALESCE(pr.n,0)+COALESCE(sr.n,0))::bigint answered,
    COALESCE((SELECT h.next_tier FROM public.tenant_rank_history h JOIN public.tenant_sprints hs ON hs.id=h.sprint_id WHERE h.student_id=s.id AND (_sprint IS NULL OR hs.ends_on<sp.starts_on) ORDER BY hs.ends_on DESC,h.created_at DESC LIMIT 1),'unranked') tier
  FROM public.tenant_students s LEFT JOIN public.tenant_classes c ON c.id=s.class_id
  LEFT JOIN pr ON pr.sid=s.id LEFT JOIN sr ON sr.sid=s.id
  WHERE s.institution_id=_institution AND s.active
)
SELECT sc.id, sc.name, sc.class_name, sc.ppts+sc.spts, sc.answered,
  row_number() OVER (ORDER BY sc.ppts+sc.spts DESC, sc.answered DESC, sc.name, sc.id), sc.tier, sc.ppts, sc.spts
FROM scores sc ORDER BY sc.ppts+sc.spts DESC, sc.answered DESC, sc.name, sc.id;
END $function$;

-- ============ Center profile: prizes count, as on the board ============
-- 0086's profile; only 'points' and 'activity' changed: both add tenant_ring_prizes (points, not answers).
CREATE OR REPLACE FUNCTION public.tenant_student_profile(_institution uuid, _student uuid, _tz text DEFAULT 'UTC')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.tenant_students; res jsonb;
BEGIN
IF NOT (public.tenant_my_student_id(_institution) IS NOT NULL OR public.tenant_has_role(_institution,'teacher') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT * INTO s FROM public.tenant_students WHERE id=_student AND institution_id=_institution AND active;
IF s.id IS NULL THEN RETURN NULL; END IF;
IF _tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN _tz := 'UTC'; END IF;
SELECT jsonb_build_object(
  'name', s.name,
  'class_name', (SELECT name FROM public.tenant_classes WHERE id=s.class_id),
  'joined', s.created_at,
  'tier', COALESCE((SELECT h.next_tier FROM public.tenant_rank_history h JOIN public.tenant_sprints hs ON hs.id=h.sprint_id WHERE h.student_id=s.id ORDER BY hs.ends_on DESC, h.created_at DESC LIMIT 1),'unranked'),
  'practice_answered', (SELECT count(*) FROM public.tenant_attempts WHERE student_id=s.id),
  'practice_correct', (SELECT count(*) FROM public.tenant_attempts WHERE student_id=s.id AND is_correct),
  'math_correct', (SELECT count(*) FROM public.tenant_attempts a JOIN public.intl_questions q ON q.id=a.question_id WHERE a.student_id=s.id AND a.is_correct AND lower(coalesce(q.subject,'math'))<>'english'),
  'english_correct', (SELECT count(*) FROM public.tenant_attempts a JOIN public.intl_questions q ON q.id=a.question_id WHERE a.student_id=s.id AND a.is_correct AND lower(q.subject)='english'),
  'speed_runs', (SELECT count(*) FROM public.tenant_speed_runs WHERE student_id=s.id),
  'speed_correct', (SELECT COALESCE(sum(correct),0) FROM public.tenant_speed_runs WHERE student_id=s.id),
  'best_speed', (SELECT max(correct) FROM public.tenant_speed_runs WHERE student_id=s.id),
  'active_days_30', (SELECT count(DISTINCT d) FROM (SELECT created_at::date d FROM public.tenant_attempts WHERE student_id=s.id AND created_at>now()-interval '30 days' UNION SELECT created_at::date FROM public.tenant_speed_runs WHERE student_id=s.id AND created_at>now()-interval '30 days') x),
  'last_active', (SELECT max(t) FROM (SELECT max(created_at) t FROM public.tenant_attempts WHERE student_id=s.id UNION ALL SELECT max(created_at) FROM public.tenant_speed_runs WHERE student_id=s.id) y),
  -- Same formula as tenant_student_board (0031), so the profile and the leaderboard never disagree.
  'points', (SELECT COALESCE(sum(COALESCE(points, CASE WHEN is_correct THEN 10 ELSE 0 END)),0) FROM public.tenant_attempts WHERE student_id=s.id)
          + (SELECT COALESCE(sum(correct),0)*10 FROM public.tenant_speed_runs WHERE student_id=s.id)
          + (SELECT COALESCE(sum(points),0) FROM public.tenant_ring_prizes WHERE student_id=s.id),
  -- Only the "Regular" badge (10 classes) needs it, so a classmate's full attendance count stays private.
  'present', LEAST(10, (SELECT count(*) FROM public.tenant_attendance WHERE student_id=s.id AND status IN ('present','late'))),
  'solved_ids', COALESCE((SELECT jsonb_agg(DISTINCT question_id) FROM public.tenant_attempts WHERE student_id=s.id AND is_correct), '[]'::jsonb),
  'activity', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', d, 'points', p, 'answers', n) ORDER BY d) FROM (
     SELECT d, sum(p) p, sum(n) n FROM (
       SELECT (created_at AT TIME ZONE _tz)::date d, COALESCE(points, CASE WHEN is_correct THEN 10 ELSE 0 END) p, 1 n
         FROM public.tenant_attempts WHERE student_id=s.id AND created_at > now() - interval '371 days'
       UNION ALL SELECT (created_at AT TIME ZONE _tz)::date, correct*10, 0
         FROM public.tenant_speed_runs WHERE student_id=s.id AND created_at > now() - interval '371 days'
       UNION ALL SELECT (created_at AT TIME ZONE _tz)::date, points, 0
         FROM public.tenant_ring_prizes WHERE student_id=s.id AND created_at > now() - interval '371 days') x GROUP BY d) y), '[]'::jsonb),
  'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('sprint', hs.name, 'tier', h.tier, 'next_tier', h.next_tier, 'position', h.final_position, 'points', h.points) ORDER BY hs.ends_on, h.created_at)
     FROM public.tenant_rank_history h JOIN public.tenant_sprints hs ON hs.id=h.sprint_id WHERE h.student_id=s.id), '[]'::jsonb)
) INTO res;
RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.tenant_student_profile(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_student_profile(uuid, uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE '0121 applied: daily ring prizes'; END $$;
