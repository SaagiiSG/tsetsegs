-- Who reads which bank (Saagii, 28 Oct): the Tsetsegs bank (questions) is for Tsetsegs staff and Tsetsegs
-- students; centers read only the International bank and the concept videos; the main app has no concept videos.
-- 0058 let every signed-in account read the Tsetsegs bank, assuming only staff sign in with Supabase. Center
-- accounts and solo sign-ups do too now, so a center student could read all of it, answers included.
-- Tsetsegs students use the student token (anon role); their Tsetsegs-bank and International-bank reads don't change.

-- Signed in as Tsetsegs staff, or as an active member (staff or student) of a center whose portal is open.
CREATE OR REPLACE FUNCTION public.is_staff_or_center_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_platform_staff() OR (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.institution_customers c
    WHERE c.portal_enabled AND c.access_blocked_at IS NULL AND (
      EXISTS (SELECT 1 FROM public.tenant_members m WHERE m.institution_id = c.id AND m.user_id = auth.uid() AND m.active)
      OR EXISTS (SELECT 1 FROM public.tenant_students s WHERE s.institution_id = c.id AND s.user_id = auth.uid() AND s.active))));
$$;
REVOKE ALL ON FUNCTION public.is_staff_or_center_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_or_center_member() TO authenticated;

-- Tsetsegs bank: Tsetsegs staff only among signed-in accounts (admins keep "Admins can manage questions").
DROP POLICY IF EXISTS "Anyone can view active questions" ON public.questions;
DROP POLICY IF EXISTS "Signed-in users view active questions" ON public.questions;
CREATE POLICY "Staff view active questions" ON public.questions FOR SELECT TO authenticated
  USING (is_active AND (SELECT public.is_platform_staff()));

-- International bank: Tsetsegs staff and centers. Solo accounts get nothing until there is a paywall.
DROP POLICY IF EXISTS "Anyone can view active intl questions" ON public.intl_questions;
DROP POLICY IF EXISTS "Signed-in users view active intl questions" ON public.intl_questions;
CREATE POLICY "Staff and centers view active intl questions" ON public.intl_questions FOR SELECT TO authenticated
  USING (is_active AND (SELECT public.is_staff_or_center_member()));

-- Concept videos: Tsetsegs staff and centers only; Tsetsegs students (student token) lose them.
DROP POLICY IF EXISTS "Published concept videos are viewable" ON public.concept_videos;
DROP POLICY IF EXISTS "Students view published concept videos" ON public.concept_videos;
REVOKE SELECT ON public.concept_videos FROM anon;
CREATE POLICY "Staff and centers view published concept videos" ON public.concept_videos FOR SELECT TO authenticated
  USING (is_published AND (SELECT public.is_staff_or_center_member()));

-- Uploaded video files: the concept-video-url function signs links with the service role after the same check;
-- direct reads of the bucket get the same rule.
DROP POLICY IF EXISTS "Concept videos public read" ON storage.objects;
DROP POLICY IF EXISTS "Concept videos signed-in read" ON storage.objects;
CREATE POLICY "Staff and centers read concept videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'concept-videos' AND (SELECT public.is_staff_or_center_member()));

NOTIFY pgrst, 'reload schema';
