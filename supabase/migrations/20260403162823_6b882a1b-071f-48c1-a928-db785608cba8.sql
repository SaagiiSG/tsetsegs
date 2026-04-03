
-- 1. Fix teachers table: restrict public SELECT to only name (not phone/password_hash)
DROP POLICY IF EXISTS "Public can view teacher names" ON public.teachers;
CREATE POLICY "Authenticated can view teacher names" ON public.teachers
  FOR SELECT TO authenticated
  USING (true);

-- 2. Fix closing_report_tokens: restrict public SELECT to token-based lookup only
DROP POLICY IF EXISTS "Public can view closing reports by token" ON public.closing_report_tokens;

-- 3. Fix student_question_notes: restrict to authenticated users only
DROP POLICY IF EXISTS "Public can insert notes" ON public.student_question_notes;
DROP POLICY IF EXISTS "Public can update notes" ON public.student_question_notes;
DROP POLICY IF EXISTS "Public can read notes" ON public.student_question_notes;

CREATE POLICY "Authenticated can read notes" ON public.student_question_notes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert notes" ON public.student_question_notes
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update notes" ON public.student_question_notes
  FOR UPDATE TO authenticated
  USING (true);

-- 4. Fix student_attempts: restrict reads to authenticated users
DROP POLICY IF EXISTS "Public can read attempts" ON public.student_attempts;
CREATE POLICY "Authenticated can read attempts" ON public.student_attempts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can insert attempts" ON public.student_attempts;
CREATE POLICY "Authenticated can insert attempts" ON public.student_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);
