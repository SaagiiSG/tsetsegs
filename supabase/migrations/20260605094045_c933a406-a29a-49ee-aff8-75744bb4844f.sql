CREATE OR REPLACE FUNCTION public.get_student_performance_stats(_student_account_id uuid)
RETURNS TABLE (
  total_attempts bigint,
  correct_attempts bigint,
  first_attempts bigint,
  first_correct bigint,
  distinct_solved bigint,
  avg_time_seconds numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS total_attempts,
    COUNT(*) FILTER (WHERE is_correct)::bigint AS correct_attempts,
    COUNT(*) FILTER (WHERE attempt_number = 1)::bigint AS first_attempts,
    COUNT(*) FILTER (WHERE attempt_number = 1 AND is_correct)::bigint AS first_correct,
    COUNT(DISTINCT question_id) FILTER (WHERE is_correct)::bigint AS distinct_solved,
    COALESCE(AVG(time_spent_seconds), 0)::numeric AS avg_time_seconds
  FROM public.student_attempts
  WHERE student_account_id = _student_account_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_performance_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_student_performance_stats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_performance_stats(uuid) TO service_role;