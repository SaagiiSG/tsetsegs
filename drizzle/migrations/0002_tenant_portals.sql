ALTER TABLE public.institution_customers ADD COLUMN IF NOT EXISTS slug text, ADD COLUMN IF NOT EXISTS portal_enabled boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS institution_customers_slug_key ON public.institution_customers (lower(slug)) WHERE slug IS NOT NULL;
ALTER TABLE public.institution_customers ADD CONSTRAINT institution_customers_slug_format CHECK (slug IS NULL OR slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$');

CREATE TABLE public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('center_admin','teacher')),
  display_name text NOT NULL,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, user_id)
);
CREATE TABLE public.tenant_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  teacher_member_id uuid REFERENCES public.tenant_members(id) ON DELETE SET NULL,
  schedule text NOT NULL DEFAULT '',
  starts_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tenant_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.tenant_classes(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  user_id uuid,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (institution_id, phone)
);
CREATE TABLE public.tenant_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present','late','absent','sick','excused')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id, session_date)
);
CREATE TABLE public.tenant_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tenant_members (user_id);
CREATE INDEX ON public.tenant_students (user_id);
CREATE INDEX ON public.tenant_attempts (student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_members, public.tenant_classes, public.tenant_students, public.tenant_attendance, public.tenant_attempts TO authenticated;
GRANT ALL ON public.tenant_members, public.tenant_classes, public.tenant_students, public.tenant_attendance, public.tenant_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.tenant_has_role(_institution uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_members m JOIN public.institution_customers c ON c.id = m.institution_id
    WHERE m.institution_id = _institution AND m.user_id = auth.uid() AND m.active AND c.portal_enabled
      AND (_role = 'any' OR m.role = _role OR (_role = 'teacher' AND m.role = 'center_admin')))
$$;
CREATE OR REPLACE FUNCTION public.tenant_my_student_id(_institution uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.tenant_students s JOIN public.institution_customers c ON c.id = s.institution_id
  WHERE s.institution_id = _institution AND s.user_id = auth.uid() AND s.active AND c.portal_enabled LIMIT 1
$$;
CREATE OR REPLACE FUNCTION public.tenant_lookup(_slug text)
RETURNS TABLE (id uuid, name text, country text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.country, c.slug FROM public.institution_customers c
  WHERE lower(c.slug) = lower(_slug) AND c.portal_enabled AND c.status <> 'churned' LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.tenant_lookup(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_has_role(uuid, text), public.tenant_my_student_id(uuid) TO authenticated;

ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage tenant members" ON public.tenant_members FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Center staff view their team" ON public.tenant_members FOR SELECT TO authenticated USING (public.tenant_has_role(institution_id,'teacher'));
CREATE POLICY "Center admins update their team" ON public.tenant_members FOR UPDATE TO authenticated USING (public.tenant_has_role(institution_id,'center_admin') AND user_id <> auth.uid()) WITH CHECK (public.tenant_has_role(institution_id,'center_admin') AND role = 'teacher');

CREATE POLICY "Platform admins manage tenant classes" ON public.tenant_classes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Center staff view classes" ON public.tenant_classes FOR SELECT TO authenticated USING (public.tenant_has_role(institution_id,'teacher'));
CREATE POLICY "Center admins manage classes" ON public.tenant_classes FOR ALL TO authenticated USING (public.tenant_has_role(institution_id,'center_admin')) WITH CHECK (public.tenant_has_role(institution_id,'center_admin'));
CREATE POLICY "Students view their class" ON public.tenant_classes FOR SELECT TO authenticated USING (id IN (SELECT class_id FROM public.tenant_students WHERE user_id = auth.uid() AND active));

CREATE POLICY "Platform admins manage tenant students" ON public.tenant_students FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Center staff view students" ON public.tenant_students FOR SELECT TO authenticated USING (public.tenant_has_role(institution_id,'teacher'));
CREATE POLICY "Center admins manage students" ON public.tenant_students FOR ALL TO authenticated USING (public.tenant_has_role(institution_id,'center_admin')) WITH CHECK (public.tenant_has_role(institution_id,'center_admin'));
CREATE POLICY "Students view themselves" ON public.tenant_students FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Platform admins manage tenant attendance" ON public.tenant_attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Center staff manage attendance" ON public.tenant_attendance FOR ALL TO authenticated USING (public.tenant_has_role(institution_id,'teacher')) WITH CHECK (public.tenant_has_role(institution_id,'teacher') AND EXISTS (SELECT 1 FROM public.tenant_students s WHERE s.id = student_id AND s.institution_id = tenant_attendance.institution_id));
CREATE POLICY "Students view own attendance" ON public.tenant_attendance FOR SELECT TO authenticated USING (student_id = public.tenant_my_student_id(institution_id));

CREATE POLICY "Platform admins view tenant attempts" ON public.tenant_attempts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Center staff view attempts" ON public.tenant_attempts FOR SELECT TO authenticated USING (public.tenant_has_role(institution_id,'teacher'));
CREATE POLICY "Students view own attempts" ON public.tenant_attempts FOR SELECT TO authenticated USING (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Students record own attempts" ON public.tenant_attempts FOR INSERT TO authenticated WITH CHECK (student_id = public.tenant_my_student_id(institution_id));

CREATE POLICY "Center admins view own payment dues" ON public.institution_payment_dues FOR SELECT TO authenticated USING (public.tenant_has_role(customer_id,'center_admin'));