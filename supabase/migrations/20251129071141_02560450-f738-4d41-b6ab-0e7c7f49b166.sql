-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_batches_start_date ON public.batches(start_date);
CREATE INDEX IF NOT EXISTS idx_batches_teacher ON public.batches(teacher);
CREATE INDEX IF NOT EXISTS idx_students_batch_id ON public.students(batch_id);

-- Create RPC function to get student counts per batch
CREATE OR REPLACE FUNCTION public.get_batch_student_counts(teacher_name text DEFAULT NULL)
RETURNS TABLE(batch_id uuid, student_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    s.batch_id,
    COUNT(s.id) as student_count
  FROM public.students s
  INNER JOIN public.batches b ON b.id = s.batch_id
  WHERE 
    CASE 
      WHEN teacher_name IS NOT NULL 
      THEN b.teacher ILIKE '%' || teacher_name || '%'
      ELSE true
    END
  GROUP BY s.batch_id;
$$;