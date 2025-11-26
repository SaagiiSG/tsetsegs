-- Update RLS policy for teachers to view batches with comma-separated teacher lists
DROP POLICY IF EXISTS "Teachers can view their own batches" ON public.batches;

CREATE POLICY "Teachers can view their own batches"
ON public.batches
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND (
    -- Match exact teacher name or as part of comma-separated list
    teacher ILIKE '%' || (
      SELECT name 
      FROM teachers 
      WHERE username = get_current_teacher_username()
    ) || '%'
  )
);