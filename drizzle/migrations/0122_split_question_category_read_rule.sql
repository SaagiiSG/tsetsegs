-- Main students use the anon role with a student token; the center/demo checks are
-- signed-in-only functions, so they go in a separate rule for signed-in accounts.
DROP POLICY IF EXISTS "Students, staff and centers read question categories" ON public.question_categories;
CREATE POLICY "Students and staff read question categories" ON public.question_categories
  FOR SELECT TO anon, authenticated
  USING (((SELECT public.request_student_id()) IS NOT NULL) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Centers and demo accounts read question categories" ON public.question_categories
  FOR SELECT TO authenticated
  USING ((SELECT public.is_staff_or_center_member()) OR (SELECT public.is_demo_user()));
