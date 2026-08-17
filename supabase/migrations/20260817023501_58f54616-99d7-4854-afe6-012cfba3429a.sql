ALTER TABLE public.intense_prep_tracking
  ADD COLUMN IF NOT EXISTS prep_attendance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS manual_solved jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS note_checks boolean[] NOT NULL DEFAULT ARRAY[false,false,false,false,false];

UPDATE public.intense_prep_tracking
SET note_checks = ARRAY[true,false,false,false,false]
WHERE prep_session_notes = 1
  AND note_checks = ARRAY[false,false,false,false,false];