-- Security batch 3: the last open tables from the scan, and the center billing email leak.
-- Anyone can sign up, so "authenticated" alone proves nothing. Main-app students reach the database as anon with
-- their x-student-token (request_student_id()); teachers and admins sign in with Supabase auth (has_role /
-- is_platform_staff()). Signed-out screens get narrow definer functions. Safe to run twice.
--
-- Left open on purpose (owner-accepted): attendance and homework reads (ids and statuses only, signed-out report
-- and share pages), batches (class names, teachers and schedules for the signed-out /register, /batch/:id and
-- report pages), closing_report_settings (the report's template text), question_categories (reference data),
-- challenge reads from 0079 (live challenge screens can't send the token), and live game answers/scoreboard
-- reads (the live game is played signed out).

-- Start from nothing on these tables: policies Lovable wrote straight to the database may not match the repo.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN
    ('question_flags', 'student_activity_logs', 'announcement_reads', 'live_session_questions',
     'live_session_participants', 'live_session_answers', 'speed_sessions', 'speed_session_items',
     'point_transactions', 'student_streaks')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;
ALTER TABLE public.question_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

-- ============ Question flags: students flag as themselves; staff review ============
-- StudentQuestion upserts the flag, so the student also updates their own row.
CREATE POLICY "Students and staff read flags" ON public.question_flags FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Students flag as themselves" ON public.question_flags FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students update own flags" ON public.question_flags FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins can manage question flags" ON public.question_flags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Activity logs: own rows (login rows come from the student-login server function) ============
CREATE POLICY "Students and staff read activity logs" ON public.student_activity_logs FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Students log own activity" ON public.student_activity_logs FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins can manage activity logs" ON public.student_activity_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Announcement read markers: own rows (marking read is an upsert) ============
CREATE POLICY "Students read own announcement reads" ON public.announcement_reads FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students mark own announcements read" ON public.announcement_reads FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students update own announcement reads" ON public.announcement_reads FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Staff manage announcement reads" ON public.announcement_reads FOR ALL TO authenticated
  USING ((SELECT public.is_platform_staff())) WITH CHECK ((SELECT public.is_platform_staff()));

-- ============ Live class game ============
-- Players get their questions from live_session_question_list() (0058), so the table is staff-only.
CREATE POLICY "Staff read session questions" ON public.live_session_questions FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()));
CREATE POLICY "Staff add session questions" ON public.live_session_questions FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_platform_staff()));

-- The game is played signed out, so any player can still answer as any player of a running game. What's closed:
-- answers outside a running game or for questions not in it, a second answer to the same question, more than
-- 1000 points an answer (the most LiveSession.tsx awards), joining with points, and a total above what the
-- player's answers scored.
CREATE OR REPLACE FUNCTION public.live_answer_allowed(_session uuid, _participant uuid, _question uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
      SELECT 1 FROM public.live_sessions s
      JOIN public.live_session_participants p ON p.session_id = s.id AND p.id = _participant
      JOIN public.live_session_questions q ON q.session_id = s.id AND q.question_id = _question
      WHERE s.id = _session AND s.status = 'active')
    AND NOT EXISTS (SELECT 1 FROM public.live_session_answers a WHERE a.participant_id = _participant AND a.question_id = _question);
$$;
REVOKE ALL ON FUNCTION public.live_answer_allowed(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_answer_allowed(uuid, uuid, uuid) TO anon, authenticated;

CREATE POLICY "Anyone can view answers" ON public.live_session_answers FOR SELECT USING (true);
CREATE POLICY "Players answer once while the game runs" ON public.live_session_answers FOR INSERT
  WITH CHECK (points_earned BETWEEN 0 AND 1000 AND (is_correct OR points_earned = 0)
    AND public.live_answer_allowed(session_id, participant_id, question_id));

-- Phone numbers stay hidden by the column grants from 0061.
CREATE POLICY "Public can view participant scoreboard" ON public.live_session_participants FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "Players join open games" ON public.live_session_participants FOR INSERT
  WITH CHECK (total_points = 0
    AND EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.status <> 'finished'));
CREATE POLICY "Players add points they scored" ON public.live_session_participants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.status = 'active'))
  WITH CHECK (total_points BETWEEN 0 AND (SELECT coalesce(sum(a.points_earned), 0) FROM public.live_session_answers a
                                          WHERE a.participant_id = live_session_participants.id));

