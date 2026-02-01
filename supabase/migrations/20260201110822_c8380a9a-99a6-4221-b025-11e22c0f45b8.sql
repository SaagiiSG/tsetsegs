-- Drop existing restrictive INSERT policy on student_sessions
DROP POLICY IF EXISTS "Students can create own sessions" ON public.student_sessions;

-- Create permissive INSERT policy for student_sessions
-- This allows the auth flow to create sessions when students set passwords or login
CREATE POLICY "Allow session creation" 
ON public.student_sessions 
FOR INSERT 
WITH CHECK (true);

-- Also ensure SELECT policy exists
DROP POLICY IF EXISTS "Students can read own sessions" ON public.student_sessions;
CREATE POLICY "Allow session read" 
ON public.student_sessions 
FOR SELECT 
USING (true);

-- And UPDATE policy for deactivating sessions
DROP POLICY IF EXISTS "Students can update own sessions" ON public.student_sessions;
CREATE POLICY "Allow session update" 
ON public.student_sessions 
FOR UPDATE 
USING (true);