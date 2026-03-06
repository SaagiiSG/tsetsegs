
-- Allow students (public/anon) to insert flags on questions
CREATE POLICY "Public can insert question flags"
  ON public.question_flags FOR INSERT
  WITH CHECK (true);

-- Allow students to read their own flags (to prevent duplicate flagging UI)
CREATE POLICY "Public can read own question flags"
  ON public.question_flags FOR SELECT
  USING (true);