-- ============ Speed sessions: own rows; teachers and admins read all ============
CREATE POLICY "Students and staff read speed sessions" ON public.speed_sessions FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Students record own speed sessions" ON public.speed_sessions FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));

CREATE POLICY "Students and staff read speed session items" ON public.speed_session_items FOR SELECT
  USING ((SELECT public.is_platform_staff()) OR EXISTS (SELECT 1 FROM public.speed_sessions s
    WHERE s.id = session_id AND s.student_account_id = (SELECT public.request_student_id())));
CREATE POLICY "Students record own speed session items" ON public.speed_session_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.speed_sessions s
    WHERE s.id = session_id AND s.student_account_id = (SELECT public.request_student_id())));

-- ============ Streaks: own row ============
CREATE POLICY "Students and staff read streaks" ON public.student_streaks FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Students insert own streak" ON public.student_streaks FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students update own streak" ON public.student_streaks FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins manage streaks" ON public.student_streaks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Points: own rows; classmates see totals through two narrow functions ============
-- Points are still decided by guard_point_transaction (0024).
CREATE POLICY "Students and staff read points" ON public.point_transactions FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Students insert own points" ON public.point_transactions FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins can manage point transactions" ON public.point_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Classmate profile (FullProfileDialog): total and activity heatmap. Points and times only, no metadata.
CREATE OR REPLACE FUNCTION public.student_points_history(_student_id uuid, _since timestamptz DEFAULT NULL)
RETURNS TABLE(points integer, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.points, t.created_at FROM public.point_transactions t
  WHERE t.student_account_id = _student_id AND (_since IS NULL OR t.created_at >= _since)
    AND ((SELECT public.request_student_id()) IS NOT NULL OR (SELECT public.is_platform_staff()))
  ORDER BY t.created_at, t.id;
$$;
-- Sprint leaderboard tooltip: each student's points per category in the sprint.
CREATE OR REPLACE FUNCTION public.sprint_points_breakdown(_sprint_id uuid, _student_ids uuid[])
RETURNS TABLE(student_account_id uuid, category text, points integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.student_account_id, t.category, sum(t.points)::integer FROM public.point_transactions t
  WHERE t.sprint_id = _sprint_id AND t.student_account_id = ANY(_student_ids)
    AND ((SELECT public.request_student_id()) IS NOT NULL OR (SELECT public.is_platform_staff()))
  GROUP BY t.student_account_id, t.category;
$$;
REVOKE ALL ON FUNCTION public.student_points_history(uuid, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sprint_points_breakdown(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_points_history(uuid, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sprint_points_breakdown(uuid, uuid[]) TO anon, authenticated;

-- ============ Center portal: billing email no longer public ============
-- tenant_lookup runs signed out on every center subdomain, so it returns only what the portal shows before and
-- around sign-in: brand, contact email, and the session rules the shell enforces for students and teachers.
-- Billing email, time zone and notification switches come from tenant_settings(), for that center's admins.
DROP FUNCTION IF EXISTS public.tenant_lookup(text);
CREATE FUNCTION public.tenant_lookup(_slug text)
RETURNS TABLE(id uuid, name text, country text, slug text, portal_settings jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.country, c.slug,
    jsonb_strip_nulls(jsonb_build_object(
      'display_name', c.portal_settings->'display_name', 'logo_url', c.portal_settings->'logo_url',
      'brand_color', c.portal_settings->'brand_color', 'contact_email', c.portal_settings->'contact_email',
      'session_days', c.portal_settings->'session_days', 'signout_before', c.portal_settings->'signout_before'))
  FROM public.institution_customers c
  WHERE lower(c.slug) = lower(_slug) AND c.portal_enabled AND c.status <> 'churned' LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.tenant_lookup(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.tenant_settings(_institution uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.portal_settings FROM public.institution_customers c
  WHERE c.id = _institution AND (public.tenant_has_role(_institution, 'center_admin') OR public.has_role(auth.uid(), 'admin'));
$$;
REVOKE ALL ON FUNCTION public.tenant_settings(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_settings(uuid) TO authenticated;

-- Copy of 0020 with one change: a blank billing email keeps the saved one, so a Settings form that never saw it
-- (a tab opened before this release) can't wipe it.
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
  BEGIN cutoff := least((_settings->>'signout_before')::timestamptz, now()); EXCEPTION WHEN others THEN cutoff := NULL; END;
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

DO $$ BEGIN RAISE NOTICE '0098 applied: flags, logs, reads, live game, speed, streaks and points locked; billing email off tenant_lookup'; END $$;
