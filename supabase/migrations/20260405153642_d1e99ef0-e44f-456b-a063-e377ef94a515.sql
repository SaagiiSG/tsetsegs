
-- Fix 1: student_activity_logs needs public SELECT
CREATE POLICY "Public can read activity logs"
  ON public.student_activity_logs
  FOR SELECT TO public USING (true);

-- Fix 2: student_question_notes - change from authenticated to public
DROP POLICY IF EXISTS "Authenticated can insert notes" ON public.student_question_notes;
DROP POLICY IF EXISTS "Authenticated can read notes" ON public.student_question_notes;
DROP POLICY IF EXISTS "Authenticated can update notes" ON public.student_question_notes;

CREATE POLICY "Public can insert notes" ON public.student_question_notes
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can read notes" ON public.student_question_notes
  FOR SELECT TO public USING (true);

CREATE POLICY "Public can update notes" ON public.student_question_notes
  FOR UPDATE TO public USING (true);
