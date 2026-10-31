-- Center teacher student cards, same as the main site's (Saagii, 30 Oct): homework per session and notes per student,
-- and teachers can read their center's practice test scores.
-- Homework is keyed by class + session date like tenant_attendance; clearing a mark deletes the row.
-- Staff rules follow tenant_attendance (any teacher or center admin of the center). Notes can be changed only by their
-- author or a center admin. Students may see their own homework marks, never notes.

CREATE TABLE public.tenant_homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id),
  class_id uuid NOT NULL REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('completed','incomplete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id, session_date)
);
CREATE INDEX tenant_homework_class_idx ON public.tenant_homework(class_id, session_date);

CREATE TABLE public.tenant_student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id),
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.tenant_classes(id) ON DELETE SET NULL,
  content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 2000),
  author_name text NOT NULL CHECK (length(author_name) <= 120),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
CREATE INDEX tenant_student_notes_student_idx ON public.tenant_student_notes(student_id, created_at DESC);

REVOKE ALL ON public.tenant_homework, public.tenant_student_notes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_homework, public.tenant_student_notes TO authenticated;
GRANT ALL ON public.tenant_homework, public.tenant_student_notes TO service_role;
ALTER TABLE public.tenant_homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Center staff manage homework" ON public.tenant_homework FOR ALL TO authenticated
  USING (public.tenant_has_role(institution_id,'teacher'))
  WITH CHECK (public.tenant_has_role(institution_id,'teacher')
    AND EXISTS (SELECT 1 FROM public.tenant_students s WHERE s.id = student_id AND s.institution_id = tenant_homework.institution_id)
    AND EXISTS (SELECT 1 FROM public.tenant_classes c WHERE c.id = class_id AND c.institution_id = tenant_homework.institution_id));
CREATE POLICY "Students view own homework" ON public.tenant_homework FOR SELECT TO authenticated
  USING (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Platform admins manage tenant homework" ON public.tenant_homework FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Center staff read notes" ON public.tenant_student_notes FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id,'teacher'));
CREATE POLICY "Center staff add notes" ON public.tenant_student_notes FOR INSERT TO authenticated
  WITH CHECK (public.tenant_has_role(institution_id,'teacher') AND created_by = (SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.tenant_students s WHERE s.id = student_id AND s.institution_id = tenant_student_notes.institution_id));
CREATE POLICY "Authors or center admins change notes" ON public.tenant_student_notes FOR UPDATE TO authenticated
  USING (public.tenant_has_role(institution_id,'teacher') AND (created_by = (SELECT auth.uid()) OR public.tenant_has_role(institution_id,'center_admin')))
  WITH CHECK (public.tenant_has_role(institution_id,'teacher')
    AND EXISTS (SELECT 1 FROM public.tenant_students s WHERE s.id = student_id AND s.institution_id = tenant_student_notes.institution_id));
CREATE POLICY "Authors or center admins delete notes" ON public.tenant_student_notes FOR DELETE TO authenticated
  USING (public.tenant_has_role(institution_id,'teacher') AND (created_by = (SELECT auth.uid()) OR public.tenant_has_role(institution_id,'center_admin')));
CREATE POLICY "Platform admins manage tenant notes" ON public.tenant_student_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Teachers see their center's practice test results. The paper (answer keys) stays ungranted, as 0091 set it.
CREATE POLICY "Center staff read test attempts" ON public.tenant_test_attempts FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id,'teacher'));
