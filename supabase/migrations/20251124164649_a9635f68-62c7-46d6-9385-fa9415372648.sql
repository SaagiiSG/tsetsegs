-- Add first session intake fields to students table
ALTER TABLE public.students 
ADD COLUMN parent_phone text,
ADD COLUMN math_level text CHECK (math_level IN ('bad', 'average', 'good')),
ADD COLUMN english_level text CHECK (english_level IN ('bad', 'average', 'good')),
ADD COLUMN first_session_completed boolean DEFAULT false;