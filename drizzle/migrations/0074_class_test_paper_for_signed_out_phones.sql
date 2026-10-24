-- The phone class test (/exam/:code) is taken signed out, so since 0058 locked `questions` (and 0068
-- locked class_test_answers) its runner could no longer load the paper, the student's own answers or the
-- answer key: students saw a spinner. These hand a joined student exactly what the runner used to read,
-- keyed by the participant id that class_test_join returns.

-- The paper, without answers, once the teacher has started the test.
CREATE OR REPLACE FUNCTION public.class_test_paper(p_participant_id uuid)
RETURNS TABLE (id uuid, question_text text, question_image_url text, question_image_url_2 text, figure_svg text,
  figure_description text, multiple_choice_options jsonb, choice_images jsonb, question_type text, passage_text text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.question_text, q.question_image_url, q.question_image_url_2, q.figure_svg, q.figure_description,
         q.multiple_choice_options, q.choice_images, q.question_type, q.passage_text
  FROM public.class_test_participants p
  JOIN public.class_tests t ON t.id = p.test_id AND t.status IN ('active', 'finished')
  JOIN public.questions q ON q.id IN (SELECT jsonb_array_elements_text(t.question_ids)::uuid)
  WHERE p.id = p_participant_id
$$;

-- The student's own answers and the answer key, once their paper is in or the teacher has ended the test.
CREATE OR REPLACE FUNCTION public.class_test_my_review(p_participant_id uuid)
RETURNS TABLE (question_id uuid, selected_answer text, answer text, alternate_answers text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, a.selected_answer, q.answer, q.alternate_answers
  FROM public.class_test_participants p
  JOIN public.class_tests t ON t.id = p.test_id
  JOIN public.questions q ON q.id IN (SELECT jsonb_array_elements_text(t.question_ids)::uuid)
  LEFT JOIN public.class_test_answers a ON a.participant_id = p.id AND a.question_id = q.id
  WHERE p.id = p_participant_id AND (p.submitted_at IS NOT NULL OR t.status = 'finished')
$$;

REVOKE ALL ON FUNCTION public.class_test_paper(uuid), public.class_test_my_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_test_paper(uuid), public.class_test_my_review(uuid) TO anon, authenticated;
