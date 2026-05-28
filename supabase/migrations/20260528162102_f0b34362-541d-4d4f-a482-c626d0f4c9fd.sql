
-- 1) TEACHERS: column-level grants exclude password_hash
DROP POLICY IF EXISTS "Authenticated can view teacher names" ON public.teachers;

REVOKE SELECT ON public.teachers FROM anon, authenticated;
GRANT SELECT (id, name, username, temporary_password, created_at, last_login, phone) ON public.teachers TO authenticated;

CREATE POLICY "Authenticated can view non-sensitive teacher fields"
  ON public.teachers
  FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.teachers TO service_role;


-- 2) STUDENT_EMAIL_LINKS: stop public read
DROP POLICY IF EXISTS "Anyone can read email links" ON public.student_email_links;
DROP POLICY IF EXISTS "Public can read email links" ON public.student_email_links;

CREATE POLICY "Staff can read email links"
  ON public.student_email_links
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'teacher'::public.app_role));


-- 3) STUDENT_NUDGES: staff only
DROP POLICY IF EXISTS "Teachers can insert nudges" ON public.student_nudges;
DROP POLICY IF EXISTS "Teachers can view nudges for their batches" ON public.student_nudges;
DROP POLICY IF EXISTS "Public can insert nudges" ON public.student_nudges;
DROP POLICY IF EXISTS "Public can view nudges" ON public.student_nudges;

CREATE POLICY "Staff can insert nudges"
  ON public.student_nudges
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
           OR public.has_role(auth.uid(), 'teacher'::public.app_role));

CREATE POLICY "Staff can read nudges"
  ON public.student_nudges
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'teacher'::public.app_role));


-- 4) REGISTRATION_REQUESTS: staff only read; keep anonymous INSERT
DROP POLICY IF EXISTS "Anyone can view own registration request" ON public.registration_requests;
DROP POLICY IF EXISTS "Public can view registration requests" ON public.registration_requests;

CREATE POLICY "Staff can view registration requests"
  ON public.registration_requests
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'teacher'::public.app_role));


-- 5) LIVE_SESSION_PARTICIPANTS: hide phone_number via column-level grants
DROP POLICY IF EXISTS "Anyone can view participants" ON public.live_session_participants;
DROP POLICY IF EXISTS "Public can view participants" ON public.live_session_participants;

REVOKE SELECT ON public.live_session_participants FROM anon, authenticated;
GRANT SELECT (id, session_id, player_name, total_points, joined_at)
  ON public.live_session_participants TO anon, authenticated;

CREATE POLICY "Public can view participant scoreboard"
  ON public.live_session_participants
  FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON public.live_session_participants TO service_role;
