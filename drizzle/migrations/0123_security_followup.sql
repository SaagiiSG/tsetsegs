-- Follow-up to 0121/0122: three gaps the security check of 5e429016 found. Safe to run twice.
SET lock_timeout = '3s';

-- 1. A student can't point their account at another student. 0121 shows a main student the attendance and homework
--    of their linked record (request_student_roster_ids) and 0041 lets them edit that record, while the roster is
--    readable, so PATCHing linked_student_id to any id opened another student's data. 0024's guard, with
--    linked_student_id pinned on update and cleared on insert (auto_link_student_account fires after this trigger
--    and still links a new account by phone). Staff, the service role and definer functions aren't guarded.
--    cohort is pinned too: it picks the student's leaderboard, sprint group and question bank, and only staff and
--    the definer sync triggers (20260912013700, which fire after this one) set it.
CREATE OR REPLACE FUNCTION public.guard_student_account()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE guarded boolean := current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff();
BEGIN
  IF guarded THEN
    IF TG_OP = 'INSERT' THEN
      NEW.password_hash := NULL; NEW.password_set_at := NULL;
      NEW.registered_device_id := NULL; NEW.device_registered_at := NULL; NEW.device_fingerprint := NULL;
      NEW.is_blocked := false; NEW.blocked_reason := NULL; NEW.blocked_at := NULL;
      NEW.is_dev_account := false; NEW.auth_user_id := NULL; NEW.is_ghost := false;
      NEW.linked_student_id := NULL;
    ELSE
      NEW.password_hash := OLD.password_hash; NEW.password_set_at := OLD.password_set_at;
      NEW.registered_device_id := OLD.registered_device_id; NEW.device_registered_at := OLD.device_registered_at;
      NEW.device_fingerprint := OLD.device_fingerprint;
      NEW.is_blocked := OLD.is_blocked; NEW.blocked_reason := OLD.blocked_reason; NEW.blocked_at := OLD.blocked_at;
      NEW.is_dev_account := OLD.is_dev_account; NEW.auth_user_id := OLD.auth_user_id; NEW.is_ghost := OLD.is_ghost;
      NEW.phone_number := OLD.phone_number; NEW.is_active := OLD.is_active;
      NEW.share_token := OLD.share_token; NEW.share_token_created_at := OLD.share_token_created_at;
      NEW.last_login := OLD.last_login; NEW.rank_unlocked_at := OLD.rank_unlocked_at;
      NEW.linked_student_id := OLD.linked_student_id;
      NEW.cohort := OLD.cohort;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 2. A game a teacher never finished (closed tab, or "New session") keeps a status other than 'finished' forever, so
--    0121's rule left its players, points and answers public for good. Players now see a game only in the day after
--    it was created, while it runs or for a day after it ends. Staff still see every game.
DROP POLICY IF EXISTS "Players see open games, staff see all" ON public.live_sessions;
CREATE POLICY "Players see open games, staff see all" ON public.live_sessions
  FOR SELECT TO anon, authenticated
  USING ((created_at > now() - interval '1 day' AND (status <> 'finished' OR finished_at > now() - interval '1 day'))
    OR (SELECT public.is_platform_staff()));

-- The scoreboard and answers rules (0121) read this, so they follow the same window.
CREATE OR REPLACE FUNCTION public.live_session_open(_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = _session
    AND s.created_at > now() - interval '1 day'
    AND (s.status <> 'finished' OR s.finished_at > now() - interval '1 day'));
$$;
REVOKE EXECUTE ON FUNCTION public.live_session_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_open(uuid) TO anon, authenticated, service_role;

