
-- Add new columns for figure/visual data and skill classification
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS has_figure boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS figure_type text,
  ADD COLUMN IF NOT EXISTS figure_description text,
  ADD COLUMN IF NOT EXISTS figure_svg text,
  ADD COLUMN IF NOT EXISTS skill text;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS questions_skill_idx ON public.questions (skill);
CREATE INDEX IF NOT EXISTS questions_subject_idx ON public.questions (subject);
CREATE INDEX IF NOT EXISTS questions_question_set_idx ON public.questions (question_set);
CREATE INDEX IF NOT EXISTS questions_difficulty_idx ON public.questions (difficulty_level);
CREATE INDEX IF NOT EXISTS questions_category_id_idx ON public.questions (category_id);
CREATE INDEX IF NOT EXISTS questions_is_active_idx ON public.questions (is_active);
