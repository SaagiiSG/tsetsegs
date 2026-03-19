
-- Create feature flags table
CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT false,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read flags (needed for client-side checks)
CREATE POLICY "Anyone can view feature flags"
ON public.feature_flags FOR SELECT
USING (true);

-- Only admins can manage flags
CREATE POLICY "Admins can manage feature flags"
ON public.feature_flags FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed with current features
INSERT INTO public.feature_flags (feature_key, is_enabled, description) VALUES
  ('speed_session_v2', false, 'New two-column speed session layout with circular timer'),
  ('bug_reports', false, 'Student bug report submission and admin dashboard'),
  ('sat_countdown', false, 'SAT countdown widget on speed mode page');
