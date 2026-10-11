CREATE TABLE public.tenant_live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL DEFAULT auth.uid(),
  question_ids uuid[] NOT NULL DEFAULT '{}',
  current_index int NOT NULL DEFAULT 0,
  revealed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tenant_live_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.tenant_live_sessions(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  question_id uuid NOT NULL,
  answer text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_live_sessions TO authenticated;
GRANT SELECT, INSERT ON public.tenant_live_answers TO authenticated;
GRANT ALL ON public.tenant_live_sessions, public.tenant_live_answers TO service_role;
ALTER TABLE public.tenant_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_live_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center staff manage live sessions" ON public.tenant_live_sessions FOR ALL TO authenticated
  USING (public.tenant_has_role(institution_id, 'teacher')) WITH CHECK (public.tenant_has_role(institution_id, 'teacher'));
CREATE POLICY "Students view their class live sessions" ON public.tenant_live_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tenant_students s WHERE s.id = public.tenant_my_student_id(institution_id) AND s.class_id = tenant_live_sessions.class_id));
CREATE POLICY "Center staff view live answers" ON public.tenant_live_answers FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id, 'teacher'));
CREATE POLICY "Students view own live answers" ON public.tenant_live_answers FOR SELECT TO authenticated
  USING (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Students answer live sessions" ON public.tenant_live_answers FOR INSERT TO authenticated
  WITH CHECK (student_id = public.tenant_my_student_id(institution_id) AND EXISTS (
    SELECT 1 FROM public.tenant_live_sessions ls WHERE ls.id = session_id AND ls.institution_id = tenant_live_answers.institution_id AND ls.status = 'live' AND NOT ls.revealed));
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_live_sessions, public.tenant_live_answers;