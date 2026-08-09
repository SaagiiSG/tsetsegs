ALTER TABLE public.proctor_participants
  ADD COLUMN IF NOT EXISTS module_results jsonb NOT NULL DEFAULT '[]'::jsonb;

DROP FUNCTION IF EXISTS public.proctor_submit(uuid, jsonb, integer);

CREATE OR REPLACE FUNCTION public.proctor_submit(p_participant_id uuid, p_answers jsonb, p_violations integer DEFAULT 0)
 RETURNS TABLE(rw_correct integer, math_correct integer, rw_total integer, math_total integer, submitted_at timestamp with time zone, module_results jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session uuid;
  v_rw_c integer := 0; v_m_c integer := 0; v_rw_t integer := 0; v_m_t integer := 0;
  v_mods jsonb := '[]'::jsonb;
  v_sub timestamptz;
BEGIN
  SELECT pp.session_id INTO v_session FROM public.proctor_participants pp WHERE pp.id = p_participant_id;
  IF v_session IS NULL THEN RAISE EXCEPTION 'participant not found'; END IF;

  WITH paper AS (
    SELECT bmq.question_id, lower(bm.section) AS section, bm.module_number
    FROM public.proctor_sessions ps
    JOIN public.bluebook_modules bm ON bm.test_id = ps.test_id
    JOIN public.bluebook_module_questions bmq ON bmq.module_id = bm.id
    WHERE ps.id = v_session
  ), graded AS (
    SELECT pa.section,
           pa.module_number,
           CASE
             WHEN COALESCE(q.question_type, '') LIKE '%fill%'
               THEN public.fill_answer_matches(COALESCE(p_answers ->> pa.question_id::text, ''), q.answer, q.alternate_answers)
             ELSE upper(btrim(COALESCE(p_answers ->> pa.question_id::text, ''))) = upper(btrim(COALESCE(q.answer, '')))
           END AS is_correct
    FROM paper pa
    JOIN public.questions q ON q.id = pa.question_id
  ), totals AS (
    SELECT COUNT(*) FILTER (WHERE section LIKE 'math%')::integer AS m_t,
           COUNT(*) FILTER (WHERE section NOT LIKE 'math%')::integer AS rw_t,
           COUNT(*) FILTER (WHERE section LIKE 'math%' AND is_correct)::integer AS m_c,
           COUNT(*) FILTER (WHERE section NOT LIKE 'math%' AND is_correct)::integer AS rw_c
    FROM graded
  ), per_module AS (
    SELECT section, module_number,
           COUNT(*)::integer AS total,
           COUNT(*) FILTER (WHERE is_correct)::integer AS correct
    FROM graded
    GROUP BY section, module_number
  ), agg AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
             'module', module_number,
             'section', section,
             'correct', correct,
             'total', total
           ) ORDER BY section, module_number), '[]'::jsonb) AS mods
    FROM per_module
  )
  SELECT totals.m_t, totals.rw_t, totals.m_c, totals.rw_c, agg.mods
    INTO v_m_t, v_rw_t, v_m_c, v_rw_c, v_mods
  FROM totals, agg;

  UPDATE public.proctor_participants pp
     SET answers = COALESCE(p_answers, pp.answers),
         answers_saved_at = now(),
         submitted_at = COALESCE(pp.submitted_at, now()),
         focus_violations = GREATEST(pp.focus_violations, COALESCE(p_violations, 0)),
         rw_correct = v_rw_c, math_correct = v_m_c, rw_total = v_rw_t, math_total = v_m_t,
         module_results = v_mods
   WHERE pp.id = p_participant_id
  RETURNING pp.submitted_at INTO v_sub;

  RETURN QUERY SELECT v_rw_c, v_m_c, v_rw_t, v_m_t, v_sub, v_mods;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.proctor_submit(uuid, jsonb, integer) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.proctor_state(uuid);

CREATE OR REPLACE FUNCTION public.proctor_state(p_participant_id uuid)
 RETURNS TABLE(display_name text, code_verified boolean, oath_accepted boolean, current_module integer, answers jsonb, focus_violations integer, submitted_at timestamp with time zone, session_status text, session_title text, session_current_module integer, module_started_at timestamp with time zone, rw_correct integer, math_correct integer, rw_total integer, math_total integer, module_results jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT pp.display_name,
         pp.code_verified_at IS NOT NULL,
         pp.oath_accepted_at IS NOT NULL,
         pp.current_module,
         pp.answers,
         pp.focus_violations,
         pp.submitted_at,
         ps.status,
         ps.title,
         ps.current_module,
         ps.module_started_at,
         pp.rw_correct,
         pp.math_correct,
         pp.rw_total,
         pp.math_total,
         pp.module_results
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  WHERE pp.id = p_participant_id;
$function$;

GRANT EXECUTE ON FUNCTION public.proctor_state(uuid) TO anon, authenticated, service_role;