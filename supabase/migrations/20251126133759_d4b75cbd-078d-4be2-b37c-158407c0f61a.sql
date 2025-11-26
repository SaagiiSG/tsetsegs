-- Update all RLS policies that join batches table to support comma-separated teacher lists

-- Update attendance policies
DROP POLICY IF EXISTS "Teachers can view attendance for their batches" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can insert attendance for their batches" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can update attendance for their batches" ON public.attendance;

CREATE POLICY "Teachers can view attendance for their batches"
ON public.attendance
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = attendance.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert attendance for their batches"
ON public.attendance
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = attendance.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update attendance for their batches"
ON public.attendance
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = attendance.batch_id
      AND t.username = get_current_teacher_username()
  )
);

-- Update homework policies
DROP POLICY IF EXISTS "Teachers can view homework for their batches" ON public.homework;
DROP POLICY IF EXISTS "Teachers can insert homework for their batches" ON public.homework;
DROP POLICY IF EXISTS "Teachers can update homework for their batches" ON public.homework;

CREATE POLICY "Teachers can view homework for their batches"
ON public.homework
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = homework.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert homework for their batches"
ON public.homework
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = homework.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update homework for their batches"
ON public.homework
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = homework.batch_id
      AND t.username = get_current_teacher_username()
  )
);

-- Update practice_tests policies
DROP POLICY IF EXISTS "Teachers can view practice tests for their batches" ON public.practice_tests;
DROP POLICY IF EXISTS "Teachers can insert practice tests for their batches" ON public.practice_tests;
DROP POLICY IF EXISTS "Teachers can update practice tests for their batches" ON public.practice_tests;

CREATE POLICY "Teachers can view practice tests for their batches"
ON public.practice_tests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = practice_tests.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert practice tests for their batches"
ON public.practice_tests
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = practice_tests.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update practice tests for their batches"
ON public.practice_tests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = practice_tests.batch_id
      AND t.username = get_current_teacher_username()
  )
);

-- Update students policies
DROP POLICY IF EXISTS "Teachers can view students in their batches" ON public.students;
DROP POLICY IF EXISTS "Teachers can insert students in their batches" ON public.students;
DROP POLICY IF EXISTS "Teachers can update students in their batches" ON public.students;

CREATE POLICY "Teachers can view students in their batches"
ON public.students
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = students.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert students in their batches"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = students.batch_id
      AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update students in their batches"
ON public.students
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM batches b
    JOIN teachers t ON (b.teacher ILIKE '%' || t.name || '%')
    WHERE b.id = students.batch_id
      AND t.username = get_current_teacher_username()
  )
);