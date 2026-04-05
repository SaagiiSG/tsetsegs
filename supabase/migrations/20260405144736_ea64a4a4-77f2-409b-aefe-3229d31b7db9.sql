
-- Fix student_attempts: change INSERT and SELECT from authenticated to public (students use custom auth, not Supabase Auth)
DROP POLICY IF EXISTS "Authenticated can insert attempts" ON public.student_attempts;
DROP POLICY IF EXISTS "Authenticated can read attempts" ON public.student_attempts;

CREATE POLICY "Public can insert attempts" ON public.student_attempts
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can read attempts" ON public.student_attempts
  FOR SELECT TO public USING (true);

-- Also add UPDATE policy for retry attempts
CREATE POLICY "Public can update attempts" ON public.student_attempts
  FOR UPDATE TO public USING (true);
