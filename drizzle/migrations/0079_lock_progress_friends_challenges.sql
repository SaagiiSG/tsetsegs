-- Review queues, progress, vocabulary, friendships, mini challenges and Flowers Challenge attempts were open to anyone
-- (USING/WITH CHECK true), and anyone can sign up, so "authenticated" alone proves nothing either.
-- Students reach the database as anon with their x-student-token (request_student_id()); teachers and admins
-- sign in with Supabase auth (has_role / is_platform_staff()). Signed-out pages get narrow definer functions.

-- Start from nothing on these tables: policies Lovable wrote straight to the database may not match the repo.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN
    ('student_review_queue', 'student_progress', 'student_vocabulary_progress', 'student_friendships', 'challenges',
     'challenge_participants', 'challenge_questions', 'challenge_attempts', 'flowers_challenge_attempts')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;
ALTER TABLE public.student_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_vocabulary_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowers_challenge_attempts ENABLE ROW LEVEL SECURITY;

-- ============ Review queue, question progress, vocabulary: the student's own rows ============
-- Teachers and admins read everyone's question progress (teacher student profile, prep classes, admin analytics).
CREATE POLICY "Students read own review queue" ON public.student_review_queue FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students add to own review queue" ON public.student_review_queue FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students update own review queue" ON public.student_review_queue FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins can manage review queue" ON public.student_review_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students and staff read progress" ON public.student_progress FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()) OR (SELECT public.is_platform_staff()));
CREATE POLICY "Students add own progress" ON public.student_progress FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students update own progress" ON public.student_progress FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins can manage student progress" ON public.student_progress FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students read own vocabulary progress" ON public.student_vocabulary_progress FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students add own vocabulary progress" ON public.student_vocabulary_progress FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students update own vocabulary progress" ON public.student_vocabulary_progress FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Admins can manage vocabulary progress" ON public.student_vocabulary_progress FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- The signed-out shared profile page (/student/share/:token) shows videos watched and the review count.
CREATE OR REPLACE FUNCTION public.shared_progress(_token text)
RETURNS TABLE(question_id uuid, video_watched boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.question_id, p.video_watched
  FROM public.student_accounts a JOIN public.student_progress p ON p.student_account_id = a.id
  WHERE _token IS NOT NULL AND a.share_token = _token;
$$;
CREATE OR REPLACE FUNCTION public.shared_review_queue(_token text)
RETURNS TABLE(id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id
  FROM public.student_accounts a JOIN public.student_review_queue q ON q.student_account_id = a.id
  WHERE _token IS NOT NULL AND a.share_token = _token;
$$;
REVOKE ALL ON FUNCTION public.shared_progress(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.shared_review_queue(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shared_progress(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.shared_review_queue(text) TO anon, authenticated;

-- ============ Friendships: only the two students in it ============
-- The requester sends a pending request; only the addressee accepts or declines it; either side removes it.
-- Ids are not updatable, so accepting can't rewrite who the friendship is between.
CREATE POLICY "Friends read own friendships" ON public.student_friendships FOR SELECT
  USING ((SELECT public.request_student_id()) IN (requester_id, addressee_id));
CREATE POLICY "Students send friend requests" ON public.student_friendships FOR INSERT
  WITH CHECK (requester_id = (SELECT public.request_student_id()) AND status = 'pending');
CREATE POLICY "Addressee answers friend requests" ON public.student_friendships FOR UPDATE
  USING (addressee_id = (SELECT public.request_student_id()) AND status = 'pending')
  WITH CHECK (addressee_id = (SELECT public.request_student_id()) AND status IN ('accepted', 'blocked'));
CREATE POLICY "Either friend removes friendship" ON public.student_friendships FOR DELETE
  USING ((SELECT public.request_student_id()) IN (requester_id, addressee_id));
REVOKE INSERT, UPDATE ON public.student_friendships FROM anon, authenticated;
GRANT INSERT (requester_id, addressee_id, status), UPDATE (status, responded_at)
  ON public.student_friendships TO anon, authenticated;

-- ============ Mini challenges ============
-- Reads of the challenge and its players stay open: both players' lobby, live scoreboard, win popup and HUD
-- follow these rows over realtime, which can't send the student token. They hold names and scores only.
-- Writes: the host creates, starts or cancels the challenge and invites accepted friends while it's in the lobby;
-- each player only marks themselves ready and records their own answers. Scores, places and the winner are set by
-- the database triggers, never the browser.
CREATE POLICY "Anyone can follow challenges" ON public.challenges FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Host creates challenge" ON public.challenges FOR INSERT
  WITH CHECK (host_account_id = (SELECT public.request_student_id()) AND status = 'lobby');
CREATE POLICY "Host starts or cancels challenge" ON public.challenges FOR UPDATE
  USING (host_account_id = (SELECT public.request_student_id()) AND status IN ('lobby', 'active'))
  WITH CHECK (host_account_id = (SELECT public.request_student_id()) AND status IN ('active', 'cancelled'));
CREATE POLICY "Host deletes challenge" ON public.challenges FOR DELETE
  USING (host_account_id = (SELECT public.request_student_id()));
REVOKE INSERT, UPDATE ON public.challenges FROM anon, authenticated;
GRANT INSERT (host_account_id, format, subject, question_set, target_value, duration_seconds, status, max_players),
  UPDATE (status, started_at) ON public.challenges TO anon, authenticated;

CREATE POLICY "Anyone can follow challenge players" ON public.challenge_participants FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Host adds self and friends" ON public.challenge_participants FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id
              AND c.host_account_id = (SELECT public.request_student_id()) AND c.status = 'lobby')
    AND (student_account_id = (SELECT public.request_student_id())
      OR (ready_at IS NULL AND EXISTS (
        SELECT 1 FROM public.student_friendships f
        WHERE f.status = 'accepted'
          AND (SELECT public.request_student_id()) IN (f.requester_id, f.addressee_id)
          AND challenge_participants.student_account_id IN (f.requester_id, f.addressee_id)))));
CREATE POLICY "Players mark themselves ready" ON public.challenge_participants FOR UPDATE
  USING (student_account_id = (SELECT public.request_student_id()))
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
REVOKE INSERT, UPDATE ON public.challenge_participants FROM anon, authenticated;
GRANT INSERT (challenge_id, student_account_id, display_name, ready_at), UPDATE (ready_at)
  ON public.challenge_participants TO anon, authenticated;

CREATE POLICY "Players read challenge questions" ON public.challenge_questions FOR SELECT
  USING (public.is_challenge_participant(challenge_id, (SELECT public.request_student_id())));
CREATE POLICY "Host adds challenge questions" ON public.challenge_questions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id
                        AND c.host_account_id = (SELECT public.request_student_id()) AND c.status = 'lobby'));

-- 10 is the most one answer can score (src/lib/challengeScoring.ts).
CREATE POLICY "Players read attempts in their challenge" ON public.challenge_attempts FOR SELECT
  USING (public.is_challenge_participant(challenge_id, (SELECT public.request_student_id())));
CREATE POLICY "Players record own attempts" ON public.challenge_attempts FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id())
    AND points_awarded BETWEEN 0 AND 10 AND time_ms >= 0
    AND public.is_challenge_participant(challenge_id, student_account_id)
    AND EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.status = 'active'));

