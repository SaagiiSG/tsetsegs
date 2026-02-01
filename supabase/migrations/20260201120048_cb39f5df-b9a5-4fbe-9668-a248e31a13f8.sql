-- Add alternate_answers column for fill-in-the-blank questions
ALTER TABLE public.questions 
ADD COLUMN alternate_answers text[] DEFAULT NULL;