-- Update function to check session_24 for IELTS and session_15 for SAT
CREATE OR REPLACE FUNCTION public.get_batch_completion_status(teacher_name text DEFAULT NULL::text)
RETURNS TABLE(batch_id uuid, is_completed boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    b.id as batch_id,
    -- For IELTS: check session_24, for SAT: check session_15
    COALESCE(bool_or(
      CASE 
        WHEN b.course_type = 'IELTS' THEN a.session_24 IS NOT NULL
        WHEN b.course_type = 'SAT' THEN a.session_15 IS NOT NULL
        ELSE a.session_24 IS NOT NULL -- fallback
      END
    ), false) as is_completed
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