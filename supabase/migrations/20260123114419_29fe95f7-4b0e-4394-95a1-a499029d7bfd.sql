-- Allow unassigning students from a batch
ALTER TABLE public.students
  ALTER COLUMN batch_id DROP NOT NULL;

-- Update teacher update policy to allow setting batch_id to NULL (unassign)
DROP POLICY IF EXISTS "Teachers can update students in their batches" ON public.students;

CREATE POLICY "Teachers can update students in their batches"
ON public.students
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1
    FROM (public.batches b
      JOIN public.teachers t ON (b.teacher ~~* (('%'::text || t.name) || '%'::text)))
    WHERE (b.id = students.batch_id)
      AND (t.username = public.get_current_teacher_username())
  )
)
WITH CHECK (
  -- Allow unassign
  students.batch_id IS NULL
  OR EXISTS (
    -- Allow updates that keep/move the student into a batch owned by this teacher
    SELECT 1
    FROM (public.batches b
      JOIN public.teachers t ON (b.teacher ~~* (('%'::text || t.name) || '%'::text)))
    WHERE (b.id = students.batch_id)
      AND (t.username = public.get_current_teacher_username())
  )
);