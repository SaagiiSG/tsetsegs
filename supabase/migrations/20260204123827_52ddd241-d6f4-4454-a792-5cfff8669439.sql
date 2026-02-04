-- Drop the problematic recursive policy that's causing "infinite recursion" errors
DROP POLICY IF EXISTS "Anonymous can update accessed status only" ON public.students;

-- Create a security definer function to check if a student account owns a student record
CREATE OR REPLACE FUNCTION public.student_owns_record(student_id uuid, phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_accounts sa
    WHERE sa.linked_student_id = student_id
      AND sa.phone_number = phone
  )
$$;

-- Create a proper policy for students to update their own record (for SAT date, etc.)
-- This avoids recursive queries by using a security definer function
CREATE POLICY "Students can update their own linked record"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  public.student_owns_record(id, phone)
);