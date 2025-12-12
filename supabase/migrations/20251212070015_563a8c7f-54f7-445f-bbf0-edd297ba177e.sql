-- Add subject column to questions table to distinguish Math vs English
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS subject text DEFAULT 'math';

-- Add explanation column for student self-study (rationale already exists, but let's ensure it's used)
-- rationale column already exists, we'll use it for explanations

-- Add passage_text column for English reading passages
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS passage_text text;

-- Insert English skill categories
INSERT INTO public.question_categories (name) VALUES 
  ('Information and Ideas'),
  ('Craft and Structure'),
  ('Standard English Conventions'),
  ('Expression of Ideas')
ON CONFLICT (name) DO NOTHING;

-- Create index for subject filtering
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject);