DROP FUNCTION IF EXISTS public.proctor_paper(uuid);
CREATE OR REPLACE FUNCTION public.proctor_paper(p_participant_id uuid)
 RETURNS TABLE(module_id uuid, module_number integer, section text, time_limit_minutes integer, order_index integer, question_id uuid, question_text text, question_image_url text, question_image_url_2 text, passage_text text, question_type text, multiple_choice_options jsonb, choice_images jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT bm.id, bm.module_number, bm.section, bm.time_limit_minutes, bmq.order_index,
         q.id, q.question_text, q.question_image_url, q.question_image_url_2, q.passage_text, q.question_type,
         to_jsonb(q.multiple_choice_options), to_jsonb(q.choice_images)
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  JOIN public.bluebook_modules bm ON bm.test_id = ps.test_id
  JOIN public.bluebook_module_questions bmq ON bmq.module_id = bm.id
  JOIN public.questions q ON q.id = bmq.question_id
  WHERE pp.id = p_participant_id
    AND pp.oath_accepted_at IS NOT NULL
  ORDER BY bm.module_number, bmq.order_index;
$function$;
REVOKE ALL ON FUNCTION public.proctor_paper(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proctor_paper(uuid) TO anon, authenticated, service_role;