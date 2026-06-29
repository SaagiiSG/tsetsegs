
-- Drop the auth.uid()-based policies that don't work for the custom student auth
DROP POLICY IF EXISTS "Friends visible to both sides" ON public.student_friendships;
DROP POLICY IF EXISTS "Send friend request as self" ON public.student_friendships;
DROP POLICY IF EXISTS "Respond to friend request" ON public.student_friendships;
DROP POLICY IF EXISTS "Remove own friendship" ON public.student_friendships;

DROP POLICY IF EXISTS "Host or participants see challenge" ON public.challenges;
DROP POLICY IF EXISTS "Host creates challenge" ON public.challenges;
DROP POLICY IF EXISTS "Host or participants update challenge" ON public.challenges;
DROP POLICY IF EXISTS "Host cancels challenge" ON public.challenges;

DROP POLICY IF EXISTS "Participants see siblings" ON public.challenge_participants;
DROP POLICY IF EXISTS "Join challenge as self" ON public.challenge_participants;
DROP POLICY IF EXISTS "Update own participant row" ON public.challenge_participants;
DROP POLICY IF EXISTS "Leave own participant row" ON public.challenge_participants;

DROP POLICY IF EXISTS "Participants read challenge questions" ON public.challenge_questions;
DROP POLICY IF EXISTS "Host inserts challenge questions" ON public.challenge_questions;

DROP POLICY IF EXISTS "Participants read attempts in their challenge" ON public.challenge_attempts;
DROP POLICY IF EXISTS "Player inserts own attempts" ON public.challenge_attempts;

-- Grant to anon (matching existing student-table pattern)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_friendships TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_attempts TO anon;

-- Permissive policies (app enforces ownership via student_account_id in queries)
CREATE POLICY "Public read friendships" ON public.student_friendships FOR SELECT USING (true);
CREATE POLICY "Public insert friendships" ON public.student_friendships FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update friendships" ON public.student_friendships FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete friendships" ON public.student_friendships FOR DELETE USING (true);

CREATE POLICY "Public read challenges" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Public insert challenges" ON public.challenges FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update challenges" ON public.challenges FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete challenges" ON public.challenges FOR DELETE USING (true);

CREATE POLICY "Public read participants" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Public insert participants" ON public.challenge_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update participants" ON public.challenge_participants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete participants" ON public.challenge_participants FOR DELETE USING (true);

CREATE POLICY "Public read challenge questions" ON public.challenge_questions FOR SELECT USING (true);
CREATE POLICY "Public insert challenge questions" ON public.challenge_questions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read challenge attempts" ON public.challenge_attempts FOR SELECT USING (true);
CREATE POLICY "Public insert challenge attempts" ON public.challenge_attempts FOR INSERT WITH CHECK (true);
