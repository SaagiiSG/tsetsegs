
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_ghost boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_accounts ADD COLUMN IF NOT EXISTS is_ghost boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_students_not_ghost ON public.students(id) WHERE is_ghost = false;
CREATE INDEX IF NOT EXISTS idx_student_accounts_not_ghost ON public.student_accounts(id) WHERE is_ghost = false;

-- Exclude ghosts from batch counts
CREATE OR REPLACE FUNCTION public.get_batch_student_counts(teacher_name text DEFAULT NULL::text)
 RETURNS TABLE(batch_id uuid, student_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.batch_id, COUNT(s.id) as student_count
  FROM public.students s
  INNER JOIN public.batches b ON b.id = s.batch_id
  WHERE s.is_ghost = false
    AND CASE WHEN teacher_name IS NOT NULL THEN b.teacher ILIKE '%' || teacher_name || '%' ELSE true END
  GROUP BY s.batch_id;
$function$;
