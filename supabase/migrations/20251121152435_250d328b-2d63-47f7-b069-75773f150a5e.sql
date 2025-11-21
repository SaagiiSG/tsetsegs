-- Create the update_updated_at_column function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add firstName and lastName columns to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Migrate existing name data to firstName (temporary, will be manually updated by admin)
UPDATE public.students SET first_name = name WHERE first_name IS NULL;

-- Make first_name required after migration
ALTER TABLE public.students ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE public.students ALTER COLUMN first_name SET DEFAULT '';
ALTER TABLE public.students ALTER COLUMN last_name SET DEFAULT '';

-- Create homework tracking table
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL CHECK (session_number >= 1 AND session_number <= 15),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, session_number)
);

-- Create practice tests table
CREATE TABLE IF NOT EXISTS public.practice_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  test_number INTEGER NOT NULL CHECK (test_number >= 1 AND test_number <= 6),
  score INTEGER CHECK (score IS NULL OR (score >= 0 AND score <= 800)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, test_number)
);

-- Enable RLS on homework table
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- Homework RLS policies
CREATE POLICY "Admins can manage all homework"
ON public.homework
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view homework for their batches"
ON public.homework
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role) 
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = homework.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert homework for their batches"
ON public.homework
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = homework.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update homework for their batches"
ON public.homework
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = homework.batch_id
    AND t.username = get_current_teacher_username()
  )
);

-- Enable RLS on practice_tests table
ALTER TABLE public.practice_tests ENABLE ROW LEVEL SECURITY;

-- Practice tests RLS policies
CREATE POLICY "Admins can manage all practice tests"
ON public.practice_tests
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view practice tests for their batches"
ON public.practice_tests
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = practice_tests.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert practice tests for their batches"
ON public.practice_tests
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = practice_tests.batch_id
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update practice tests for their batches"
ON public.practice_tests
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
  AND EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher = t.name
    WHERE b.id = practice_tests.batch_id
    AND t.username = get_current_teacher_username()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_homework_student_id ON public.homework(student_id);
CREATE INDEX IF NOT EXISTS idx_homework_batch_id ON public.homework(batch_id);
CREATE INDEX IF NOT EXISTS idx_practice_tests_student_id ON public.practice_tests(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_tests_batch_id ON public.practice_tests(batch_id);

-- Create trigger to update updated_at on homework
DROP TRIGGER IF EXISTS update_homework_updated_at ON public.homework;
CREATE TRIGGER update_homework_updated_at
BEFORE UPDATE ON public.homework
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to update updated_at on practice_tests
DROP TRIGGER IF EXISTS update_practice_tests_updated_at ON public.practice_tests;
CREATE TRIGGER update_practice_tests_updated_at
BEFORE UPDATE ON public.practice_tests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();