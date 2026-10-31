-- Saagii's picks after the 31 Oct security sweep (task 4b report, items C and D).
-- C. "Server checks answers": the main-app live game (src/pages/LiveSession.tsx) no longer gets the answer key.
--    live_session_answer() grades one answer, records it and adds the points (the page did all three itself before),
--    with LiveSession.tsx's old points formula and the page's own time taken, as before. live_session_reveal() hands
--    back the right answer once the question's time is up. The teacher's Start and Next stamp when each question
--    began, so the server knows when that is.
-- D. "Block logged-in non-staff now": signed-out /register (the QR and code flows) inserts students exactly as
--    before; a signed-in caller must be platform staff (admin or teacher), which every staff page that adds
--    students already is. Demo and other signed-in non-staff accounts are refused.
SET lock_timeout = '3s';

-- ============ C. Live class game ============
ALTER TABLE public.live_sessions ADD COLUMN IF NOT EXISTS question_started_at timestamptz;

-- Set by the server only: on Start (status becomes active) and on Next (current_question_index changes).
CREATE OR REPLACE FUNCTION public.live_session_stamp_question()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.question_started_at := CASE WHEN TG_OP = 'UPDATE' THEN OLD.question_started_at END;
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active'
      OR NEW.current_question_index IS DISTINCT FROM OLD.current_question_index) THEN
    NEW.question_started_at := now();
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.live_session_stamp_question() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS live_session_stamp_question ON public.live_sessions;
CREATE TRIGGER live_session_stamp_question BEFORE INSERT OR UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.live_session_stamp_question();

-- 0058's list, without the answer.
CREATE OR REPLACE FUNCTION public.live_session_question_list(_join_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
    'multiple_choice_options', q.multiple_choice_options, 'order_index', lq.order_index)
    ORDER BY lq.order_index), '[]'::jsonb)
  FROM live_sessions s
  JOIN live_session_questions lq ON lq.session_id = s.id
  JOIN questions q ON q.id = lq.question_id
  WHERE s.join_code = upper(_join_code) AND s.status <> 'finished';
$$;
REVOKE ALL ON FUNCTION public.live_session_question_list(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_question_list(text) TO anon, authenticated;

-- One answer from a player's phone. Same checks as 0082's insert rule (a running game, the player and question
-- belong to it, one answer per question), plus: only the question on screen now, until 10 s after its time is up
-- (a phone hears about each question a moment after the server). Games started before this migration have no
-- start time; their answers are taken as before.
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
  SELECT * INTO s FROM public.live_sessions WHERE join_code = upper(_join_code) AND status = 'active';
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

-- The right answer to the question on screen, once its time is up (when the page shows "Time's up!"). Nothing for
-- other questions or finished games: the phone never shows those, and game codes are public.
CREATE OR REPLACE FUNCTION public.live_session_reveal(_join_code text, _question uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.answer
  FROM public.live_sessions s
  JOIN LATERAL (SELECT lq.question_id, row_number() OVER (ORDER BY lq.order_index, lq.id) - 1 AS pos
                FROM public.live_session_questions lq WHERE lq.session_id = s.id) p ON p.question_id = _question
  JOIN public.questions q ON q.id = _question
  WHERE s.join_code = upper(_join_code) AND s.status = 'active'
    AND p.pos = s.current_question_index
    AND now() >= s.question_started_at + make_interval(secs => s.time_per_question);
$$;
REVOKE ALL ON FUNCTION public.live_session_reveal(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_reveal(text, uuid) TO anon, authenticated;

-- Phones now write answers and points only through live_session_answer().
DROP POLICY IF EXISTS "Players answer once while the game runs" ON public.live_session_answers;
DROP POLICY IF EXISTS "Players add points they scored" ON public.live_session_participants;

-- ============ D. Student sign-ups ============
-- Same check as before (20260321142649), split by who is asking.
DROP POLICY IF EXISTS "Public can insert students via registration" ON public.students;
CREATE POLICY "Public can insert students via registration" ON public.students FOR INSERT TO anon
  WITH CHECK ((is_review_student = true AND batch_id IS NULL) OR batch_id IS NOT NULL);
DROP POLICY IF EXISTS "Staff can insert students via registration" ON public.students;
CREATE POLICY "Staff can insert students via registration" ON public.students FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_platform_staff())
    AND ((is_review_student = true AND batch_id IS NULL) OR batch_id IS NOT NULL));

NOTIFY pgrst, 'reload schema';
