-- Add target_score column to student_accounts
ALTER TABLE public.student_accounts 
ADD COLUMN IF NOT EXISTS target_score integer DEFAULT NULL;

-- Add constraint to ensure target score is within valid SAT range
ALTER TABLE public.student_accounts 
ADD CONSTRAINT target_score_range CHECK (target_score IS NULL OR (target_score >= 400 AND target_score <= 1600));

-- Create student_nudges table for teacher nudge tracking
CREATE TABLE IF NOT EXISTS public.student_nudges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  nudge_type text NOT NULL,
  message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on student_nudges
ALTER TABLE public.student_nudges ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for nudges (teachers can manage nudges for their students)
CREATE POLICY "Teachers can view nudges for their batches"
  ON public.student_nudges
  FOR SELECT
  USING (true);

CREATE POLICY "Teachers can insert nudges"
  ON public.student_nudges
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_student_nudges_student_id ON public.student_nudges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_nudges_batch_id ON public.student_nudges(batch_id);
CREATE INDEX IF NOT EXISTS idx_student_accounts_target_score ON public.student_accounts(target_score) WHERE target_score IS NOT NULL;