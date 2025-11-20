-- First, drop the total_attended column to remove dependency
ALTER TABLE public.attendance DROP COLUMN IF EXISTS total_attended;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;

-- Create enum for attendance status (skip if already exists)
DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'sick', 'late');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Drop and recreate session columns with new type
ALTER TABLE public.attendance 
  DROP COLUMN IF EXISTS session_1 CASCADE,
  DROP COLUMN IF EXISTS session_2 CASCADE,
  DROP COLUMN IF EXISTS session_3 CASCADE,
  DROP COLUMN IF EXISTS session_4 CASCADE,
  DROP COLUMN IF EXISTS session_5 CASCADE,
  DROP COLUMN IF EXISTS session_6 CASCADE,
  DROP COLUMN IF EXISTS session_7 CASCADE,
  DROP COLUMN IF EXISTS session_8 CASCADE,
  DROP COLUMN IF EXISTS session_9 CASCADE,
  DROP COLUMN IF EXISTS session_10 CASCADE,
  DROP COLUMN IF EXISTS session_11 CASCADE,
  DROP COLUMN IF EXISTS session_12 CASCADE,
  DROP COLUMN IF EXISTS session_13 CASCADE,
  DROP COLUMN IF EXISTS session_14 CASCADE,
  DROP COLUMN IF EXISTS session_15 CASCADE;

-- Add new columns with enum type
ALTER TABLE public.attendance
  ADD COLUMN session_1 attendance_status,
  ADD COLUMN session_2 attendance_status,
  ADD COLUMN session_3 attendance_status,
  ADD COLUMN session_4 attendance_status,
  ADD COLUMN session_5 attendance_status,
  ADD COLUMN session_6 attendance_status,
  ADD COLUMN session_7 attendance_status,
  ADD COLUMN session_8 attendance_status,
  ADD COLUMN session_9 attendance_status,
  ADD COLUMN session_10 attendance_status,
  ADD COLUMN session_11 attendance_status,
  ADD COLUMN session_12 attendance_status,
  ADD COLUMN session_13 attendance_status,
  ADD COLUMN session_14 attendance_status,
  ADD COLUMN session_15 attendance_status;

-- Re-add total_attended column
ALTER TABLE public.attendance ADD COLUMN total_attended integer DEFAULT 0;

-- Create function to calculate attendance
CREATE OR REPLACE FUNCTION public.calculate_total_attended()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_attended := (
    SELECT COUNT(*)
    FROM (VALUES
      (NEW.session_1), (NEW.session_2), (NEW.session_3), (NEW.session_4), (NEW.session_5),
      (NEW.session_6), (NEW.session_7), (NEW.session_8), (NEW.session_9), (NEW.session_10),
      (NEW.session_11), (NEW.session_12), (NEW.session_13), (NEW.session_14), (NEW.session_15)
    ) AS t(status)
    WHERE status IN ('present', 'late')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate total_attended
CREATE TRIGGER calculate_total_attended_trigger
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.calculate_total_attended();

-- Recreate the updated_at trigger
CREATE TRIGGER update_attendance_updated_at
BEFORE UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.update_attendance_updated_at();