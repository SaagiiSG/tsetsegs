ALTER TABLE public.class_test_participants
  ADD COLUMN IF NOT EXISTS draft_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_times jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS draft_saved_at timestamptz;

CREATE OR REPLACE FUNCTION public.class_test_save_draft(
  p_participant_id uuid,
  p_answers jsonb,
  p_flags jsonb DEFAULT '{}'::jsonb,
  p_times jsonb DEFAULT '{}'::jsonb,
  p_violations integer DEFAULT 0
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  UPDATE public.class_test_participants p
     SET draft_answers = COALESCE(p_answers, '{}'::jsonb),
         draft_flags = COALESCE(p_flags, '{}'::jsonb),
         draft_times = COALESCE(p_times, '{}'::jsonb),
         draft_saved_at = now(),
         focus_violations = GREATEST(COALESCE(p.focus_violations, 0), COALESCE(p_violations, 0))
   WHERE p.id = p_participant_id
     AND p.submitted_at IS NULL
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.class_test_load_draft(p_participant_id uuid)
RETURNS TABLE(answers jsonb, flags jsonb, times jsonb, saved_at timestamptz, submitted_at timestamptz, focus_violations integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.draft_answers, p.draft_flags, p.draft_times, p.draft_saved_at, p.submitted_at, COALESCE(p.focus_violations, 0)
  FROM public.class_test_participants p
  WHERE p.id = p_participant_id;
$$;

CREATE OR REPLACE FUNCTION public.class_test_submit(
  p_participant_id uuid,
  p_answers jsonb,
  p_flags jsonb DEFAULT '{}'::jsonb,
  p_times jsonb DEFAULT '{}'::jsonb,
  p_violations integer DEFAULT 0
) RETURNS TABLE(correct_count integer, answered_count integer, submitted_at timestamptz, results jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Grade on the server against the official answer key.
  WITH given AS (
    SELECT (kv.key)::uuid AS question_id, kv.value AS selected
    FROM jsonb_each_text(COALESCE(p_answers, '{}'::jsonb)) kv
    WHERE kv.value IS NOT NULL AND btrim(kv.value) <> ''
  ), graded AS (
    SELECT g.question_id,
           g.selected,
           CASE
             WHEN COALESCE(q.question_type, '') LIKE '%fill%' THEN
               regexp_replace(lower(btrim(g.selected)), '\s+', '', 'g')
                 = regexp_replace(lower(btrim(COALESCE(q.answer, ''))), '\s+', '', 'g')
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
$$;

REVOKE ALL ON FUNCTION public.class_test_save_draft(uuid, jsonb, jsonb, jsonb, integer) FROM public;
REVOKE ALL ON FUNCTION public.class_test_load_draft(uuid) FROM public;
REVOKE ALL ON FUNCTION public.class_test_submit(uuid, jsonb, jsonb, jsonb, integer) FROM public;

GRANT EXECUTE ON FUNCTION public.class_test_save_draft(uuid, jsonb, jsonb, jsonb, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.class_test_load_draft(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.class_test_submit(uuid, jsonb, jsonb, jsonb, integer) TO anon, authenticated;