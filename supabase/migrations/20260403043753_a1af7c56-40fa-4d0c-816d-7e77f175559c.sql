
-- Live Sessions table
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_name text NOT NULL,
  join_code text NOT NULL UNIQUE,
  question_set text NOT NULL,
  time_per_question integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'waiting',
  current_question_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sessions" ON public.live_sessions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can create sessions" ON public.live_sessions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update sessions" ON public.live_sessions
  FOR UPDATE TO authenticated USING (true);

-- Live Session Questions table
CREATE TABLE public.live_session_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index integer NOT NULL
);

ALTER TABLE public.live_session_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view session questions" ON public.live_session_questions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert session questions" ON public.live_session_questions
  FOR INSERT TO authenticated WITH CHECK (true);

-- Live Session Participants table
CREATE TABLE public.live_session_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  player_name text NOT NULL,
  phone_number text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  joined_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants" ON public.live_session_participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join sessions" ON public.live_session_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update participants" ON public.live_session_participants
  FOR UPDATE USING (true);

-- Live Session Answers table
CREATE TABLE public.live_session_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.live_session_participants(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  time_taken_ms integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.live_session_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers" ON public.live_session_answers
  FOR SELECT USING (true);

CREATE POLICY "Anyone can submit answers" ON public.live_session_answers
  FOR INSERT WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_answers;
