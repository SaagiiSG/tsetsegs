-- Fix PUBLIC_DATA_EXPOSURE: students table
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Public read access to students" ON students;

-- Create restricted policy for students table
-- Admins can view all students
CREATE POLICY "Admins can view all students"
ON students FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can view students in their batches
CREATE POLICY "Teachers can view their batch students"
ON students FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND batch_id IN (
    SELECT b.id FROM batches b
    JOIN teachers t ON b.teacher ILIKE '%' || t.name || '%'
    WHERE t.username = get_current_teacher_username()
  )
);

-- Students can only view their own linked record
CREATE POLICY "Students can view their own record"
ON students FOR SELECT
TO anon, authenticated
USING (
  id IN (
    SELECT linked_student_id 
    FROM student_accounts 
    WHERE phone_number = current_setting('request.headers', true)::json->>'x-student-phone'
  )
  OR
  -- Allow access via unique_link_id for registration flow only
  unique_link_id = current_setting('request.headers', true)::json->>'x-unique-link-id'
);

-- Fix student_accounts_phone_exposure: Restrict public read access
DROP POLICY IF EXISTS "Public can read student accounts" ON student_accounts;

-- Students can only read their own account (by matching session)
CREATE POLICY "Students can read own account"
ON student_accounts FOR SELECT
TO anon, authenticated
USING (
  -- Allow via phone header for login flow
  phone_number = current_setting('request.headers', true)::json->>'x-student-phone'
  OR
  -- Admins can view all
  has_role(auth.uid(), 'admin'::app_role)
);

-- Fix student_sessions_device_tracking: Restrict public read
DROP POLICY IF EXISTS "Public can read sessions" ON student_sessions;

-- Students can only read their own sessions
CREATE POLICY "Students can read own sessions"
ON student_sessions FOR SELECT
TO anon, authenticated
USING (
  student_account_id IN (
    SELECT id FROM student_accounts
    WHERE phone_number = current_setting('request.headers', true)::json->>'x-student-phone'
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Restrict student_sessions updates to own sessions only
DROP POLICY IF EXISTS "Public can update sessions" ON student_sessions;

CREATE POLICY "Students can update own sessions"
ON student_sessions FOR UPDATE
TO anon, authenticated
USING (
  student_account_id IN (
    SELECT id FROM student_accounts
    WHERE phone_number = current_setting('request.headers', true)::json->>'x-student-phone'
  )
  OR
  has_role(auth.uid(), 'admin'::app_role)
);