-- Add grade and school_name columns to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS school_name text;