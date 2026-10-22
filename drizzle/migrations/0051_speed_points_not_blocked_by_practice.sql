CREATE OR REPLACE FUNCTION public.student_points_allowed(p_student uuid, p_category text, p_points integer, p_meta jsonb, p_sprint uuid)
 RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE qid uuid; att record;
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
  END IF;
  RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.all_time_my_standing(p_window text DEFAULT 'all', p_cohort text DEFAULT 'mn')
 RETURNS TABLE(standing bigint, total_points bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH c AS (SELECT CASE WHEN p_window='last30' THEN now()-interval '30 days' ELSE '-infinity'::timestamptz END ts),
  t AS (SELECT pt.student_account_id sid, SUM(pt.points)::bigint pts FROM public.point_transactions pt, c
        JOIN public.student_accounts sa ON true
        WHERE pt.created_at >= c.ts AND sa.id = pt.student_account_id AND sa.is_ghost = false
          AND sa.cohort = COALESCE(NULLIF(p_cohort,''),'mn')
        GROUP BY pt.student_account_id),
  me AS (SELECT pts FROM t WHERE sid = public.request_student_id())
  SELECT (SELECT count(*) FROM t WHERE t.pts > me.pts) + 1, me.pts FROM me;
$$;
GRANT EXECUTE ON FUNCTION public.all_time_my_standing(text, text) TO anon, authenticated;