
-- ============================================================
-- SAT Mini Challenges
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.friendship_status AS ENUM ('pending','accepted','blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.challenge_format AS ENUM ('first_to_points','first_to_correct','time_sprint','fixed_set');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.challenge_status AS ENUM ('lobby','active','finished','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- 1. student_friendships
-- ------------------------------------------------------------
CREATE TABLE public.student_friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  status public.friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT student_friendships_no_self CHECK (requester_id <> addressee_id)
);
CREATE UNIQUE INDEX student_friendships_pair_idx
  ON public.student_friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX student_friendships_addressee_idx ON public.student_friendships (addressee_id, status);
CREATE INDEX student_friendships_requester_idx ON public.student_friendships (requester_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_friendships TO authenticated;
GRANT ALL ON public.student_friendships TO service_role;
ALTER TABLE public.student_friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Friends visible to both sides" ON public.student_friendships FOR SELECT TO authenticated
  USING (requester_id = public.current_student_account_id() OR addressee_id = public.current_student_account_id());
CREATE POLICY "Send friend request as self" ON public.student_friendships FOR INSERT TO authenticated
  WITH CHECK (requester_id = public.current_student_account_id());
CREATE POLICY "Respond to friend request" ON public.student_friendships FOR UPDATE TO authenticated
  USING (addressee_id = public.current_student_account_id() OR requester_id = public.current_student_account_id())
  WITH CHECK (addressee_id = public.current_student_account_id() OR requester_id = public.current_student_account_id());
CREATE POLICY "Remove own friendship" ON public.student_friendships FOR DELETE TO authenticated
  USING (addressee_id = public.current_student_account_id() OR requester_id = public.current_student_account_id());

-- ------------------------------------------------------------
-- 2. challenges
-- ------------------------------------------------------------
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  format public.challenge_format NOT NULL,
  subject text NOT NULL CHECK (subject IN ('math','english')),
  question_set text NOT NULL,
  target_value integer,
  duration_seconds integer,
  status public.challenge_status NOT NULL DEFAULT 'lobby',
  started_at timestamptz,
  finished_at timestamptz,
  winner_account_id uuid REFERENCES public.student_accounts(id) ON DELETE SET NULL,
  max_players integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenges_host_idx ON public.challenges (host_account_id, created_at DESC);
CREATE INDEX challenges_status_idx ON public.challenges (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. challenge_participants
-- ------------------------------------------------------------
CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  display_name text,
  joined_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  score integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  attempted_count integer NOT NULL DEFAULT 0,
  total_time_ms bigint NOT NULL DEFAULT 0,
  finished_at timestamptz,
  place integer,
  UNIQUE (challenge_id, student_account_id)
);
CREATE INDEX challenge_participants_account_idx ON public.challenge_participants (student_account_id);
CREATE INDEX challenge_participants_challenge_idx ON public.challenge_participants (challenge_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Helper (now that the table exists)
CREATE OR REPLACE FUNCTION public.is_challenge_participant(_challenge_id uuid, _account_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = _challenge_id AND student_account_id = _account_id
  );
$$;

CREATE POLICY "Participants see siblings" ON public.challenge_participants FOR SELECT TO authenticated
  USING (
    student_account_id = public.current_student_account_id()
    OR public.is_challenge_participant(challenge_id, public.current_student_account_id())
  );
CREATE POLICY "Join challenge as self" ON public.challenge_participants FOR INSERT TO authenticated
  WITH CHECK (student_account_id = public.current_student_account_id());
CREATE POLICY "Update own participant row" ON public.challenge_participants FOR UPDATE TO authenticated
  USING (student_account_id = public.current_student_account_id())
  WITH CHECK (student_account_id = public.current_student_account_id());
CREATE POLICY "Leave own participant row" ON public.challenge_participants FOR DELETE TO authenticated
  USING (student_account_id = public.current_student_account_id());

CREATE POLICY "Host or participants see challenge" ON public.challenges FOR SELECT TO authenticated
  USING (
    host_account_id = public.current_student_account_id()
    OR public.is_challenge_participant(id, public.current_student_account_id())
  );
CREATE POLICY "Host creates challenge" ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (host_account_id = public.current_student_account_id());
CREATE POLICY "Host or participants update challenge" ON public.challenges FOR UPDATE TO authenticated
  USING (
    host_account_id = public.current_student_account_id()
    OR public.is_challenge_participant(id, public.current_student_account_id())
  )
  WITH CHECK (
    host_account_id = public.current_student_account_id()
    OR public.is_challenge_participant(id, public.current_student_account_id())
  );
CREATE POLICY "Host cancels challenge" ON public.challenges FOR DELETE TO authenticated
  USING (host_account_id = public.current_student_account_id());

-- ------------------------------------------------------------
-- 4. challenge_questions
-- ------------------------------------------------------------
CREATE TABLE public.challenge_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  UNIQUE (challenge_id, order_index)
);
CREATE INDEX challenge_questions_challenge_idx ON public.challenge_questions (challenge_id, order_index);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_questions TO authenticated;
GRANT ALL ON public.challenge_questions TO service_role;
ALTER TABLE public.challenge_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read challenge questions" ON public.challenge_questions FOR SELECT TO authenticated
  USING (public.is_challenge_participant(challenge_id, public.current_student_account_id()));
CREATE POLICY "Host inserts challenge questions" ON public.challenge_questions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.host_account_id = public.current_student_account_id())
  );

-- ------------------------------------------------------------
-- 5. challenge_attempts
-- ------------------------------------------------------------
CREATE TABLE public.challenge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  time_ms integer NOT NULL DEFAULT 0,
  points_awarded integer NOT NULL DEFAULT 0,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenge_attempts_challenge_idx ON public.challenge_attempts (challenge_id, attempted_at);
