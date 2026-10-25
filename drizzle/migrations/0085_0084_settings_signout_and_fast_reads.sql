-- 1. Saving center Settings signed out every student and teacher of that center (since 0020, kept in 0082).
-- 2. Read rules of the form "own rows OR staff" can't use an index, so a read that doesn't name a student scanned
--    the whole table (a signed-out read of activity logs hit the 8 s timeout). The student/signed-out rule (anon)
--    is now separate from the staff rule (authenticated), so anon reads become an index lookup. Same rows visible
--    to the same people as 0079/0082. Safe to run twice.
SET lock_timeout = '3s';

CREATE OR REPLACE FUNCTION public.tenant_update_settings(_institution uuid, _settings jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v jsonb; logo text := nullif(trim(_settings->>'logo_url'), ''); days int; cutoff timestamptz;
BEGIN
  IF NOT (public.tenant_has_role(_institution, 'center_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF logo IS NOT NULL AND NOT (logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' OR logo ~ '^https://') THEN logo := NULL; END IF;
  IF length(logo) > 250000 THEN RAISE EXCEPTION 'Logo is too large'; END IF;
  days := CASE WHEN (_settings->>'session_days') ~ '^(1|7|30|90)$' THEN (_settings->>'session_days')::int END;
  -- No time sent keeps the saved one. least() ignores NULLs, so least(NULL, now()) used to mean "now" and every
  -- Save signed the whole center out. The "Sign everyone out" button sends a time, which is still capped at now().
  BEGIN
    cutoff := CASE WHEN nullif(_settings->>'signout_before', '') IS NULL
      THEN (SELECT (c.portal_settings->>'signout_before')::timestamptz FROM public.institution_customers c WHERE c.id = _institution)
      ELSE least((_settings->>'signout_before')::timestamptz, now()) END;
  EXCEPTION WHEN others THEN cutoff := NULL; END;
  v := jsonb_strip_nulls(jsonb_build_object(
    'display_name', left(nullif(trim(_settings->>'display_name'), ''), 80),
    'logo_url', logo,
    'brand_color', CASE WHEN (_settings->>'brand_color') ~ '^#[0-9a-fA-F]{6}$' THEN _settings->>'brand_color' END,
    'contact_email', left(nullif(trim(_settings->>'contact_email'), ''), 200),
    'billing_email', coalesce(
      CASE WHEN trim(_settings->>'billing_email') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN left(trim(_settings->>'billing_email'), 200) END,
      (SELECT c.portal_settings->>'billing_email' FROM public.institution_customers c WHERE c.id = _institution)),
    'timezone', left(nullif(trim(_settings->>'timezone'), ''), 60),
    'session_days', days,
    'signout_before', cutoff,
    'notify_new_students', CASE WHEN jsonb_typeof(_settings->'notify_new_students') = 'boolean' THEN _settings->'notify_new_students' END,
    'notify_overdue', CASE WHEN jsonb_typeof(_settings->'notify_overdue') = 'boolean' THEN _settings->'notify_overdue' END,
    'notify_inactive', CASE WHEN jsonb_typeof(_settings->'notify_inactive') = 'boolean' THEN _settings->'notify_inactive' END
  ));
  UPDATE public.institution_customers SET portal_settings = v, updated_at = now() WHERE id = _institution;
  RETURN v;
END $function$;

DROP POLICY IF EXISTS "Students and staff read progress" ON public.student_progress;
DROP POLICY IF EXISTS "Students read own progress" ON public.student_progress;
DROP POLICY IF EXISTS "Staff and signed-in students read progress" ON public.student_progress;
CREATE POLICY "Students read own progress" ON public.student_progress FOR SELECT TO anon
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Staff and signed-in students read progress" ON public.student_progress FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()) OR student_account_id = (SELECT public.request_student_id()));
DROP POLICY IF EXISTS "Students and staff read flags" ON public.question_flags;
DROP POLICY IF EXISTS "Students read own flags" ON public.question_flags;
DROP POLICY IF EXISTS "Staff and signed-in students read flags" ON public.question_flags;
CREATE POLICY "Students read own flags" ON public.question_flags FOR SELECT TO anon
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Staff and signed-in students read flags" ON public.question_flags FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()) OR student_account_id = (SELECT public.request_student_id()));
DROP POLICY IF EXISTS "Students and staff read activity logs" ON public.student_activity_logs;
DROP POLICY IF EXISTS "Students read own activity logs" ON public.student_activity_logs;
DROP POLICY IF EXISTS "Staff and signed-in students read activity logs" ON public.student_activity_logs;
CREATE POLICY "Students read own activity logs" ON public.student_activity_logs FOR SELECT TO anon
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Staff and signed-in students read activity logs" ON public.student_activity_logs FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()) OR student_account_id = (SELECT public.request_student_id()));
DROP POLICY IF EXISTS "Students and staff read speed sessions" ON public.speed_sessions;
DROP POLICY IF EXISTS "Students read own speed sessions" ON public.speed_sessions;
DROP POLICY IF EXISTS "Staff and signed-in students read speed sessions" ON public.speed_sessions;
CREATE POLICY "Students read own speed sessions" ON public.speed_sessions FOR SELECT TO anon
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Staff and signed-in students read speed sessions" ON public.speed_sessions FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()) OR student_account_id = (SELECT public.request_student_id()));
DROP POLICY IF EXISTS "Students and staff read streaks" ON public.student_streaks;
DROP POLICY IF EXISTS "Students read own streaks" ON public.student_streaks;
DROP POLICY IF EXISTS "Staff and signed-in students read streaks" ON public.student_streaks;
CREATE POLICY "Students read own streaks" ON public.student_streaks FOR SELECT TO anon
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Staff and signed-in students read streaks" ON public.student_streaks FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()) OR student_account_id = (SELECT public.request_student_id()));
DROP POLICY IF EXISTS "Students and staff read points" ON public.point_transactions;
DROP POLICY IF EXISTS "Students read own points" ON public.point_transactions;
DROP POLICY IF EXISTS "Staff and signed-in students read points" ON public.point_transactions;
CREATE POLICY "Students read own points" ON public.point_transactions FOR SELECT TO anon
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Staff and signed-in students read points" ON public.point_transactions FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()) OR student_account_id = (SELECT public.request_student_id()));
DROP POLICY IF EXISTS "Students and staff read speed session items" ON public.speed_session_items;
DROP POLICY IF EXISTS "Students read own speed session items" ON public.speed_session_items;
DROP POLICY IF EXISTS "Staff and signed-in students read speed session items" ON public.speed_session_items;
CREATE POLICY "Students read own speed session items" ON public.speed_session_items FOR SELECT TO anon
  USING (session_id IN (SELECT s.id FROM public.speed_sessions s WHERE s.student_account_id = (SELECT public.request_student_id())));
CREATE POLICY "Staff and signed-in students read speed session items" ON public.speed_session_items FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()) OR session_id IN (SELECT s.id FROM public.speed_sessions s WHERE s.student_account_id = (SELECT public.request_student_id())));

DO $$ BEGIN RAISE NOTICE '0084 applied: settings Save keeps the sign-out time; read rules split by role'; END $$;