
-- Step 2 of 2: apply only after the app that uses 0040's lookups is published,
-- or sign-in and registration break for anyone still on the old app.

-- ============ Reads: signed-in students and staff only ============
-- Before this, anyone with the public key could list the whole roster (names, schools,
-- student and parent phones). The x-student-phone / x-unique-link-id rule is dropped
-- too: the app no longer sends those headers, and anyone could fake them.
DROP POLICY IF EXISTS "Allow phone lookup for login" ON public.students;
DROP POLICY IF EXISTS "Students can view their own record" ON public.students;
DROP POLICY IF EXISTS "Signed-in students and staff read roster" ON public.students;
CREATE POLICY "Signed-in students and staff read roster" ON public.students FOR SELECT
  USING ((SELECT public.request_student_id()) IS NOT NULL OR (SELECT public.is_platform_staff()));

-- ============ Edits: staff, or a student changing their own SAT month ============
-- Before this, anyone could edit any student who had an account (names, batch,
-- fee_paid_at, which also texts the parent).
DROP POLICY IF EXISTS "Students can update their own linked record" ON public.students;
DROP POLICY IF EXISTS "Students update own roster rows" ON public.students;
CREATE POLICY "Students update own roster rows" ON public.students FOR UPDATE TO anon
  USING (EXISTS (SELECT 1 FROM public.student_accounts a
    WHERE a.id = (SELECT public.request_student_id())
      AND (a.linked_student_id = students.id OR students.phone IN (a.phone_number, replace(a.phone_number, '-', '')))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.student_accounts a
    WHERE a.id = (SELECT public.request_student_id())
      AND (a.linked_student_id = students.id OR students.phone IN (a.phone_number, replace(a.phone_number, '-', '')))));
DROP POLICY IF EXISTS "Staff update roster" ON public.students;
CREATE POLICY "Staff update roster" ON public.students FOR UPDATE TO authenticated
  USING ((SELECT public.is_platform_staff())) WITH CHECK ((SELECT public.is_platform_staff()));

-- Students (the anon role with a session token) may only change sat_test_month.
REVOKE UPDATE ON public.students FROM anon;
GRANT UPDATE (sat_test_month) ON public.students TO anon;
