-- Add columns to students table for SAT experience tracking
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS has_taken_sat boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_sat_score integer;