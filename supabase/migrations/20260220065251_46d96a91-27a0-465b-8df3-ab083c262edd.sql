
CREATE TABLE public.student_question_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL,
  question_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_account_id, question_id)
);

ALTER TABLE public.student_question_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert notes" ON public.student_question_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update notes" ON public.student_question_notes FOR UPDATE USING (true);
CREATE POLICY "Public can read notes" ON public.student_question_notes FOR SELECT USING (true);
CREATE POLICY "Admins can manage notes" ON public.student_question_notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_student_question_notes_updated_at
BEFORE UPDATE ON public.student_question_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
