
-- Students authenticate via a custom edge-function flow and have no Supabase auth
-- session, so current_student_account_id() is always NULL for them, which blocked
-- every insert/select on speed_sessions. Align with public.student_attempts.

DROP POLICY IF EXISTS "Students insert own speed sessions" ON public.speed_sessions;
DROP POLICY IF EXISTS "Students view own speed sessions" ON public.speed_sessions;
DROP POLICY IF EXISTS "Students update own speed sessions" ON public.speed_sessions;

CREATE POLICY "Public can insert speed sessions"
  ON public.speed_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read speed sessions"
  ON public.speed_sessions FOR SELECT USING (true);
CREATE POLICY "Public can update speed sessions"
  ON public.speed_sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Students insert own speed session items" ON public.speed_session_items;
DROP POLICY IF EXISTS "Students view own speed session items" ON public.speed_session_items;

CREATE POLICY "Public can insert speed session items"
  ON public.speed_session_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can read speed session items"
  ON public.speed_session_items FOR SELECT USING (true);

GRANT SELECT, INSERT, UPDATE ON public.speed_sessions TO anon, authenticated;
GRANT SELECT, INSERT ON public.speed_session_items TO anon, authenticated;
GRANT ALL ON public.speed_sessions TO service_role;
GRANT ALL ON public.speed_session_items TO service_role;