CREATE INDEX challenge_attempts_player_idx ON public.challenge_attempts (challenge_id, student_account_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_attempts TO authenticated;
GRANT ALL ON public.challenge_attempts TO service_role;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read attempts in their challenge" ON public.challenge_attempts FOR SELECT TO authenticated
  USING (public.is_challenge_participant(challenge_id, public.current_student_account_id()));
CREATE POLICY "Player inserts own attempts" ON public.challenge_attempts FOR INSERT TO authenticated
  WITH CHECK (student_account_id = public.current_student_account_id());

-- ------------------------------------------------------------
-- 6. Scoring + win detection trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_challenge_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
  p record;
  win_reached boolean := false;
  new_finished boolean := false;
  all_finished boolean := false;
  pool_size integer;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = NEW.challenge_id;
  IF c.id IS NULL OR c.status <> 'active' THEN
    RETURN NEW;
  END IF;

  UPDATE public.challenge_participants
    SET correct_count    = correct_count + CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        attempted_count  = attempted_count + 1,
        score            = score + COALESCE(NEW.points_awarded, 0),
        total_time_ms    = total_time_ms + COALESCE(NEW.time_ms, 0)
    WHERE challenge_id = NEW.challenge_id AND student_account_id = NEW.student_account_id
    RETURNING * INTO p;

  IF p.id IS NULL THEN RETURN NEW; END IF;

  IF c.format = 'first_to_points' AND p.score >= COALESCE(c.target_value, 0) THEN
    win_reached := true;
  ELSIF c.format = 'first_to_correct' AND p.correct_count >= COALESCE(c.target_value, 0) THEN
    win_reached := true;
  ELSIF c.format = 'fixed_set' THEN
    SELECT count(*) INTO pool_size FROM public.challenge_questions WHERE challenge_id = c.id;
    IF p.attempted_count >= COALESCE(c.target_value, pool_size) THEN
      UPDATE public.challenge_participants SET finished_at = COALESCE(finished_at, now()) WHERE id = p.id;
      new_finished := true;
    END IF;
  END IF;

  IF win_reached THEN
    UPDATE public.challenge_participants SET finished_at = COALESCE(finished_at, now()), place = 1 WHERE id = p.id;
    WITH ranked AS (
      SELECT id, row_number() OVER (
        ORDER BY (id = p.id) DESC, score DESC, correct_count DESC, total_time_ms ASC
      ) AS rn
      FROM public.challenge_participants WHERE challenge_id = c.id
    )
    UPDATE public.challenge_participants cp
      SET place = ranked.rn, finished_at = COALESCE(cp.finished_at, now())
      FROM ranked WHERE cp.id = ranked.id;
    UPDATE public.challenges SET status = 'finished', finished_at = now(), winner_account_id = p.student_account_id WHERE id = c.id;
  ELSIF c.format = 'fixed_set' AND new_finished THEN
    SELECT NOT EXISTS (SELECT 1 FROM public.challenge_participants WHERE challenge_id = c.id AND finished_at IS NULL) INTO all_finished;
    IF all_finished THEN
      WITH ranked AS (
        SELECT id, row_number() OVER (ORDER BY total_time_ms ASC, correct_count DESC) AS rn
        FROM public.challenge_participants WHERE challenge_id = c.id
      )
      UPDATE public.challenge_participants cp SET place = ranked.rn FROM ranked WHERE cp.id = ranked.id;
      UPDATE public.challenges
        SET status = 'finished', finished_at = now(),
            winner_account_id = (SELECT student_account_id FROM public.challenge_participants WHERE challenge_id = c.id ORDER BY total_time_ms ASC LIMIT 1)
        WHERE id = c.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER challenge_attempts_process
  AFTER INSERT ON public.challenge_attempts
  FOR EACH ROW EXECUTE FUNCTION public.process_challenge_attempt();

-- Finalize challenge when status flips to finished (time sprint or host stop)
CREATE OR REPLACE FUNCTION public.finalize_challenge_on_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'finished' AND (OLD.status IS DISTINCT FROM 'finished') THEN
    WITH ranked AS (
      SELECT id, row_number() OVER (ORDER BY score DESC, correct_count DESC, total_time_ms ASC) AS rn
      FROM public.challenge_participants WHERE challenge_id = NEW.id
    )
    UPDATE public.challenge_participants cp
      SET place = COALESCE(cp.place, ranked.rn), finished_at = COALESCE(cp.finished_at, now())
      FROM ranked WHERE cp.id = ranked.id;

    IF NEW.winner_account_id IS NULL THEN
      NEW.winner_account_id := (
        SELECT student_account_id FROM public.challenge_participants
        WHERE challenge_id = NEW.id ORDER BY score DESC, correct_count DESC, total_time_ms ASC LIMIT 1
      );
    END IF;
    IF NEW.finished_at IS NULL THEN NEW.finished_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER challenges_finalize
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.finalize_challenge_on_status();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_friendships;
ALTER TABLE public.challenges REPLICA IDENTITY FULL;
ALTER TABLE public.challenge_participants REPLICA IDENTITY FULL;
ALTER TABLE public.challenge_attempts REPLICA IDENTITY FULL;
ALTER TABLE public.student_friendships REPLICA IDENTITY FULL;

-- Feature flag
INSERT INTO public.feature_flags (feature_key, is_enabled, description)
VALUES ('mini_challenges', false, 'SAT Mini Challenges: friends + 1v1/group races')
ON CONFLICT (feature_key) DO NOTHING;
