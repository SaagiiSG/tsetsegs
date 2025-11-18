-- Fix search_path for the trigger function
CREATE OR REPLACE FUNCTION public.restrict_student_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;