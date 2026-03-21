
-- 1. Add onboarding_completed to student_accounts
ALTER TABLE public.student_accounts ADD COLUMN onboarding_completed boolean DEFAULT false;

-- 2. Create closing_report_tokens table
CREATE TABLE public.closing_report_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);

ALTER TABLE public.closing_report_tokens ENABLE ROW LEVEL SECURITY;

-- Public can view by token (for shareable links)
CREATE POLICY "Public can view closing reports by token"
ON public.closing_report_tokens FOR SELECT
USING (true);

-- Admins can manage all
CREATE POLICY "Admins can manage closing report tokens"
ON public.closing_report_tokens FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Teachers can insert tokens for their batches
CREATE POLICY "Teachers can insert closing report tokens"
ON public.closing_report_tokens FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'teacher'::app_role) AND
  EXISTS (
    SELECT 1 FROM batches b
    JOIN teachers t ON b.teacher ILIKE '%' || t.name || '%'
    WHERE b.id = closing_report_tokens.batch_id
    AND t.username = get_current_teacher_username()
  )
);

-- 3. Add feature flags for new features
INSERT INTO public.feature_flags (feature_key, is_enabled, description) VALUES
  ('closing_reports', false, 'Session closing report sequence for SAT students'),
  ('qr_onboarding', false, 'QR code batch-specific student registration flow');
