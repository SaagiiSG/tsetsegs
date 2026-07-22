
-- 1. RPC to let teachers rename their own batches (nickname only)
CREATE OR REPLACE FUNCTION public.set_batch_nickname(p_batch_id uuid, p_nickname text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teacher_name text;
  v_batch_teacher text;
  v_clean_nickname text;
BEGIN
  v_clean_nickname := NULLIF(btrim(p_nickname), '');

  IF has_role(auth.uid(), 'admin'::app_role) THEN
    UPDATE public.batches SET nickname = v_clean_nickname WHERE id = p_batch_id;
    RETURN;
  END IF;

  IF has_role(auth.uid(), 'teacher'::app_role) THEN
    SELECT t.name INTO v_teacher_name
    FROM public.teachers t
    WHERE t.username = get_current_teacher_username();

    IF v_teacher_name IS NULL THEN
      RAISE EXCEPTION 'Teacher profile not found';
    END IF;

    SELECT teacher INTO v_batch_teacher FROM public.batches WHERE id = p_batch_id;
    IF v_batch_teacher IS NULL THEN
      RAISE EXCEPTION 'Batch not found';
    END IF;

    IF v_batch_teacher ILIKE '%' || v_teacher_name || '%' THEN
      UPDATE public.batches SET nickname = v_clean_nickname WHERE id = p_batch_id;
      RETURN;
    ELSE
      RAISE EXCEPTION 'Not authorized to rename this class';
    END IF;
  END IF;

  RAISE EXCEPTION 'Not authorized';
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_batch_nickname(uuid, text) TO authenticated;

-- 2. Speed sessions history
CREATE TABLE public.speed_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT 'math',
  category_id uuid REFERENCES public.question_categories(id) ON DELETE SET NULL,
  duration_seconds integer NOT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  correct_count integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_speed_sessions_student ON public.speed_sessions(student_account_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.speed_sessions TO authenticated;
GRANT ALL ON public.speed_sessions TO service_role;

ALTER TABLE public.speed_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own speed sessions"
  ON public.speed_sessions FOR SELECT
  USING (student_account_id = current_student_account_id());

CREATE POLICY "Students insert own speed sessions"
  ON public.speed_sessions FOR INSERT
  WITH CHECK (student_account_id = current_student_account_id());

CREATE POLICY "Students update own speed sessions"
  ON public.speed_sessions FOR UPDATE
  USING (student_account_id = current_student_account_id())
  WITH CHECK (student_account_id = current_student_account_id());

CREATE POLICY "Staff view all speed sessions"
  ON public.speed_sessions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

-- 3. Speed session items
CREATE TABLE public.speed_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.speed_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  answer_submitted text,
  is_correct boolean NOT NULL DEFAULT false,
  time_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_speed_session_items_session ON public.speed_session_items(session_id, order_index);

GRANT SELECT, INSERT ON public.speed_session_items TO authenticated;
GRANT ALL ON public.speed_session_items TO service_role;

ALTER TABLE public.speed_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own speed session items"
  ON public.speed_session_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.speed_sessions s
    WHERE s.id = session_id AND s.student_account_id = current_student_account_id()
  ));

CREATE POLICY "Students insert own speed session items"
  ON public.speed_session_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.speed_sessions s
    WHERE s.id = session_id AND s.student_account_id = current_student_account_id()
  ));

CREATE POLICY "Staff view all speed session items"
  ON public.speed_session_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));
