-- Step 2 of 2: apply only after the app that uses 0135's lookups (applied through Lovable's 0136) is published, or the leaderboard, friends,
-- challenges and profile cards lose every other student's name for anyone still on the old app.
-- Closes the phone-number leak: a signed-in main student now reads only their own account and their own roster
-- rows (the same match "Students update own roster rows" uses). Staff keep reading everything. TO anon,
-- authenticated: a main student with a leftover Supabase session sends the token as authenticated (0093).
-- Edge functions use the service role and every database function on these tables is SECURITY DEFINER, so
-- neither is affected. Safe to run twice.
SET lock_timeout = '3s';

DROP POLICY IF EXISTS "Signed-in students and staff read accounts" ON public.student_accounts;
DROP POLICY IF EXISTS "Students read own account, staff read all" ON public.student_accounts;
CREATE POLICY "Students read own account, staff read all" ON public.student_accounts FOR SELECT TO anon, authenticated
  USING (id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));

DROP POLICY IF EXISTS "Signed-in students and staff read roster" ON public.students;
DROP POLICY IF EXISTS "Students read own roster rows, staff read all" ON public.students;
CREATE POLICY "Students read own roster rows, staff read all" ON public.students FOR SELECT TO anon, authenticated
  USING ((SELECT public.is_platform_staff()) OR EXISTS (SELECT 1 FROM public.student_accounts a
    WHERE a.id = (SELECT public.request_student_id())
      AND (a.linked_student_id = students.id OR students.phone IN (a.phone_number, replace(a.phone_number, '-', '')))));

NOTIFY pgrst, 'reload schema';
