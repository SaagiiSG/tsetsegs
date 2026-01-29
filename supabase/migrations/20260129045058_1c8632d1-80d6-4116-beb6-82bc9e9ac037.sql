-- Add unique constraint for upsert to work correctly
ALTER TABLE public.bluebook_answers 
ADD CONSTRAINT bluebook_answers_attempt_question_unique 
UNIQUE (attempt_id, question_id);