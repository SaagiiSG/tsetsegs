CREATE OR REPLACE FUNCTION public.fill_answer_matches(p_submitted text, p_expected text, p_alternates text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  cand text;
  s_txt text;
  c_txt text;
  s_num numeric;
  c_num numeric;
  places integer;
BEGIN
  IF p_submitted IS NULL OR btrim(p_submitted) = '' THEN
    RETURN false;
  END IF;

  s_txt := upper(regexp_replace(btrim(p_submitted), '\s+', '', 'g'));

  FOREACH cand IN ARRAY (ARRAY[COALESCE(p_expected, '')] || COALESCE(p_alternates, ARRAY[]::text[])) LOOP
    IF cand IS NULL OR btrim(cand) = '' THEN
      CONTINUE;
    END IF;
    c_txt := upper(regexp_replace(btrim(cand), '\s+', '', 'g'));
    IF s_txt = c_txt THEN
      RETURN true;
    END IF;

    BEGIN
      s_num := replace(s_txt, ',', '')::numeric;
      c_num := replace(c_txt, ',', '')::numeric;
    EXCEPTION WHEN others THEN
      s_num := NULL; c_num := NULL;
    END;

    IF s_num IS NOT NULL AND c_num IS NOT NULL THEN
      IF s_num = c_num THEN
        RETURN true;
      END IF;
      places := COALESCE(length(split_part(replace(c_txt, ',', ''), '.', 2)), 0);
      IF places > 0 AND round(s_num, places) = round(c_num, places) THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.fill_answer_matches(text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fill_answer_matches(text, text, text[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.class_test_submit(p_participant_id uuid, p_answers jsonb, p_flags jsonb DEFAULT '{}'::jsonb, p_times jsonb DEFAULT '{}'::jsonb, p_violations integer DEFAULT 0)
 RETURNS TABLE(correct_count integer, answered_count integer, submitted_at timestamp with time zone, results jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_test_id uuid;
  v_submitted timestamptz;
  v_correct integer := 0;
  v_answered integer := 0;
  v_results jsonb := '{}'::jsonb;
BEGIN
  SELECT p.test_id, p.submitted_at INTO v_test_id, v_submitted
  FROM public.class_test_participants p WHERE p.id = p_participant_id;

  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'participant not found';
  END IF;

  WITH given AS (
    SELECT (kv.key)::uuid AS question_id, kv.value AS selected
    FROM jsonb_each_text(COALESCE(p_answers, '{}'::jsonb)) kv
    WHERE kv.value IS NOT NULL AND btrim(kv.value) <> ''
  ), graded AS (
    SELECT g.question_id,
           g.selected,
           CASE
             WHEN COALESCE(q.question_type, '') LIKE '%fill%' THEN
               public.fill_answer_matches(g.selected, q.answer, q.alternate_answers)
             ELSE upper(btrim(g.selected)) = upper(btrim(COALESCE(q.answer, '')))
           END AS is_correct
    FROM given g
    JOIN public.questions q ON q.id = g.question_id
  ), ins AS (
    INSERT INTO public.class_test_answers (test_id, participant_id, question_id, selected_answer, is_correct, time_ms, flagged)
    SELECT v_test_id, p_participant_id, gr.question_id, gr.selected, gr.is_correct,
           GREATEST(0, COALESCE((COALESCE(p_times, '{}'::jsonb) ->> gr.question_id::text)::numeric, 0))::integer,
           COALESCE((COALESCE(p_flags, '{}'::jsonb) ->> gr.question_id::text)::boolean, false)
    FROM graded gr
    ON CONFLICT (participant_id, question_id) DO UPDATE
      SET selected_answer = EXCLUDED.selected_answer,
          is_correct = EXCLUDED.is_correct,
          time_ms = EXCLUDED.time_ms,
          flagged = EXCLUDED.flagged
    RETURNING 1
  )
  SELECT COUNT(*) FILTER (WHERE gr.is_correct)::integer,
         COUNT(*)::integer,
         COALESCE(jsonb_object_agg(gr.question_id::text, gr.is_correct), '{}'::jsonb)
    INTO v_correct, v_answered, v_results
  FROM graded gr, (SELECT COUNT(*) FROM ins) AS forced;

  UPDATE public.class_test_participants p
     SET submitted_at = COALESCE(p.submitted_at, now()),
         correct_count = v_correct,
         answered_count = v_answered,
         total_time_ms = GREATEST(0, COALESCE((
           SELECT SUM(GREATEST(0, COALESCE(v::numeric, 0)))
           FROM jsonb_each_text(COALESCE(p_times, '{}'::jsonb)) AS t(k, v)
         ), 0))::bigint,
         focus_violations = GREATEST(COALESCE(p.focus_violations, 0), COALESCE(p_violations, 0)),
         draft_answers = COALESCE(p_answers, '{}'::jsonb),
         draft_flags = COALESCE(p_flags, '{}'::jsonb),
         draft_times = COALESCE(p_times, '{}'::jsonb),
         draft_saved_at = now()
   WHERE p.id = p_participant_id
  RETURNING p.submitted_at INTO v_submitted;

  RETURN QUERY SELECT v_correct, v_answered, v_submitted, v_results;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.class_test_submit(uuid, jsonb, jsonb, jsonb, integer) TO anon, authenticated, service_role;