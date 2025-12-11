-- Add columns for CollegeBoard question metadata
ALTER TABLE public.questions 
ADD COLUMN IF NOT EXISTS question_set TEXT DEFAULT '68' CHECK (question_set IN ('68', 'CollegeBoard', 'English')),
ADD COLUMN IF NOT EXISTS original_cb_id TEXT,
ADD COLUMN IF NOT EXISTS subtopic TEXT,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
ADD COLUMN IF NOT EXISTS rationale TEXT;

-- Create index for filtering by question set
CREATE INDEX IF NOT EXISTS idx_questions_question_set ON public.questions(question_set);

-- Create index for filtering by subtopic
CREATE INDEX IF NOT EXISTS idx_questions_subtopic ON public.questions(subtopic);