-- Student-facing paper fetch for a proctored session: never returns the answer key.
CREATE OR REPLACE FUNCTION public.proctor_paper(p_participant_id uuid)
RETURNS TABLE(
  module_id uuid,
  module_number integer,
  section text,
  time_limit_minutes integer,
  order_index integer,
  question_id uuid,
  question_text text,
  question_image_url text,
  passage_text text,
  question_type text,
  multiple_choice_options jsonb,
  choice_images jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bm.id, bm.module_number, bm.section, bm.time_limit_minutes, bmq.order_index,
         q.id, q.question_text, q.question_image_url, q.passage_text, q.question_type,
         to_jsonb(q.multiple_choice_options), to_jsonb(q.choice_images)
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  JOIN public.bluebook_modules bm ON bm.test_id = ps.test_id
  JOIN public.bluebook_module_questions bmq ON bmq.module_id = bm.id
  JOIN public.questions q ON q.id = bmq.question_id
  WHERE pp.id = p_participant_id
    AND pp.oath_accepted_at IS NOT NULL
  ORDER BY bm.module_number, bmq.order_index;
$$;

-- A student's own state + the live session state (for resume / polling).
CREATE OR REPLACE FUNCTION public.proctor_state(p_participant_id uuid)
RETURNS TABLE(
  display_name text,
  code_verified boolean,
  oath_accepted boolean,
  current_module integer,
  answers jsonb,
  focus_violations integer,
  submitted_at timestamp with time zone,
  session_status text,
  session_title text,
  session_current_module integer,
  module_started_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
         ps.module_started_at
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  WHERE pp.id = p_participant_id;
$$;

REVOKE ALL ON FUNCTION public.proctor_paper(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proctor_state(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proctor_paper(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.proctor_state(uuid) TO anon, authenticated;