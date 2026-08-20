CREATE OR REPLACE FUNCTION public.proctor_my_history(p_student_account_id uuid, p_linked_student_id uuid)
RETURNS TABLE(
  participant_id uuid,
  session_id uuid,
  title text,
  review_mode text,
  submitted_at timestamptz,
  finished_at timestamptz,
  rw_correct integer,
  math_correct integer,
  rw_total integer,
  math_total integer,
  module_results jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_student_account_id IS NULL AND p_linked_student_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pp.id,
         ps.id,
         ps.title,
         ps.review_mode,
         pp.submitted_at,
         ps.finished_at,
         pp.rw_correct,
         pp.math_correct,
         pp.rw_total,
         pp.math_total,
         pp.module_results
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  WHERE (
          (p_student_account_id IS NOT NULL AND pp.student_account_id = p_student_account_id)
       OR (p_linked_student_id IS NOT NULL AND pp.linked_student_id = p_linked_student_id)
        )
    AND (pp.submitted_at IS NOT NULL OR ps.status = 'finished')
  ORDER BY COALESCE(pp.submitted_at, ps.finished_at, pp.created_at) DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.proctor_my_history(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proctor_my_history(uuid, uuid) TO anon, authenticated, service_role;