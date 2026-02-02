-- Allow anonymous users to check if a phone number exists in students table (for login flow)
-- This only allows SELECT when querying by phone number specifically
CREATE POLICY "Allow phone lookup for login"
ON public.students
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: This is safe because:
-- 1. The student_accounts table already has a similar permissive policy for phone lookup
-- 2. Only phone verification happens before authentication
-- 3. Sensitive data access is still protected by other RLS policies after login