-- Live class game: the server checks answers (Saagii's pick after the 31 Oct security sweep, task 4b item C). Part 1 of 2.
-- DEPLOY ORDER: apply 0114, publish the page (src/pages/LiveSession.tsx, LiveQuestionControl.tsx), then add the pending removals file
--   (docs/superpowers/specs/2026-10-30-live-demo/live-game-removals.sql.pending) as a new migration.
--   0114 only adds, so the old page keeps working on it. The removals file removes what the old page needs (the answer key in the
--   phone's question list, and the phone's direct answer and points writes).
-- live_session_answer() grades one answer, records it and adds the points (the page did all three itself before),
-- with LiveSession.tsx's old points formula and the page's own time taken, as before. live_session_reveal() hands a
-- player the right answer once the question's time is up, and seeing it ends that player's turn on the question.
-- The teacher's Start and Next stamp when each question began, so the server knows when that is.
SET lock_timeout = '3s';

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

-- The right answer to the question on screen, once its time is up (when the page shows "Time's up!"). Seeing it ends
-- the player's turn: a player who hasn't answered gets a 0-point "no answer" row (answer ''), so a later answer is
-- refused like a second one (otherwise a phone could see the answer, refresh and answer inside the grace above).
-- Nothing for other questions, other games' players, finished games, or games started before this migration.
CREATE OR REPLACE FUNCTION public.live_session_reveal(_join_code text, _participant uuid, _question uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.live_sessions;
  pos integer;
  right_answer text;
BEGIN
  SELECT * INTO s FROM public.live_sessions WHERE join_code = upper(_join_code) AND status = 'active';
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

NOTIFY pgrst, 'reload schema';
