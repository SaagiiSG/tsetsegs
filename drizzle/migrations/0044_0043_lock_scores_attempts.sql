-- Step 1 of 2: teacher edit limit, plus lookups the new app code uses.
-- Safe to apply before publishing. The read lock comes in a later file.

-- ============ Teachers edit only their own classes ============
-- 0041 let any teacher edit any student. Teachers fall back to
-- "Teachers can update students in their batches"; admins keep "Admins can manage students".
DROP POLICY IF EXISTS "Staff update roster" ON public.students;

-- ============ Is this roster row the signed-in student's? ============
CREATE OR REPLACE FUNCTION public.request_student_owns(_student_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.student_accounts a JOIN public.students s ON s.id = _student_id
    WHERE a.id = public.request_student_id()
      AND (a.linked_student_id = s.id OR s.phone IN (a.phone_number, replace(a.phone_number, '-', ''))));
$$;
GRANT EXECUTE ON FUNCTION public.request_student_owns(uuid) TO anon, authenticated;

-- ============ Shared profile page (/student/share/:token) ============
CREATE OR REPLACE FUNCTION public.shared_practice_tests(_token text)
RETURNS TABLE(test_number int, score int, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.test_number, p.score, p.created_at
  FROM public.student_accounts a
  JOIN public.students s ON s.id = a.linked_student_id
  JOIN public.practice_tests p ON p.student_id = s.id AND p.batch_id = s.batch_id
  WHERE _token IS NOT NULL AND a.share_token = _token
  ORDER BY p.test_number;
$$;
GRANT EXECUTE ON FUNCTION public.shared_practice_tests(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.shared_attempts(_token text)
RETURNS TABLE(question_id uuid, is_correct boolean, attempt_number int, attempted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.question_id, t.is_correct, t.attempt_number, t.attempted_at
  FROM public.student_accounts a JOIN public.student_attempts t ON t.student_account_id = a.id
  WHERE _token IS NOT NULL AND a.share_token = _token
  ORDER BY t.attempted_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.shared_attempts(text) TO anon, authenticated;

-- ============ Public closing report (/report/:token) ============
CREATE OR REPLACE FUNCTION public.report_practice_tests(_token text)
RETURNS TABLE(test_number int, score int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.test_number, p.score
  FROM public.closing_report_tokens r
  JOIN public.practice_tests p ON p.student_id = r.student_id AND p.batch_id = r.batch_id
  WHERE r.token = _token AND r.expires_at > now()
  ORDER BY p.test_number;
$$;
GRANT EXECUTE ON FUNCTION public.report_practice_tests(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.report_attempt_count(_token text)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)
  FROM public.closing_report_tokens r
  JOIN public.student_accounts a ON a.linked_student_id = r.student_id
  JOIN public.student_attempts t ON t.student_account_id = a.id
  WHERE r.token = _token AND r.expires_at > now();
$$;
GRANT EXECUTE ON FUNCTION public.report_attempt_count(text) TO anon, authenticated;
