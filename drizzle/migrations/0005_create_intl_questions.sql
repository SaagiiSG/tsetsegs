CREATE TABLE public.intl_questions (LIKE public.questions INCLUDING ALL);
GRANT SELECT ON public.intl_questions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.intl_questions TO authenticated;
GRANT ALL ON public.intl_questions TO service_role;
ALTER TABLE public.intl_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage intl questions" ON public.intl_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view active intl questions" ON public.intl_questions FOR SELECT USING (is_active = true);
COMMENT ON TABLE public.intl_questions IS 'International question bank (intDB): used by international cohort and center portals; fed by external sync. Mongolian students use public.questions.';
INSERT INTO public.intl_questions SELECT * FROM public.questions;
ALTER TABLE public.tenant_attempts DROP CONSTRAINT tenant_attempts_question_id_fkey;
ALTER TABLE public.tenant_attempts ADD CONSTRAINT tenant_attempts_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.intl_questions(id) ON DELETE CASCADE;