CREATE OR REPLACE FUNCTION public.class_test_finalize(p_test_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  FOR r IN
    SELECT p.id, p.draft_answers, p.draft_flags, p.draft_times, p.focus_violations
    FROM public.class_test_participants p
    WHERE p.test_id = p_test_id
      AND p.submitted_at IS NULL
      AND p.draft_answers IS NOT NULL
      AND p.draft_answers <> '{}'::jsonb
  LOOP
    PERFORM public.class_test_submit(
      r.id, r.draft_answers, COALESCE(r.draft_flags, '{}'::jsonb),
      COALESCE(r.draft_times, '{}'::jsonb), COALESCE(r.focus_violations, 0)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.class_test_finalize(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.class_test_finalize(uuid) TO authenticated;