-- The phone's question list (0116): running games only, and now only games from the last day.
CREATE OR REPLACE FUNCTION public.live_session_question_list(_join_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
    'multiple_choice_options', q.multiple_choice_options, 'order_index', lq.order_index)
    ORDER BY lq.order_index), '[]'::jsonb)
  FROM live_sessions s
  JOIN live_session_questions lq ON lq.session_id = s.id
  JOIN questions q ON q.id = lq.question_id
  WHERE s.join_code = upper(_join_code) AND s.status <> 'finished' AND s.created_at > now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.live_session_question_list(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_question_list(text) TO anon, authenticated;

-- Players' writes use the same window (live_session_open), so a stale game can't be joined or answered either. The
-- join rule is 0082's with that check added; answer and reveal are 0114's (the player's phone calls both) with it
-- added to the game lookup. The host's Start, Next and finish go through the staff rules and aren't affected.
DROP POLICY IF EXISTS "Players join open games" ON public.live_session_participants;
CREATE POLICY "Players join open games" ON public.live_session_participants FOR INSERT
  WITH CHECK (total_points = 0
    AND EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.status <> 'finished')
    AND public.live_session_open(session_id));

CREATE OR REPLACE FUNCTION public.live_session_answer(_join_code text, _participant uuid, _question uuid, _choice text, _time_taken_ms integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.live_sessions;
  pos integer;
  correct boolean;
  taken integer := greatest(coalesce(_time_taken_ms, 0), 0);
  total_ms integer;
  pts integer;
BEGIN
  SELECT * INTO s FROM public.live_sessions WHERE join_code = upper(_join_code) AND status = 'active'
    AND public.live_session_open(id);
  IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
  -- One answer at a time per player, so two quick taps can't both pass the once-only check.
  PERFORM 1 FROM public.live_session_participants WHERE id = _participant AND session_id = s.id FOR UPDATE;
  IF NOT public.live_answer_allowed(s.id, _participant, _question) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT p.pos INTO pos FROM (SELECT question_id, row_number() OVER (ORDER BY order_index, id) - 1 AS pos
    FROM public.live_session_questions WHERE session_id = s.id) p WHERE p.question_id = _question;
  IF pos IS DISTINCT FROM s.current_question_index
     OR now() >= s.question_started_at + make_interval(secs => s.time_per_question + 10) THEN
    RAISE EXCEPTION 'Time is up' USING ERRCODE = '42501';
  END IF;

  SELECT q.answer = _choice INTO correct FROM public.questions q WHERE q.id = _question;
  correct := coalesce(correct, false);
  -- LiveSession.tsx's formula in the same double-precision maths: max(100, Math.round(1000 * remaining / total)).
  total_ms := s.time_per_question * 1000;
  pts := CASE WHEN correct
    THEN greatest(100, floor(1000 * (greatest(0, total_ms - taken)::float8 / nullif(total_ms, 0)) + 0.5)::integer)
    ELSE 0 END;

  INSERT INTO public.live_session_answers (session_id, participant_id, question_id, answer, is_correct, time_taken_ms, points_earned)
  VALUES (s.id, _participant, _question, _choice, correct, taken, pts);
  UPDATE public.live_session_participants SET total_points = total_points + pts WHERE id = _participant;
  RETURN jsonb_build_object('is_correct', correct, 'points', pts);
END $$;
REVOKE ALL ON FUNCTION public.live_session_answer(text, uuid, uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_answer(text, uuid, uuid, text, integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.live_session_reveal(_join_code text, _participant uuid, _question uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.live_sessions;
  pos integer;
  right_answer text;
BEGIN
  SELECT * INTO s FROM public.live_sessions WHERE join_code = upper(_join_code) AND status = 'active'
    AND public.live_session_open(id);
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- The same per-player lock as live_session_answer(), so an answer and a reveal can't both get in.
  PERFORM 1 FROM public.live_session_participants WHERE id = _participant AND session_id = s.id FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT p.pos INTO pos FROM (SELECT question_id, row_number() OVER (ORDER BY order_index, id) - 1 AS pos
    FROM public.live_session_questions WHERE session_id = s.id) p WHERE p.question_id = _question;
  IF pos IS DISTINCT FROM s.current_question_index OR s.question_started_at IS NULL
     OR now() < s.question_started_at + make_interval(secs => s.time_per_question) THEN
    RETURN NULL;
  END IF;

  SELECT q.answer INTO right_answer FROM public.questions q WHERE q.id = _question;
  INSERT INTO public.live_session_answers (session_id, participant_id, question_id, answer, is_correct, time_taken_ms, points_earned)
  SELECT s.id, _participant, _question, '', false, 0, 0
  WHERE NOT EXISTS (SELECT 1 FROM public.live_session_answers a WHERE a.participant_id = _participant AND a.question_id = _question);
  RETURN right_answer;
END $$;
REVOKE ALL ON FUNCTION public.live_session_reveal(text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_reveal(text, uuid, uuid) TO anon, authenticated;

-- 3. Teachers make parent report links but had no rule to read them back (only admins could, through "Admins can
--    manage closing report tokens"), so a generated link never showed. Staff = admins and main teachers (0024).
DROP POLICY IF EXISTS "Staff read closing report tokens" ON public.closing_report_tokens;
CREATE POLICY "Staff read closing report tokens" ON public.closing_report_tokens
  FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()));
