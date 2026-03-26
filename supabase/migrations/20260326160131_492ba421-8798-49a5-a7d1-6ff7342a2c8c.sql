
CREATE TABLE public.closing_report_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heading text NOT NULL DEFAULT 'Thank You, {name}!',
  body text NOT NULL DEFAULT 'Your hard work and dedication throughout this program have been incredible. Keep pushing toward your goals — we believe in you!',
  sign_off text NOT NULL DEFAULT 'See you on the review session! 🚀',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.closing_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view closing report settings" ON public.closing_report_settings
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage closing report settings" ON public.closing_report_settings
  FOR ALL TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
