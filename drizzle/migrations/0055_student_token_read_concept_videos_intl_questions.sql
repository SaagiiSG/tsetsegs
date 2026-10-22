-- Students sign in with a server-issued student token (x-student-token header), so their
-- requests run as the anon role. Give anon SELECT back, gated on a valid student token.
-- request_student_id() is wrapped in a subselect so it is evaluated once per query.
GRANT SELECT ON public.concept_videos TO anon;
GRANT SELECT ON public.intl_questions TO anon;

CREATE POLICY "Students view published concept videos" ON public.concept_videos FOR SELECT TO anon
  USING (is_published AND (SELECT public.request_student_id()) IS NOT NULL);

CREATE POLICY "Students view active intl questions" ON public.intl_questions FOR SELECT TO anon
  USING (is_active AND (SELECT public.request_student_id()) IS NOT NULL);