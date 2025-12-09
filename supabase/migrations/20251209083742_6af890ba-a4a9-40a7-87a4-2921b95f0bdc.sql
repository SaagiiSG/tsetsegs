-- Drop the existing math_level check constraint if exists
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_math_level_check;

-- Add new check constraint that allows NULL for IELTS students
ALTER TABLE public.students ADD CONSTRAINT students_math_level_check 
CHECK (math_level IS NULL OR math_level IN ('bad', 'average', 'good'));