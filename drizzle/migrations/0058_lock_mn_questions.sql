-- The Mongolian question bank is paid content too. Staff sign in with Supabase auth and students with the
-- student token (anon role), so signed-out visitors get nothing. The two signed-out pages that used it get
-- only what they need through functions: the parent share page (categories) and the live class game (its questions).
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;
CREATE POLICY "Signed-in users view active questions" ON public.questions FOR SELECT TO authenticated
  USING (is_active = true);
CREATE POLICY "Students view active questions" ON public.questions FOR SELECT TO anon
  USING (is_active AND (SELECT public.request_student_id()) IS NOT NULL);

-- Same shape the share page read before: id, question_id and category name, no question content.
CREATE OR REPLACE FUNCTION public.shared_question_categories()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question_id', q.question_id,
    'category', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('name', c.name) END)), '[]'::jsonb)
  FROM questions q LEFT JOIN question_categories c ON c.id = q.category_id
  WHERE q.is_original AND q.is_active;
$$;
REVOKE ALL ON FUNCTION public.shared_question_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shared_question_categories() TO anon, authenticated;

-- Players join by code without signing in, so they get only the questions of that unfinished game.
CREATE OR REPLACE FUNCTION public.live_session_question_list(_join_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
    'multiple_choice_options', q.multiple_choice_options, 'answer', q.answer, 'order_index', lq.order_index)
    ORDER BY lq.order_index), '[]'::jsonb)
  FROM live_sessions s
  JOIN live_session_questions lq ON lq.session_id = s.id
  JOIN questions q ON q.id = lq.question_id
  WHERE s.join_code = upper(_join_code) AND s.status <> 'finished';
$$;
REVOKE ALL ON FUNCTION public.live_session_question_list(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_question_list(text) TO anon, authenticated;

-- Only admins upload, replace or delete question images. These were dropped in July (20260724113323);
-- repeated here so the rule holds whatever the live state is.
DROP POLICY IF EXISTS "Authenticated users can upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update question images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete question images" ON storage.objects;
