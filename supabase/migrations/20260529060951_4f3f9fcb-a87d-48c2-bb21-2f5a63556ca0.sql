
-- ============================================================
-- Phase 1: Safe security hardening
-- ============================================================

-- 1. teachers.password_hash leak
-- Drop the broad authenticated SELECT; teachers only see their own row.
DROP POLICY IF EXISTS "Authenticated can view non-sensitive teacher fields" ON public.teachers;
-- "Teachers can view their own profile" already exists and is correct.
-- "Admins can manage teachers" already exists.

-- 2. booking_bans public INSERT -> admin/teacher only
DROP POLICY IF EXISTS "Public can insert bans" ON public.booking_bans;
CREATE POLICY "Staff can insert bans"
  ON public.booking_bans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'teacher'::app_role)
  );

-- 3. student_accounts public INSERT must require the phone to be admin-enrolled in students
DROP POLICY IF EXISTS "Public can insert student accounts" ON public.student_accounts;
CREATE POLICY "Account creation requires enrolled phone"
  ON public.student_accounts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.phone = student_accounts.phone_number
         OR s.phone = REPLACE(student_accounts.phone_number, '-', '')
         OR REPLACE(s.phone, '-', '') = student_accounts.phone_number
    )
  );

-- 4. Function search_path mutable - fix queue helpers
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, extensions;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, extensions;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, extensions;
ALTER FUNCTION public.generate_share_token() SET search_path = public, extensions;

-- 5. SECURITY DEFINER view -> recreate as SECURITY INVOKER
DROP VIEW IF EXISTS public.ngee_session_taken_seats;
CREATE VIEW public.ngee_session_taken_seats
WITH (security_invoker = true) AS
  SELECT session_id, seat_number
  FROM public.ngee_bookings
  WHERE cancelled_at IS NULL;
GRANT SELECT ON public.ngee_session_taken_seats TO anon, authenticated;

-- 6. Revoke EXECUTE on SECURITY DEFINER functions that should only run from triggers/edge functions
REVOKE EXECUTE ON FUNCTION public.hash_student_password(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_student_password(text, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public._post_edge_function(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_ngee_sessions(uuid, integer) FROM anon, PUBLIC;
-- Trigger-only helpers (kept SECURITY DEFINER for the trigger context)
REVOKE EXECUTE ON FUNCTION public.link_student_account_by_phone() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_total_attended() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_attendance_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_fee_paid_sms() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_student_welcome_sms() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_attendance_sms() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maybe_unlock_rank() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ngee_validate_and_codegen() FROM anon, authenticated, PUBLIC;

-- 7. password_reset_codes - explicit deny for anon/authenticated; only service_role (and SECURITY DEFINER edge functions) write
-- Ensure RLS is on and no permissive policy exists for anon/authenticated.
ALTER TABLE IF EXISTS public.password_reset_codes ENABLE ROW LEVEL SECURITY;
-- Drop any accidentally permissive policies if present (no-op if absent)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy WHERE polrelid = 'public.password_reset_codes'::regclass
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.password_reset_codes', pol.polname);
  END LOOP;
END $$;
-- Revoke direct table grants from anon/authenticated; service_role retains full access.
REVOKE ALL ON public.password_reset_codes FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.password_reset_codes TO service_role;
