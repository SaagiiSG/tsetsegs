-- Create function to get batch completion status based on session_24 attendance
CREATE OR REPLACE FUNCTION public.get_batch_completion_status(teacher_name text DEFAULT NULL::text)
RETURNS TABLE(batch_id uuid, is_completed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    b.id as batch_id,
    -- A batch is completed if ANY student has session_24 marked (not null)
    COALESCE(bool_or(a.session_24 IS NOT NULL), false) as is_completed
  FROM public.batches b
  LEFT JOIN public.attendance a ON a.batch_id = b.id
  WHERE 
    CASE 
      WHEN teacher_name IS NOT NULL 
      THEN b.teacher ILIKE '%' || teacher_name || '%'
      ELSE true
    END
  GROUP BY b.id;
$$;