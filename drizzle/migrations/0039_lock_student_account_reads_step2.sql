-- Step 2 of 2: apply only after the app that uses 0036's lookups is published,
-- or sign-in breaks for anyone still on the old app.
-- ============ Only signed-in students and staff can read accounts ============
-- Before this, anyone with the public key could list every account (phone numbers,
-- device ids). Signed-in students still see other students' rows, because the
-- leaderboard, friends and challenges show them.
DROP POLICY IF EXISTS "Public can read student accounts by phone" ON public.student_accounts;
DROP POLICY IF EXISTS "Signed-in students and staff read accounts" ON public.student_accounts;
CREATE POLICY "Signed-in students and staff read accounts" ON public.student_accounts FOR SELECT
  USING ((SELECT public.request_student_id()) IS NOT NULL OR (SELECT public.is_platform_staff()));
