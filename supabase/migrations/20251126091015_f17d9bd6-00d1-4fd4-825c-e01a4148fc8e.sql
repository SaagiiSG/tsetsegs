-- Add course_type enum and column to batches table
CREATE TYPE course_type AS ENUM ('SAT', 'IELTS');

ALTER TABLE public.batches 
ADD COLUMN course_type course_type NOT NULL DEFAULT 'SAT';

-- Create index for filtering by course type
CREATE INDEX idx_batches_course_type ON public.batches(course_type);