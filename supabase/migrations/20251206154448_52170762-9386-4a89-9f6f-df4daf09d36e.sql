-- Create student_notes table for teacher notes on students
CREATE TABLE public.student_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all student notes"
ON public.student_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view notes for their batches"
ON public.student_notes
FOR SELECT
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher ILIKE '%' || t.name || '%'
    WHERE b.id = student_notes.batch_id 
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can insert notes for their batches"
ON public.student_notes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher ILIKE '%' || t.name || '%'
    WHERE b.id = student_notes.batch_id 
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can update notes for their batches"
ON public.student_notes
FOR UPDATE
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher ILIKE '%' || t.name || '%'
    WHERE b.id = student_notes.batch_id 
    AND t.username = get_current_teacher_username()
  )
);

CREATE POLICY "Teachers can delete notes for their batches"
ON public.student_notes
FOR DELETE
USING (
  has_role(auth.uid(), 'teacher'::app_role) AND 
  EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher ILIKE '%' || t.name || '%'
    WHERE b.id = student_notes.batch_id 
    AND t.username = get_current_teacher_username()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_student_notes_updated_at
BEFORE UPDATE ON public.student_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_student_notes_student_id ON public.student_notes(student_id);
CREATE INDEX idx_student_notes_batch_id ON public.student_notes(batch_id);