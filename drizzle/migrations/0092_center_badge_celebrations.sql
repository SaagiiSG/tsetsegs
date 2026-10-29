-- A badge pop-up shows once per student per badge, on any device.
CREATE TABLE public.tenant_badge_celebrations (student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE, institution_id uuid NOT NULL REFERENCES public.institution_customers(id), badge_key text NOT NULL CHECK (char_length(badge_key) BETWEEN 1 AND 64), celebrated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (student_id,badge_key));
REVOKE ALL ON public.tenant_badge_celebrations FROM anon,authenticated;
GRANT SELECT,INSERT ON public.tenant_badge_celebrations TO authenticated;
GRANT ALL ON public.tenant_badge_celebrations TO service_role;
ALTER TABLE public.tenant_badge_celebrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own badge celebrations" ON public.tenant_badge_celebrations FOR SELECT TO authenticated USING (student_id=public.tenant_my_student_id(institution_id));
CREATE POLICY "Students record own badge celebrations" ON public.tenant_badge_celebrations FOR INSERT TO authenticated WITH CHECK (student_id=public.tenant_my_student_id(institution_id));

NOTIFY pgrst, 'reload schema';
