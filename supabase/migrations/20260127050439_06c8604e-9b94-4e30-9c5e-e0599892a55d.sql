-- Create vocabulary progress tracking table
CREATE TABLE public.student_vocabulary_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.vocabulary_words(id) ON DELETE CASCADE,
  learned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confidence_level INTEGER NOT NULL DEFAULT 1, -- 1-5 scale
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  review_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_account_id, word_id)
);

-- Enable RLS
ALTER TABLE public.student_vocabulary_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public can insert vocabulary progress"
ON public.student_vocabulary_progress
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can read vocabulary progress"
ON public.student_vocabulary_progress
FOR SELECT
USING (true);

CREATE POLICY "Public can update vocabulary progress"
ON public.student_vocabulary_progress
FOR UPDATE
USING (true);

CREATE POLICY "Admins can manage vocabulary progress"
ON public.student_vocabulary_progress
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_student_vocabulary_progress_student ON public.student_vocabulary_progress(student_account_id);
CREATE INDEX idx_student_vocabulary_progress_word ON public.student_vocabulary_progress(word_id);