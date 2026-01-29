-- Add subject column to vocabulary_words for Math/English separation
ALTER TABLE public.vocabulary_words 
ADD COLUMN subject text NOT NULL DEFAULT 'english';

-- Add index for efficient filtering
CREATE INDEX idx_vocabulary_words_subject ON public.vocabulary_words(subject);

-- Add comment for clarity
COMMENT ON COLUMN public.vocabulary_words.subject IS 'Subject type: english or math';