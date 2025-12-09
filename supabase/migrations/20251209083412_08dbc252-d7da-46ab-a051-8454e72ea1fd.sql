-- Drop the existing check constraint
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_english_level_check;

-- Add new check constraint that includes both SAT and IELTS levels
ALTER TABLE public.students ADD CONSTRAINT students_english_level_check 
CHECK (english_level IS NULL OR english_level IN ('bad', 'average', 'good', 'B1', 'B2', 'C1', 'C2'));