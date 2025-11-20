-- Fix RLS policies for attendance table to avoid direct auth.users access
DROP POLICY IF EXISTS "Teachers can view attendance for their batches" ON attendance;
DROP POLICY IF EXISTS "Teachers can insert attendance for their batches" ON attendance;
DROP POLICY IF EXISTS "Teachers can update attendance for their batches" ON attendance;

-- Recreate policies using the security definer function
CREATE POLICY "Teachers can view attendance for their batches"
ON attendance
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = attendance.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert attendance for their batches"
ON attendance
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = attendance.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update attendance for their batches"
ON attendance
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = attendance.batch_id
    AND t.username = get_current_teacher_username()
  )
);

-- Fix RLS policies for students table
DROP POLICY IF EXISTS "Teachers can view students in their batches" ON students;
DROP POLICY IF EXISTS "Teachers can insert students in their batches" ON students;
DROP POLICY IF EXISTS "Teachers can update students in their batches" ON students;

CREATE POLICY "Teachers can view students in their batches"
ON students
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = students.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert students in their batches"
ON students
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = students.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update students in their batches"
ON students
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = students.batch_id
    AND t.username = get_current_teacher_username()
  )
);