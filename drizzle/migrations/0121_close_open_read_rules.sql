-- Close the nine "everyone can read" rules. Staff keep full reads; main students
-- (student token) read what their pages need; signed-out pages use token-checked functions.

-- Helpers ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_student_roster_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id
  FROM public.student_accounts a
  JOIN public.students s
    ON s.id = a.linked_student_id OR s.phone = a.phone_number OR s.phone = replace(a.phone_number, '-', '')
  WHERE a.id = public.request_student_id();
$$;
REVOKE EXECUTE ON FUNCTION public.request_student_roster_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_student_roster_ids() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.live_session_open(_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = _session
    AND (s.status <> 'finished' OR s.finished_at > now() - interval '1 day'));
$$;
REVOKE EXECUTE ON FUNCTION public.live_session_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_open(uuid) TO anon, authenticated, service_role;

-- batches ---------------------------------------------------------------
DROP POLICY IF EXISTS "Batches are viewable by unique link" ON public.batches;
DROP POLICY IF EXISTS "Public read access to batches" ON public.batches;
CREATE POLICY "Signed-in students and staff read batches" ON public.batches
  FOR SELECT TO anon, authenticated
  USING (((SELECT public.request_student_id()) IS NOT NULL) OR (SELECT public.is_platform_staff()));

-- attendance ------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read attendance" ON public.attendance;
CREATE POLICY "Students read own attendance, staff read all" ON public.attendance
  FOR SELECT TO anon, authenticated
  USING ((SELECT public.is_platform_staff()) OR student_id IN (SELECT public.request_student_roster_ids()));

-- homework --------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read homework" ON public.homework;
CREATE POLICY "Students read own homework, staff read all" ON public.homework
  FOR SELECT TO anon, authenticated
  USING ((SELECT public.is_platform_staff()) OR student_id IN (SELECT public.request_student_roster_ids()));

-- closing_report_settings ----------------------------------------------
DROP POLICY IF EXISTS "Anyone can view closing report settings" ON public.closing_report_settings;
CREATE POLICY "Signed-in students and staff read closing report settings" ON public.closing_report_settings
  FOR SELECT TO anon, authenticated
  USING (((SELECT public.request_student_id()) IS NOT NULL) OR (SELECT public.is_platform_staff()));

-- question_categories ---------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view question categories" ON public.question_categories;
CREATE POLICY "Students, staff and centers read question categories" ON public.question_categories
  FOR SELECT TO anon, authenticated
  USING (((SELECT public.request_student_id()) IS NOT NULL)
    OR (SELECT public.is_staff_or_center_member())
    OR (SELECT public.is_demo_user()));

-- demo_slice ------------------------------------------------------------
DROP POLICY IF EXISTS "Signed-in accounts read the demo slice ids" ON public.demo_slice;
CREATE POLICY "Demo accounts and staff read the demo slice ids" ON public.demo_slice
  FOR SELECT TO authenticated
  USING ((SELECT public.is_demo_user()) OR (SELECT public.is_platform_staff()));

-- live game -------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.live_sessions;
CREATE POLICY "Players see open games, staff see all" ON public.live_sessions
  FOR SELECT TO anon, authenticated
  USING (status <> 'finished' OR finished_at > now() - interval '1 day' OR (SELECT public.is_platform_staff()));

DROP POLICY IF EXISTS "Public can view participant scoreboard" ON public.live_session_participants;
CREATE POLICY "Players see open game scoreboards, staff see all" ON public.live_session_participants
  FOR SELECT TO anon, authenticated
  USING ((SELECT public.is_platform_staff()) OR public.live_session_open(session_id));

DROP POLICY IF EXISTS "Anyone can view answers" ON public.live_session_answers;
CREATE POLICY "Players see open game answers, staff see all" ON public.live_session_answers
  FOR SELECT TO anon, authenticated
  USING ((SELECT public.is_platform_staff()) OR public.live_session_open(session_id));

-- Signed-out pages: token-checked reads ----------------------------------
CREATE OR REPLACE FUNCTION public.batch_by_link(_link text)
RETURNS SETOF public.batches LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.* FROM public.batches b
  WHERE _link IS NOT NULL AND length(_link) > 0 AND b.unique_link_id = _link
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.batch_by_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_by_link(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.batch_for_registration(_batch_id uuid)
RETURNS TABLE(id uuid, batch_name text, teacher text, course_type public.course_type, is_international boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.batch_name, b.teacher, b.course_type, b.is_international
  FROM public.batches b WHERE b.id = _batch_id LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.batch_for_registration(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.batch_for_registration(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.report_public_data(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN r.expires_at <= now() THEN jsonb_build_object('expired', true)
    ELSE jsonb_build_object(
      'expired', false,
      'batch', (SELECT jsonb_build_object('batch_name', b.batch_name, 'course_type', b.course_type)
                FROM public.batches b WHERE b.id = r.batch_id),
      'attendance', (SELECT to_jsonb(a) FROM public.attendance a
                     WHERE a.student_id = r.student_id AND a.batch_id = r.batch_id LIMIT 1),
      'homework', COALESCE((SELECT jsonb_agg(jsonb_build_object('completed', h.completed))
                   FROM public.homework h WHERE h.student_id = r.student_id AND h.batch_id = r.batch_id), '[]'::jsonb))
  END
  FROM public.closing_report_tokens r
  WHERE _token IS NOT NULL AND r.token = _token
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.report_public_data(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_public_data(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.report_settings_for_token(_token text)
RETURNS TABLE(heading text, body text, sign_off text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.heading, s.body, s.sign_off FROM public.closing_report_settings s
  WHERE EXISTS (SELECT 1 FROM public.closing_report_tokens r
                WHERE _token IS NOT NULL AND r.token = _token AND r.expires_at > now())
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.report_settings_for_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_settings_for_token(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.shared_profile_data(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'batch', (SELECT jsonb_build_object('id', b.id, 'batch_name', b.batch_name, 'course_type', b.course_type,
                'schedule', b.schedule, 'start_date', b.start_date)
              FROM public.batches b WHERE b.id = s.batch_id),
    'attendance', (SELECT to_jsonb(a) FROM public.attendance a
                   WHERE a.student_id = s.id AND a.batch_id = s.batch_id LIMIT 1),
    'homework', COALESCE((SELECT jsonb_agg(jsonb_build_object('session_number', h.session_number, 'completed', h.completed))
                 FROM public.homework h WHERE h.student_id = s.id AND h.batch_id = s.batch_id), '[]'::jsonb))
  FROM public.student_accounts acc
  JOIN public.students s ON s.id = acc.linked_student_id
  WHERE _token IS NOT NULL AND acc.share_token = _token
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.shared_profile_data(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shared_profile_data(text) TO anon, authenticated, service_role;
