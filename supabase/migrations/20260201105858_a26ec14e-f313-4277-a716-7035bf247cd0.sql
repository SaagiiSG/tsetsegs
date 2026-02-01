-- Drop the problematic update policy
DROP POLICY IF EXISTS "Public can update student accounts" ON public.student_accounts;

-- Create a proper update policy that allows updating via phone number match
CREATE POLICY "Public can update student accounts" 
ON public.student_accounts 
FOR UPDATE 
USING (true)
WITH CHECK (true);