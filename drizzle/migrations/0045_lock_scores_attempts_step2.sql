
-- Step 2 of 2: apply only after the app that uses the step 1 lookups is published.

-- ============ Test scores: own scores for students, all for staff ============
-- Before this, anyone with the public key could read every student's mock test scores.
DROP POLICY IF EXISTS "Public can read practice tests" ON public.practice_tests;
DROP POLICY IF EXISTS "Students and staff read practice tests" ON public.practice_tests;
CREATE POLICY "Students and staff read practice tests" ON public.practice_tests FOR SELECT
  USING ((SELECT public.is_platform_staff())
    OR ((SELECT public.request_student_id()) IS NOT NULL AND public.request_student_owns(student_id)));

-- ============ Answer history: own answers for students, all for staff ============
DROP POLICY IF EXISTS "Public can read attempts" ON public.student_attempts;
DROP POLICY IF EXISTS "Students and staff read attempts" ON public.student_attempts;
CREATE POLICY "Students and staff read attempts" ON public.student_attempts FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
