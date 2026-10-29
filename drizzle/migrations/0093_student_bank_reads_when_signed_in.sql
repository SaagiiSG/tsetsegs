-- Fixes 0088 (29 Oct: Tsetsegs students saw an empty question bank). A Tsetsegs student whose browser also
-- holds a Supabase session (left from a Google link or a Google password reset; student logout doesn't clear it)
-- sends the student token as the authenticated role. 0055/0058 gave the token reads to anon only, and 0088
-- took away the any-signed-in read that covered them. A valid student token is the check either way, the same
-- as student_progress in 0085; centers and solo accounts have no student token, so they still read nothing here.
DROP POLICY IF EXISTS "Students view active questions" ON public.questions;
CREATE POLICY "Students view active questions" ON public.questions FOR SELECT TO anon, authenticated
  USING (is_active AND (SELECT public.request_student_id()) IS NOT NULL);

DROP POLICY IF EXISTS "Students view active intl questions" ON public.intl_questions;
CREATE POLICY "Students view active intl questions" ON public.intl_questions FOR SELECT TO anon, authenticated
  USING (is_active AND (SELECT public.request_student_id()) IS NOT NULL);

NOTIFY pgrst, 'reload schema';
