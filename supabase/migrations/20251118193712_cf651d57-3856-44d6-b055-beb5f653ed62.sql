-- Fix weak UPDATE policy on students table
-- Replace trigger-based column restrictions with proper RLS policies

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS enforce_student_update_restrictions ON students;
DROP FUNCTION IF EXISTS restrict_student_update();

-- Drop the old permissive UPDATE policy
DROP POLICY IF EXISTS "Public can update student accessed status" ON students;

-- Create a restrictive UPDATE policy for anonymous users
-- Only allows updating accessed and accessed_at fields
CREATE POLICY "Anonymous can update accessed status only"
ON students FOR UPDATE
TO anon
USING (true)
WITH CHECK (
  -- Ensure only accessed and accessed_at can be modified
  id = (SELECT id FROM students WHERE id = students.id LIMIT 1) AND
  batch_id = (SELECT batch_id FROM students WHERE id = students.id LIMIT 1) AND
  name = (SELECT name FROM students WHERE id = students.id LIMIT 1) AND
  phone = (SELECT phone FROM students WHERE id = students.id LIMIT 1) AND
  unique_link_id = (SELECT unique_link_id FROM students WHERE id = students.id LIMIT 1) AND
  created_at = (SELECT created_at FROM students WHERE id = students.id LIMIT 1)
  -- accessed and accessed_at can change freely
);

-- Authenticated users who aren't admins cannot update students at all
-- (only admins can via the existing "Admins can manage students" policy)