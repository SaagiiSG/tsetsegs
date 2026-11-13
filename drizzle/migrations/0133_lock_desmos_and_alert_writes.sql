-- Lovable's security scan, 12 Nov 2026 (Saagii): anyone with the public key could add security alerts for any
-- student and rewrite anyone's calculator-usage rows. Both are written only by the main student app
-- (useSecurityEvents, DesmosCalculator), which always sends the student token; the edge functions use the service
-- role and skip these rules. Now a student writes only rows for their own account. TO anon, authenticated: a main
-- student with a leftover Supabase session sends the token as authenticated (0093).
-- Desmos also gets an own-rows read: the open log is insert-then-return-id and the close log filters by id, and both
-- need the row to be readable, so with staff-only reads neither step could have worked for students.
-- class_tests keeps its public read on purpose: the /exam page and the main app wait for the teacher's start
-- through Realtime, which can't see the student token. Safe to run twice.
SET lock_timeout = '3s';

DROP POLICY IF EXISTS "Public can insert security alerts" ON public.security_alerts;
DROP POLICY IF EXISTS "Students log own security alerts" ON public.security_alerts;
CREATE POLICY "Students log own security alerts" ON public.security_alerts FOR INSERT TO anon, authenticated
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));

DROP POLICY IF EXISTS "Public can insert desmos events" ON public.desmos_usage_events;
DROP POLICY IF EXISTS "Public can update desmos events" ON public.desmos_usage_events;
DROP POLICY IF EXISTS "Students log own desmos events" ON public.desmos_usage_events;
DROP POLICY IF EXISTS "Students close own desmos events" ON public.desmos_usage_events;
DROP POLICY IF EXISTS "Students read own desmos events" ON public.desmos_usage_events;
CREATE POLICY "Students log own desmos events" ON public.desmos_usage_events FOR INSERT TO anon, authenticated
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students close own desmos events" ON public.desmos_usage_events FOR UPDATE TO anon, authenticated
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students read own desmos events" ON public.desmos_usage_events FOR SELECT TO anon, authenticated
  USING (student_account_id = (SELECT public.request_student_id()));

NOTIFY pgrst, 'reload schema';
