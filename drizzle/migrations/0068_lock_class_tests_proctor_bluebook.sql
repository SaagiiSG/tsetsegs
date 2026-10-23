-- A security scan found class tests, proctored sessions and Bluebook practice tests open to anyone with the public
-- key (USING (true)): anyone could read students' phones and draft answers, rewrite anyone's answers, and any
-- signed-in account (solo sign-up is open to everyone) could read every proctor unlock code. Every policy on these
-- five tables is dropped, including any added outside the repo, and replaced with the set below.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public'
    AND tablename IN ('class_test_participants', 'class_test_answers', 'proctor_sessions', 'bluebook_attempts', 'bluebook_answers')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.class_test_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_test_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proctor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bluebook_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bluebook_answers ENABLE ROW LEVEL SECURITY;

-- ============ Class tests ============
-- Students join by QR + phone and take the test signed out, through definer functions keyed by their participant id
-- (class_test_join/_load_draft/_save_draft/_submit), so nobody writes these tables directly. Staff read every result;
-- a signed-in student (student token) reads only their own on "My exam results".
REVOKE INSERT, UPDATE ON public.class_test_participants, public.class_test_answers FROM anon, authenticated;

CREATE POLICY "Students and staff read test participants" ON public.class_test_participants FOR SELECT
  USING ((SELECT public.is_platform_staff())
    OR student_account_id = (SELECT public.request_student_id())
    OR ((SELECT public.request_student_id()) IS NOT NULL AND public.request_student_owns(linked_student_id)));
CREATE POLICY "Staff delete test participants" ON public.class_test_participants FOR DELETE TO authenticated
  USING ((SELECT public.is_platform_staff()));

-- Phone numbers and draft answers stay staff-only, even on the student's own row.
REVOKE SELECT ON public.class_test_participants FROM anon;
GRANT SELECT (id, test_id, student_account_id, linked_student_id, display_name, joined_at, submitted_at,
  correct_count, answered_count, total_time_ms, focus_violations) ON public.class_test_participants TO anon;

CREATE POLICY "Students and staff read test answers" ON public.class_test_answers FOR SELECT
  USING ((SELECT public.is_platform_staff()) OR EXISTS (
    SELECT 1 FROM public.class_test_participants p WHERE p.id = participant_id
      AND (p.student_account_id = (SELECT public.request_student_id())
        OR ((SELECT public.request_student_id()) IS NOT NULL AND public.request_student_owns(p.linked_student_id)))));
CREATE POLICY "Staff delete test answers" ON public.class_test_answers FOR DELETE TO authenticated
  USING ((SELECT public.is_platform_staff()));

