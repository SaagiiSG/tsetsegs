-- Add 9 more session columns to attendance table for IELTS (total 24 sessions)
ALTER TABLE public.attendance
  ADD COLUMN session_16 attendance_status,
  ADD COLUMN session_17 attendance_status,
  ADD COLUMN session_18 attendance_status,
  ADD COLUMN session_19 attendance_status,
  ADD COLUMN session_20 attendance_status,
  ADD COLUMN session_21 attendance_status,
  ADD COLUMN session_22 attendance_status,
  ADD COLUMN session_23 attendance_status,
  ADD COLUMN session_24 attendance_status;

-- Add skill breakdown columns to practice_tests for IELTS
ALTER TABLE public.practice_tests
  ADD COLUMN listening numeric(2,1) CHECK (listening >= 0 AND listening <= 9),
  ADD COLUMN reading numeric(2,1) CHECK (reading >= 0 AND reading <= 9),
  ADD COLUMN writing numeric(2,1) CHECK (writing >= 0 AND writing <= 9),
  ADD COLUMN speaking numeric(2,1) CHECK (speaking >= 0 AND speaking <= 9);

-- Update the calculate_total_attended trigger function to handle all 24 sessions
CREATE OR REPLACE FUNCTION public.calculate_total_attended()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.total_attended := (
    SELECT COUNT(*)
    FROM (VALUES
      (NEW.session_1), (NEW.session_2), (NEW.session_3), (NEW.session_4), (NEW.session_5),
      (NEW.session_6), (NEW.session_7), (NEW.session_8), (NEW.session_9), (NEW.session_10),
      (NEW.session_11), (NEW.session_12), (NEW.session_13), (NEW.session_14), (NEW.session_15),
      (NEW.session_16), (NEW.session_17), (NEW.session_18), (NEW.session_19), (NEW.session_20),
      (NEW.session_21), (NEW.session_22), (NEW.session_23), (NEW.session_24)
    ) AS t(status)
    WHERE status IN ('present', 'late')
  );
  RETURN NEW;
END;
$function$;

COMMENT ON COLUMN public.practice_tests.listening IS 'IELTS Listening band score (0-9, 0.5 increments)';
COMMENT ON COLUMN public.practice_tests.reading IS 'IELTS Reading band score (0-9, 0.5 increments)';
COMMENT ON COLUMN public.practice_tests.writing IS 'IELTS Writing band score (0-9, 0.5 increments)';
COMMENT ON COLUMN public.practice_tests.speaking IS 'IELTS Speaking band score (0-9, 0.5 increments)';