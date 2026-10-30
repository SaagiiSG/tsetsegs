-- Center saved schedules for the Intake wizard (Saagii, 30 Oct): the days and times a batch meets, saved once per
-- center and picked when making a batch. Only center admins (and platform admins) see or change them.
-- slots is a list of { day, start_time, end_time }, the same shape as the main site's schedule_templates.schedule_data.

CREATE TABLE public.tenant_schedule_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  slots jsonb NOT NULL CHECK (jsonb_typeof(slots) = 'array' AND jsonb_array_length(slots) BETWEEN 1 AND 14),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_schedule_templates_institution_idx ON public.tenant_schedule_templates(institution_id);

REVOKE ALL ON public.tenant_schedule_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_schedule_templates TO authenticated;
GRANT ALL ON public.tenant_schedule_templates TO service_role;
ALTER TABLE public.tenant_schedule_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Center admins manage schedule templates" ON public.tenant_schedule_templates FOR ALL TO authenticated
  USING (public.tenant_has_role(institution_id,'center_admin'))
  WITH CHECK (public.tenant_has_role(institution_id,'center_admin'));
CREATE POLICY "Platform admins manage tenant schedule templates" ON public.tenant_schedule_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
