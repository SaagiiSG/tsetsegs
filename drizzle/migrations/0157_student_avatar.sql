-- Students pick a profile picture (Saagii, 20 Nov 2026):
-- 1. tenant_students.avatar: one of the fixed set in public/avatars (n01-n16, Notionists by Zoish, CC0). NULL = the initial.
-- 2. tenant_set_my_avatar(): any center or solo student sets their own. (Solo names go through 0155's solo_set_name; a
--    center student's name stays with the center admin, because teachers and the roster go by it.)
-- 3. tenant_student_profile (0125's) returns the avatar, and study time on the student's own profile.
-- Safe to run twice.
SET lock_timeout = '3s';

-- Adding pictures: widen this pattern and add the files.
ALTER TABLE public.tenant_students
  ADD COLUMN IF NOT EXISTS avatar text CONSTRAINT tenant_students_avatar_check CHECK (avatar ~ '^n(0[1-9]|1[0-6])$');

CREATE OR REPLACE FUNCTION public.tenant_set_my_avatar(_institution uuid, _avatar text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid := public.tenant_my_student_id(_institution);
BEGIN
  IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  -- '' or NULL goes back to the initial; anything outside the set fails the column check.
  UPDATE public.tenant_students SET avatar = nullif(_avatar, '') WHERE id = sid;
END $$;
REVOKE ALL ON FUNCTION public.tenant_set_my_avatar(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_set_my_avatar(uuid, text) TO authenticated;

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
  'avatar', s.avatar,
  -- The student's own profile only (a classmate's study time stays private): answer time plus speed-run time.
  'study_seconds', CASE WHEN s.id = public.tenant_my_student_id(_institution) THEN
     (SELECT COALESCE(sum(time_spent_seconds),0) FROM public.tenant_attempts WHERE student_id=s.id)
     + (SELECT COALESCE(sum(COALESCE(total_time_seconds, duration_seconds)),0) FROM public.tenant_speed_runs WHERE student_id=s.id) END,
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
DO $$ BEGIN RAISE NOTICE '0157 applied: student profile pictures'; END $$;
