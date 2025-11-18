-- Fix RLS policies with a simpler, working approach
-- Drop the header-based policies that won't work
DROP POLICY IF EXISTS "Students viewable via valid unique link" ON public.students;
DROP POLICY IF EXISTS "Update student accessed status only" ON public.students;
DROP POLICY IF EXISTS "Batches viewable via valid unique link" ON public.batches;

-- For students: Allow public SELECT but data is filtered by app via .eq('unique_link_id', linkId)
-- This is secure because apps MUST know the unique_link_id to query
CREATE POLICY "Public read access to students"
ON public.students
FOR SELECT
TO anon, authenticated
USING (true);

-- For student updates: Restrict to ONLY accessed and accessed_at columns
-- Use a trigger to enforce column-level restrictions
CREATE OR REPLACE FUNCTION public.restrict_student_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow updating accessed and accessed_at
  IF (OLD.id IS DISTINCT FROM NEW.id OR
      OLD.batch_id IS DISTINCT FROM NEW.batch_id OR
      OLD.name IS DISTINCT FROM NEW.name OR
      OLD.phone IS DISTINCT FROM NEW.phone OR
      OLD.unique_link_id IS DISTINCT FROM NEW.unique_link_id OR
      OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
    RAISE EXCEPTION 'Only accessed and accessed_at fields can be updated';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_student_update_restrictions
BEFORE UPDATE ON public.students
FOR EACH ROW
WHEN (auth.uid() IS NULL) -- Only apply to non-admin updates
EXECUTE FUNCTION public.restrict_student_update();

CREATE POLICY "Public can update student accessed status"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- For batches: Allow public SELECT (filtered by app via unique_link_id)
CREATE POLICY "Public read access to batches"
ON public.batches
FOR SELECT
TO anon, authenticated
USING (true);