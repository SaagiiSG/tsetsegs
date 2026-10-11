CREATE TABLE public.tenant_student_goals (
  student_id uuid PRIMARY KEY REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL,
  speed int NOT NULL DEFAULT 2,
  hard int NOT NULL DEFAULT 5,
  medium int NOT NULL DEFAULT 10,
  intensity text,
  sat_date date,
  set_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.tenant_student_goals TO authenticated;
GRANT ALL ON public.tenant_student_goals TO service_role;
ALTER TABLE public.tenant_student_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own goals" ON public.tenant_student_goals FOR ALL TO authenticated
  USING (student_id = public.tenant_my_student_id(institution_id))
  WITH CHECK (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Center staff view goals" ON public.tenant_student_goals FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id, 'teacher'));

CREATE TABLE public.tenant_speed_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL,
  subject text NOT NULL DEFAULT 'math',
  correct int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_speed_runs_student_idx ON public.tenant_speed_runs(student_id, created_at DESC);
GRANT SELECT, INSERT ON public.tenant_speed_runs TO authenticated;
GRANT ALL ON public.tenant_speed_runs TO service_role;
ALTER TABLE public.tenant_speed_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students record own speed runs" ON public.tenant_speed_runs FOR INSERT TO authenticated
  WITH CHECK (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Students view own speed runs" ON public.tenant_speed_runs FOR SELECT TO authenticated
  USING (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Center staff view speed runs" ON public.tenant_speed_runs FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id, 'teacher'));