-- Any signed-in account could end a test early for the whole class. Body unchanged from 20260806031811.
CREATE OR REPLACE FUNCTION public.class_test_finalize(p_test_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'Only teachers can finalize a class test';
  END IF;

  FOR r IN
    SELECT p.id, p.draft_answers, p.draft_flags, p.draft_times, p.focus_violations
    FROM public.class_test_participants p
    WHERE p.test_id = p_test_id
      AND p.submitted_at IS NULL
      AND p.draft_answers IS NOT NULL
      AND p.draft_answers <> '{}'::jsonb
  LOOP
    PERFORM public.class_test_submit(
      r.id, r.draft_answers, COALESCE(r.draft_flags, '{}'::jsonb),
      COALESCE(r.draft_times, '{}'::jsonb), COALESCE(r.focus_violations, 0)
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============ Proctored sessions ============
-- Students take the test through definer functions keyed by their participant id (proctor_join/_state/_paper/...),
-- so they never read this table. Only staff do: it holds the unlock code the proctor reads out in the room.
REVOKE ALL ON public.proctor_sessions FROM anon;
CREATE POLICY "Staff manage proctor sessions" ON public.proctor_sessions FOR ALL TO authenticated
  USING ((SELECT public.is_platform_staff())) WITH CHECK ((SELECT public.is_platform_staff()));

-- Any signed-in account could end any session. Students still trigger the final sweep through proctor_finalize_me,
-- which only calls this once the proctor has ended the session. Body unchanged from 20260812171131.
CREATE OR REPLACE FUNCTION public.proctor_finalize_session(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  IF p_session_id IS NULL THEN RETURN 0; END IF;

  IF NOT public.is_platform_staff() AND NOT EXISTS (
    SELECT 1 FROM public.proctor_sessions WHERE id = p_session_id AND status = 'finished'
  ) THEN
    RAISE EXCEPTION 'Only the proctor can end this session';
  END IF;

  UPDATE public.proctor_sessions
     SET status = 'finished',
         finished_at = COALESCE(finished_at, now())
   WHERE id = p_session_id;

  FOR r IN
    SELECT pp.id, pp.answers, pp.focus_violations
      FROM public.proctor_participants pp
     WHERE pp.session_id = p_session_id
       AND pp.submitted_at IS NULL
       AND pp.oath_accepted_at IS NOT NULL
  LOOP
    PERFORM * FROM public.proctor_submit(
      r.id,
      COALESCE(r.answers, '{}'::jsonb),
      COALESCE(r.focus_violations, 0)
    );
    v_count := v_count + 1;
  END LOOP;

  -- Results are automatic: unlock the full per-question breakdown unless the
  -- proctor already picked a review mode for this session.
  UPDATE public.proctor_sessions
     SET review_mode = 'explanations'
   WHERE id = p_session_id
     AND COALESCE(review_mode, 'off') = 'off';

  RETURN v_count;
END;
$function$;

-- Anyone could pass any student's account id and get back their participant ids, which unlock saving and
-- submitting that student's answers. Now it returns only the signed-in student's own sessions.
CREATE OR REPLACE FUNCTION public.proctor_my_history(p_student_account_id uuid, p_linked_student_id uuid)
RETURNS TABLE(
  participant_id uuid,
  session_id uuid,
  title text,
  review_mode text,
  submitted_at timestamptz,
  finished_at timestamptz,
  rw_correct integer,
  math_correct integer,
  rw_total integer,
  math_total integer,
  module_results jsonb
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_student_account_id IS NULL AND p_linked_student_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT pp.id,
         ps.id,
         ps.title,
         ps.review_mode,
         pp.submitted_at,
         ps.finished_at,
         pp.rw_correct,
         pp.math_correct,
         pp.rw_total,
         pp.math_total,
         pp.module_results
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  WHERE (
          (p_student_account_id IS NOT NULL AND pp.student_account_id = p_student_account_id)
       OR (p_linked_student_id IS NOT NULL AND pp.linked_student_id = p_linked_student_id)
        )
    AND (pp.student_account_id = public.request_student_id()
      OR (public.request_student_id() IS NOT NULL AND public.request_student_owns(pp.linked_student_id)))
    AND (pp.submitted_at IS NOT NULL OR ps.status = 'finished')
  ORDER BY COALESCE(pp.submitted_at, ps.finished_at, pp.created_at) DESC;
END;
$function$;

-- ============ Bluebook practice tests ============
-- Students start, answer and finish their own attempts (student token); admins manage all; staff read all.
CREATE POLICY "Admins manage bluebook attempts" ON public.bluebook_attempts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students and staff read bluebook attempts" ON public.bluebook_attempts FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Students start own bluebook attempts" ON public.bluebook_attempts FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students update own bluebook attempts" ON public.bluebook_attempts FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));

CREATE POLICY "Admins manage bluebook answers" ON public.bluebook_answers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students and staff read bluebook answers" ON public.bluebook_answers FOR SELECT
  USING ((SELECT public.is_platform_staff()) OR EXISTS (SELECT 1 FROM public.bluebook_attempts a
    WHERE a.id = attempt_id AND a.student_account_id = (SELECT public.request_student_id())));
CREATE POLICY "Students save own bluebook answers" ON public.bluebook_answers FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.bluebook_attempts a
    WHERE a.id = attempt_id AND a.student_account_id = (SELECT public.request_student_id())));
CREATE POLICY "Students update own bluebook answers" ON public.bluebook_answers FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.bluebook_attempts a
    WHERE a.id = attempt_id AND a.student_account_id = (SELECT public.request_student_id())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.bluebook_attempts a
    WHERE a.id = attempt_id AND a.student_account_id = (SELECT public.request_student_id())));

-- A classmate's profile (leaderboard) shows their practice test average and best, so it gets only those scores.
CREATE OR REPLACE FUNCTION public.student_bluebook_scores(_student_account_id uuid)
RETURNS TABLE(total_score integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.total_score FROM public.bluebook_attempts a
  WHERE a.student_account_id = _student_account_id AND a.status = 'completed'
    AND (public.request_student_id() IS NOT NULL OR public.is_platform_staff());
$$;
REVOKE ALL ON FUNCTION public.student_bluebook_scores(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_bluebook_scores(uuid) TO anon, authenticated;
