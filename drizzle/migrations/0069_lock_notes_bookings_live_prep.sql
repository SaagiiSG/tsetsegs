-- Student notes, seat bookings, booking bans, live class games and intense prep classes were open to anyone
-- (USING/WITH CHECK true), and anyone can sign up, so "authenticated" alone proves nothing either.
-- Students reach the database as anon with their x-student-token (request_student_id()); teachers and admins
-- sign in with Supabase auth (has_role / is_platform_staff()). Signed-out pages get narrow definer functions.

-- Start from nothing on these tables: policies Lovable wrote straight to the database may not match the repo.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN
    ('student_question_notes', 'seat_bookings', 'booking_bans', 'live_sessions',
     'intense_prep_groups', 'intense_prep_members', 'intense_prep_tracking')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============ Private question notes and drawings: the student's own only ============
CREATE POLICY "Students read own notes" ON public.student_question_notes FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students add own notes" ON public.student_question_notes FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students edit own notes" ON public.student_question_notes FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins can manage notes" ON public.student_question_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Review-session seat bookings ============
-- Students see and book only their own seats (never while banned) and may only cancel them.
-- Check-in and attendance are admin-only, so a student can't mark themselves present.
CREATE POLICY "Admins can manage bookings" ON public.seat_bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students read own bookings" ON public.seat_bookings FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students book own seat" ON public.seat_bookings FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id())
    AND NOT EXISTS (SELECT 1 FROM public.booking_bans b
                    WHERE b.student_account_id = seat_bookings.student_account_id AND b.banned_until > now()));
CREATE POLICY "Students cancel own bookings" ON public.seat_bookings FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
REVOKE INSERT, UPDATE ON public.seat_bookings FROM anon;
GRANT INSERT (review_session_id, student_account_id, seat_number, check_in_code), UPDATE (cancelled_at)
  ON public.seat_bookings TO anon;

-- The seat map needs which seats are taken, never who took them or their check-in codes.
CREATE OR REPLACE FUNCTION public.review_session_taken_seats()
RETURNS TABLE(review_session_id uuid, seat_number integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.review_session_id, b.seat_number FROM seat_bookings b WHERE b.cancelled_at IS NULL;
$$;
REVOKE ALL ON FUNCTION public.review_session_taken_seats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_session_taken_seats() TO anon, authenticated;

-- ============ Booking bans: students see their own; staff issue them (as before) ============
CREATE POLICY "Admins can manage bans" ON public.booking_bans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Staff can insert bans" ON public.booking_bans FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_staff());
CREATE POLICY "Students read own bans" ON public.booking_bans FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()));

-- ============ Live class games: teachers run them; players follow along signed out ============
-- Reads stay open: players join by code without signing in and follow the game over realtime,
-- which can only check the row itself. The row holds no student data.
CREATE POLICY "Anyone can view active sessions" ON public.live_sessions FOR SELECT USING (true);
CREATE POLICY "Staff create sessions" ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_staff());
CREATE POLICY "Staff run sessions" ON public.live_sessions FOR UPDATE TO authenticated
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
-- Same hole one table over: a stranger could add any question to a running game, then read its answer
-- through live_session_question_list().
DROP POLICY IF EXISTS "Authenticated can insert session questions" ON public.live_session_questions;
DROP POLICY IF EXISTS "Staff add session questions" ON public.live_session_questions;
CREATE POLICY "Staff add session questions" ON public.live_session_questions FOR INSERT TO authenticated
  WITH CHECK (public.is_platform_staff());

-- ============ Intense prep classes: shared by all teachers and admins, nobody else ============
CREATE POLICY "Staff manage prep classes" ON public.intense_prep_groups FOR ALL TO authenticated
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
CREATE POLICY "Staff manage prep members" ON public.intense_prep_members FOR ALL TO authenticated
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());
CREATE POLICY "Staff manage prep tracking" ON public.intense_prep_tracking FOR ALL TO authenticated
  USING (public.is_platform_staff()) WITH CHECK (public.is_platform_staff());

-- The signed-out QR page shows the class name; joining itself already goes through prep_class_join().
CREATE OR REPLACE FUNCTION public.prep_class_name(_join_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.name FROM intense_prep_groups g WHERE upper(g.join_code) = upper(_join_code) AND g.is_active LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.prep_class_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prep_class_name(text) TO anon, authenticated;

DO $$ BEGIN RAISE NOTICE '0069 applied: notes, bookings, bans, live sessions and prep classes locked'; END $$;
