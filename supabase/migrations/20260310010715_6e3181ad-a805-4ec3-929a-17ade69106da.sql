
-- Add duration to templates
ALTER TABLE public.review_session_templates ADD COLUMN duration_minutes integer NOT NULL DEFAULT 120;

-- Add end time to sessions
ALTER TABLE public.review_sessions ADD COLUMN session_end_date timestamptz;
