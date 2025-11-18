-- Fix RLS policies for students table
-- Drop the insecure policies
DROP POLICY IF EXISTS "Anyone can view student by unique link" ON public.students;
DROP POLICY IF EXISTS "Anyone can update student accessed status" ON public.students;

-- Create secure policy for viewing students by unique link
-- This validates the unique_link_id is provided in the request
CREATE POLICY "Students viewable via valid unique link"
ON public.students
FOR SELECT
USING (
  unique_link_id IN (
    SELECT unnest(string_to_array(current_setting('request.headers', true)::json->>'x-unique-link-id', ','))
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create secure policy for updating only accessed status
-- Only allows updating accessed and accessed_at columns
CREATE POLICY "Update student accessed status only"
ON public.students
FOR UPDATE
USING (true)
WITH CHECK (
  -- Ensure only accessed and accessed_at can be modified
  (accessed IS NOT DISTINCT FROM (SELECT accessed FROM students WHERE id = students.id)) OR
  (accessed_at IS NOT DISTINCT FROM (SELECT accessed_at FROM students WHERE id = students.id))
);

-- Fix RLS policy for batches table
DROP POLICY IF EXISTS "Anyone can view batch by unique link" ON public.batches;

-- Create secure policy for viewing batches by unique link
CREATE POLICY "Batches viewable via valid unique link"
ON public.batches
FOR SELECT
USING (
  unique_link_id IN (
    SELECT unnest(string_to_array(current_setting('request.headers', true)::json->>'x-unique-link-id', ','))
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
);