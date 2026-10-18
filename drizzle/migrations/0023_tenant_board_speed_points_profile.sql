DROP FUNCTION IF EXISTS public.tenant_student_board(uuid, uuid);
CREATE FUNCTION public.tenant_student_board(_institution uuid, _sprint uuid DEFAULT NULL, _since timestamptz DEFAULT NULL)
RETURNS TABLE(student_id uuid, name text, class_name text, points bigint, answered bigint, standing bigint, tier text, practice_points bigint, speed_points bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sp public.tenant_sprints; _from timestamptz; _to timestamptz;
BEGIN
IF NOT (public.tenant_my_student_id(_institution) IS NOT NULL OR public.tenant_has_role(_institution,'teacher') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF _sprint IS NOT NULL THEN
  SELECT * INTO sp FROM public.tenant_sprints WHERE id=_sprint AND institution_id=_institution;
  IF sp.id IS NULL THEN RAISE EXCEPTION 'Unknown sprint'; END IF;
  _from := sp.starts_on::timestamptz; _to := (sp.ends_on+1)::timestamptz;
ELSE _from := COALESCE(_since, '-infinity'::timestamptz); _to := 'infinity'::timestamptz; END IF;
RETURN QUERY WITH pr AS (
  SELECT a.student_id sid, count(*) FILTER (WHERE a.is_correct)*10 pts, count(*) n FROM public.tenant_attempts a
  WHERE a.institution_id=_institution AND a.created_at>=_from AND a.created_at<_to GROUP BY a.student_id
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
END $$;
GRANT EXECUTE ON FUNCTION public.tenant_student_board(uuid, uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.tenant_sprint_leaderboard(_sprint uuid)
RETURNS TABLE(student_id uuid, name text, class_name text, points bigint, answered bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sp public.tenant_sprints;
BEGIN
  SELECT * INTO sp FROM public.tenant_sprints WHERE id=_sprint;
  IF sp.id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT b.student_id, b.name, b.class_name, b.points, b.answered FROM public.tenant_student_board(sp.institution_id, _sprint) b LIMIT 200;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_student_profile(_institution uuid, _student uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.tenant_students; res jsonb;
BEGIN
IF NOT (public.tenant_my_student_id(_institution) IS NOT NULL OR public.tenant_has_role(_institution,'teacher') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT * INTO s FROM public.tenant_students WHERE id=_student AND institution_id=_institution AND active;
IF s.id IS NULL THEN RETURN NULL; END IF;
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
  'history', COALESCE((SELECT jsonb_agg(jsonb_build_object('sprint', hs.name, 'tier', h.tier, 'next_tier', h.next_tier, 'position', h.final_position, 'points', h.points) ORDER BY hs.ends_on DESC)
     FROM (SELECT * FROM public.tenant_rank_history WHERE student_id=s.id ORDER BY created_at DESC LIMIT 5) h JOIN public.tenant_sprints hs ON hs.id=h.sprint_id), '[]'::jsonb)
) INTO res;
RETURN res;
END $$;
GRANT EXECUTE ON FUNCTION public.tenant_student_profile(uuid, uuid) TO authenticated;