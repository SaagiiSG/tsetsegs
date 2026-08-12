ALTER TABLE public.proctor_sessions
  ADD COLUMN IF NOT EXISTS review_mode text NOT NULL DEFAULT 'off';

ALTER TABLE public.proctor_sessions
  DROP CONSTRAINT IF EXISTS proctor_sessions_review_mode_check;
ALTER TABLE public.proctor_sessions
  ADD CONSTRAINT proctor_sessions_review_mode_check
  CHECK (review_mode IN ('off', 'correctness', 'explanations'));

CREATE OR REPLACE FUNCTION public.proctor_review(p_participant_id uuid)
RETURNS TABLE(
  review_mode text,
  module_number integer,
  section text,
  order_index integer,
  question_id uuid,
  question_code text,
  question_text text,
  question_image_url text,
  question_image_url_2 text,
  passage_text text,
  question_type text,
  multiple_choice_options jsonb,
  choice_images jsonb,
  student_answer text,
  is_correct boolean,
  correct_answer text,
  rationale text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
  v_answers jsonb;
  v_test uuid;
  v_ok boolean;
BEGIN
  SELECT ps.review_mode,
         COALESCE(pp.answers, '{}'::jsonb),
         ps.test_id,
         (pp.submitted_at IS NOT NULL OR ps.status = 'finished')
    INTO v_mode, v_answers, v_test, v_ok
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  WHERE pp.id = p_participant_id;

  IF v_mode IS NULL OR v_mode = 'off' OR NOT COALESCE(v_ok, false) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT v_mode,
         bm.module_number,
         bm.section,
         bmq.order_index,
         q.id,
         q.question_id,
         q.question_text,
         q.question_image_url,
         q.question_image_url_2,
         q.passage_text,
         q.question_type,
         q.multiple_choice_options,
         q.choice_images,
         NULLIF(btrim(COALESCE(v_answers ->> q.id::text, '')), ''),
         CASE
           WHEN COALESCE(q.question_type, '') LIKE '%fill%'
             THEN public.fill_answer_matches(COALESCE(v_answers ->> q.id::text, ''), q.answer, q.alternate_answers)
           ELSE upper(btrim(COALESCE(v_answers ->> q.id::text, ''))) = upper(btrim(COALESCE(q.answer, '')))
         END,
         CASE WHEN v_mode = 'explanations' THEN q.answer ELSE NULL END,
         CASE WHEN v_mode = 'explanations' THEN q.rationale ELSE NULL END
  FROM public.bluebook_modules bm
  JOIN public.bluebook_module_questions bmq ON bmq.module_id = bm.id
  JOIN public.questions q ON q.id = bmq.question_id
  WHERE bm.test_id = v_test
  ORDER BY bm.module_number, bmq.order_index;
END;
$$;

GRANT EXECUTE ON FUNCTION public.proctor_review(uuid) TO anon, authenticated, service_role;