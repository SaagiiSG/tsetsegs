CREATE TABLE public.class_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  teacher_name text,
  title text NOT NULL DEFAULT '68 Hardest 22',
  question_set text NOT NULL DEFAULT '68',
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_seconds integer NOT NULL DEFAULT 1800,
  starts_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_tests TO anon;
GRANT ALL ON public.class_tests TO service_role;
ALTER TABLE public.class_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read class tests" ON public.class_tests FOR SELECT USING (true);
CREATE POLICY "Staff can create class tests" ON public.class_tests FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));
CREATE POLICY "Staff can update class tests" ON public.class_tests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));
CREATE POLICY "Staff can delete class tests" ON public.class_tests FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));

CREATE TABLE public.class_test_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.class_tests(id) ON DELETE CASCADE,
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Student',
  joined_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  correct_count integer NOT NULL DEFAULT 0,
  answered_count integer NOT NULL DEFAULT 0,
  total_time_ms bigint NOT NULL DEFAULT 0,
  focus_violations integer NOT NULL DEFAULT 0,
  UNIQUE (test_id, student_account_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_test_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_test_participants TO anon;
GRANT ALL ON public.class_test_participants TO service_role;
ALTER TABLE public.class_test_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read test participants" ON public.class_test_participants FOR SELECT USING (true);
CREATE POLICY "Public can join tests" ON public.class_test_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update test participants" ON public.class_test_participants FOR UPDATE USING (true);
CREATE POLICY "Staff can delete test participants" ON public.class_test_participants FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));

CREATE TABLE public.class_test_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.class_tests(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES public.class_test_participants(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  selected_answer text,
  is_correct boolean NOT NULL DEFAULT false,
  time_ms integer NOT NULL DEFAULT 0,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, question_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_test_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_test_answers TO anon;
GRANT ALL ON public.class_test_answers TO service_role;
ALTER TABLE public.class_test_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read test answers" ON public.class_test_answers FOR SELECT USING (true);
CREATE POLICY "Public can insert test answers" ON public.class_test_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update test answers" ON public.class_test_answers FOR UPDATE USING (true);
CREATE POLICY "Staff can delete test answers" ON public.class_test_answers FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));

CREATE INDEX idx_class_tests_batch_status ON public.class_tests(batch_id, status);
CREATE INDEX idx_class_test_participants_test ON public.class_test_participants(test_id);
CREATE INDEX idx_class_test_answers_test ON public.class_test_answers(test_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.class_tests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_test_participants;

CREATE OR REPLACE FUNCTION public.pick_hardest_questions(p_question_set text DEFAULT '68', p_limit integer DEFAULT 22, p_min_attempts integer DEFAULT 5)
RETURNS TABLE(question_id uuid, attempts bigint, accuracy numeric, avg_seconds numeric, difficulty_score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH stats AS (
    SELECT q.id AS qid,
           count(sa.id) AS attempts,
           avg(CASE WHEN sa.is_correct THEN 1.0 ELSE 0.0 END) AS accuracy,
           avg(COALESCE(sa.time_spent_seconds, 0)) AS avg_seconds
    FROM public.questions q
    JOIN public.student_attempts sa ON sa.question_id = q.id
    WHERE q.question_set = p_question_set
      AND q.is_active = true
    GROUP BY q.id
    HAVING count(sa.id) >= p_min_attempts
  ), bounds AS (
    SELECT min(avg_seconds) AS min_t, max(avg_seconds) AS max_t FROM stats
  )
  SELECT s.qid,
         s.attempts,
         round(s.accuracy::numeric, 4),
         round(s.avg_seconds::numeric, 1),
         round((0.6 * (1 - s.accuracy) + 0.4 * (CASE WHEN b.max_t > b.min_t THEN (s.avg_seconds - b.min_t) / (b.max_t - b.min_t) ELSE 0 END))::numeric, 4) AS difficulty_score
  FROM stats s CROSS JOIN bounds b
  ORDER BY difficulty_score DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.pick_hardest_questions(text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pick_hardest_questions(text, integer, integer) TO authenticated, service_role;