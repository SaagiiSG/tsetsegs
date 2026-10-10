ALTER TABLE public.institution_customers ADD COLUMN IF NOT EXISTS portal_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP FUNCTION IF EXISTS public.tenant_lookup(text);
CREATE FUNCTION public.tenant_lookup(_slug text)
RETURNS TABLE(id uuid, name text, country text, slug text, portal_settings jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, c.country, c.slug, c.portal_settings FROM public.institution_customers c
  WHERE lower(c.slug) = lower(_slug) AND c.portal_enabled AND c.status <> 'churned' LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.tenant_lookup(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.tenant_update_settings(_institution uuid, _settings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb; logo text := nullif(trim(_settings->>'logo_url'), '');
BEGIN
  IF NOT (public.tenant_has_role(_institution, 'center_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF logo IS NOT NULL AND NOT (logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' OR logo ~ '^https://') THEN logo := NULL; END IF;
  IF length(logo) > 250000 THEN RAISE EXCEPTION 'Logo is too large'; END IF;
  v := jsonb_strip_nulls(jsonb_build_object(
    'display_name', left(nullif(trim(_settings->>'display_name'), ''), 80),
    'logo_url', logo,
    'brand_color', CASE WHEN (_settings->>'brand_color') ~ '^#[0-9a-fA-F]{6}$' THEN _settings->>'brand_color' END,
    'contact_email', left(nullif(trim(_settings->>'contact_email'), ''), 200),
    'timezone', left(nullif(trim(_settings->>'timezone'), ''), 60)
  ));
  UPDATE public.institution_customers SET portal_settings = v, updated_at = now() WHERE id = _institution;
  RETURN v;
END $$;
GRANT EXECUTE ON FUNCTION public.tenant_update_settings(uuid, jsonb) TO authenticated;

ALTER TABLE public.tenant_classes ADD COLUMN IF NOT EXISTS join_code text NOT NULL DEFAULT encode(gen_random_bytes(5), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS tenant_classes_join_code_key ON public.tenant_classes(join_code);

CREATE TABLE public.tenant_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.tenant_classes(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL DEFAULT '',
  school text NOT NULL DEFAULT '',
  grade text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE UNIQUE INDEX tenant_registrations_pending_phone ON public.tenant_registrations(institution_id, phone) WHERE status = 'pending';
CREATE INDEX tenant_registrations_inst ON public.tenant_registrations(institution_id, status, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_registrations TO authenticated;
GRANT ALL ON public.tenant_registrations TO service_role;
ALTER TABLE public.tenant_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage tenant registrations" ON public.tenant_registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Center admins manage registrations" ON public.tenant_registrations FOR ALL TO authenticated
  USING (public.tenant_has_role(institution_id, 'center_admin')) WITH CHECK (public.tenant_has_role(institution_id, 'center_admin'));

CREATE TABLE public.tenant_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 4000),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_announcements_inst ON public.tenant_announcements(institution_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_announcements TO authenticated;
GRANT ALL ON public.tenant_announcements TO service_role;
ALTER TABLE public.tenant_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage tenant announcements" ON public.tenant_announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Center admins manage announcements" ON public.tenant_announcements FOR ALL TO authenticated
  USING (public.tenant_has_role(institution_id, 'center_admin')) WITH CHECK (public.tenant_has_role(institution_id, 'center_admin'));
CREATE POLICY "Center staff view announcements" ON public.tenant_announcements FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id, 'teacher'));
CREATE POLICY "Students view their announcements" ON public.tenant_announcements FOR SELECT TO authenticated
  USING (public.tenant_my_student_id(institution_id) IS NOT NULL AND (class_id IS NULL OR class_id IN (
    SELECT s.class_id FROM public.tenant_students s WHERE s.user_id = auth.uid() AND s.active)));

CREATE TABLE public.tenant_announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.tenant_announcements(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, student_id)
);
GRANT SELECT, INSERT, DELETE ON public.tenant_announcement_reads TO authenticated;
GRANT ALL ON public.tenant_announcement_reads TO service_role;
ALTER TABLE public.tenant_announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins view tenant reads" ON public.tenant_announcement_reads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Center staff view reads" ON public.tenant_announcement_reads FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id, 'teacher'));
CREATE POLICY "Students view own reads" ON public.tenant_announcement_reads FOR SELECT TO authenticated
  USING (student_id = public.tenant_my_student_id(institution_id));
CREATE POLICY "Students mark own reads" ON public.tenant_announcement_reads FOR INSERT TO authenticated
  WITH CHECK (student_id = public.tenant_my_student_id(institution_id));

CREATE TABLE public.tenant_sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','finished')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
CREATE INDEX tenant_sprints_inst ON public.tenant_sprints(institution_id, starts_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_sprints TO authenticated;
GRANT ALL ON public.tenant_sprints TO service_role;
ALTER TABLE public.tenant_sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins manage tenant sprints" ON public.tenant_sprints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Center admins manage sprints" ON public.tenant_sprints FOR ALL TO authenticated
  USING (public.tenant_has_role(institution_id, 'center_admin')) WITH CHECK (public.tenant_has_role(institution_id, 'center_admin'));
CREATE POLICY "Center members view sprints" ON public.tenant_sprints FOR SELECT TO authenticated
  USING (public.tenant_has_role(institution_id, 'teacher') OR public.tenant_my_student_id(institution_id) IS NOT NULL);

CREATE OR REPLACE FUNCTION public.tenant_sprint_leaderboard(_sprint uuid)
RETURNS TABLE(student_id uuid, name text, class_name text, points bigint, answered bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE sp public.tenant_sprints;
BEGIN
  SELECT * INTO sp FROM public.tenant_sprints WHERE id = _sprint;
  IF sp.id IS NULL THEN RETURN; END IF;
  IF NOT (public.tenant_has_role(sp.institution_id, 'teacher') OR public.tenant_my_student_id(sp.institution_id) IS NOT NULL
          OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
  SELECT s.id, s.name, c.name, (count(a.id) FILTER (WHERE a.is_correct) * 10)::bigint, count(a.id)::bigint
  FROM public.tenant_students s
  LEFT JOIN public.tenant_classes c ON c.id = s.class_id
  LEFT JOIN public.tenant_attempts a ON a.student_id = s.id
    AND a.created_at >= sp.starts_on::timestamptz AND a.created_at < (sp.ends_on + 1)::timestamptz
  WHERE s.institution_id = sp.institution_id AND s.active
  GROUP BY s.id, s.name, c.name
  ORDER BY 4 DESC, 5 DESC, s.name
  LIMIT 200;
END $$;
GRANT EXECUTE ON FUNCTION public.tenant_sprint_leaderboard(uuid) TO authenticated;

-- Public: resolve a class join code to show the registration form
CREATE OR REPLACE FUNCTION public.tenant_join_lookup(_slug text, _code text)
RETURNS TABLE(class_id uuid, class_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cl.id, cl.name FROM public.tenant_classes cl JOIN public.institution_customers c ON c.id = cl.institution_id
  WHERE lower(c.slug) = lower(_slug) AND c.portal_enabled AND c.status <> 'churned' AND cl.join_code = _code LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.tenant_join_lookup(text, text) TO anon, authenticated;