-- Any player's screen ends a time sprint once its time is up (the host may be offline).
CREATE OR REPLACE FUNCTION public.challenge_finish_time_sprint(_challenge_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH done AS (
    UPDATE public.challenges c SET status = 'finished'
    WHERE c.id = _challenge_id AND c.status = 'active' AND c.format = 'time_sprint'
      AND c.started_at + make_interval(secs => COALESCE(c.duration_seconds, 0)) <= now()
      AND public.is_challenge_participant(c.id, public.request_student_id())
    RETURNING 1)
  SELECT EXISTS (SELECT 1 FROM done);
$$;
REVOKE ALL ON FUNCTION public.challenge_finish_time_sprint(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.challenge_finish_time_sprint(uuid) TO anon, authenticated;

-- ============ Flowers Challenge: own attempts; results only through flowers_challenge_submit() ============
-- The leaderboard reads everyone through flowers_challenge_leaderboard(), unchanged.
CREATE POLICY "Students read own flowers attempts" ON public.flowers_challenge_attempts FOR SELECT
  USING (student_account_id = (SELECT public.request_student_id()));
CREATE POLICY "Students start own flowers attempts" ON public.flowers_challenge_attempts FOR INSERT
  WITH CHECK (student_account_id = (SELECT public.request_student_id()));
REVOKE INSERT, UPDATE, DELETE ON public.flowers_challenge_attempts FROM anon, authenticated;
GRANT INSERT (student_account_id, challenge_key, question_ids, started_at) ON public.flowers_challenge_attempts
  TO anon, authenticated;

-- Copy of 20260807141105 with three guards: only the owner submits, only once (each submit pays points),
-- and only the attempt's own questions count.
CREATE OR REPLACE FUNCTION public.flowers_challenge_submit(
  p_attempt_id uuid, p_answers jsonb, p_duration_ms bigint)
RETURNS TABLE(correct_count integer, answered_count integer, goal_met boolean, results jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  v_correct integer := 0; v_answered integer := 0; v_results jsonb := '{}'::jsonb; v_goal boolean := false;
  v_badge_id uuid;
BEGIN
  SELECT * INTO a FROM public.flowers_challenge_attempts x
   WHERE x.id = p_attempt_id AND x.student_account_id = public.request_student_id()
   FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF a.submitted_at IS NOT NULL THEN
    RETURN QUERY SELECT a.correct_count, a.answered_count, a.goal_met, '{}'::jsonb;
    RETURN;
  END IF;

  WITH given AS (
    SELECT (kv.key)::uuid AS question_id, kv.value AS selected
    FROM jsonb_each_text(COALESCE(p_answers, '{}'::jsonb)) kv
    WHERE kv.value IS NOT NULL AND btrim(kv.value) <> '' AND a.question_ids ? kv.key
  ), graded AS (
    SELECT g.question_id,
           CASE
             WHEN COALESCE(q.question_type, '') LIKE '%fill%'
               THEN public.fill_answer_matches(g.selected, q.answer, q.alternate_answers)
             ELSE upper(btrim(g.selected)) = upper(btrim(COALESCE(q.answer, '')))
           END AS is_correct
    FROM given g JOIN public.questions q ON q.id = g.question_id
  )
  SELECT COUNT(*) FILTER (WHERE is_correct)::integer, COUNT(*)::integer,
         COALESCE(jsonb_object_agg(question_id::text, is_correct), '{}'::jsonb)
    INTO v_correct, v_answered, v_results
  FROM graded;

  v_goal := v_correct >= 20 AND COALESCE(p_duration_ms, 0) <= 1200000;

  UPDATE public.flowers_challenge_attempts x
     SET answers = COALESCE(p_answers, '{}'::jsonb),
         correct_count = v_correct,
         answered_count = v_answered,
         duration_ms = GREATEST(0, COALESCE(p_duration_ms, 0)),
         goal_met = v_goal,
         submitted_at = COALESCE(x.submitted_at, now())
   WHERE x.id = p_attempt_id;

  INSERT INTO public.point_transactions(student_account_id, points, category, metadata)
  VALUES (a.student_account_id, v_correct * 5, 'flowers_challenge',
          jsonb_build_object('challenge_key', a.challenge_key, 'attempt_id', p_attempt_id, 'goal_met', v_goal));

  IF v_goal THEN
    SELECT b.id INTO v_badge_id FROM public.badges b
     WHERE b.name = CASE WHEN a.challenge_key = '68' THEN 'Flowers Challenge: 68' ELSE 'Flowers Challenge: Hard 150' END
     LIMIT 1;
    IF v_badge_id IS NOT NULL THEN
      INSERT INTO public.student_badges(student_account_id, badge_id, progress, is_unlocked, unlocked_at)
      VALUES (a.student_account_id, v_badge_id, 100, true, now())
      ON CONFLICT (student_account_id, badge_id) DO NOTHING;
    END IF;
  END IF;

  RETURN QUERY SELECT v_correct, v_answered, v_goal, v_results;
END;
$$;
REVOKE ALL ON FUNCTION public.flowers_challenge_submit(uuid, jsonb, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flowers_challenge_submit(uuid, jsonb, bigint) TO anon, authenticated;

DO $$ BEGIN RAISE NOTICE '0079 applied: review queue, progress, vocabulary, friendships, challenges and flowers attempts locked'; END $$;

-- Challenge players stay publicly readable (the live screens can't send the student token), and names
-- used to fall back to the full phone number. Mask the ones already saved; the app no longer writes them.
UPDATE public.challenge_participants SET display_name = 'Student ••' || right(regexp_replace(display_name, '[^0-9]', '', 'g'), 2)
WHERE display_name ~ '^[+0-9 ()-]{6,}$';
