-- Early bird list (Saagii, 17 Nov 2026). Solo sign-up is closed (0134) and there is no checkout yet, so /solo takes an
-- email instead. At launch every email here gets a 14-day Premium trial instead of 7 (checkout looks it up by email), and
-- the tips emails go out through a newsletter tool (Lovable's mailer only sends app emails). Safe to run twice.
SET lock_timeout = '3s';
CREATE TABLE IF NOT EXISTS public.early_bird_signups (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS early_bird_signups_created ON public.early_bird_signups (created_at DESC);
GRANT SELECT ON public.early_bird_signups TO authenticated;
GRANT ALL ON public.early_bird_signups TO service_role;
ALTER TABLE public.early_bird_signups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins read early birds" ON public.early_bird_signups;
CREATE POLICY "Platform admins read early birds" ON public.early_bird_signups FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.join_early_bird(_email text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE mail text := lower(btrim(coalesce(_email, '')));
BEGIN
  IF length(mail) > 255 OR mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Please enter a valid email address';
  END IF;
  -- Same rule as solo_join(): solo is for students outside Mongolia. A missing header lets it through.
  IF nullif(current_setting('request.headers', true), '')::json->>'cf-ipcountry' = 'MN' THEN
    RAISE EXCEPTION 'Solo accounts are for students outside Mongolia';
  END IF;
  -- shortcut: a flood cap, not a bot check. Add a captcha if junk emails start showing up in the list.
  IF (SELECT count(*) FROM public.early_bird_signups WHERE created_at > now() - interval '1 hour') >= 500 THEN
    RAISE EXCEPTION 'Too many sign-ups right now. Please try again in a few minutes.';
  END IF;
  -- Joining twice is a quiet no-op, so the form never tells a stranger whether an email is already on the list.
  INSERT INTO public.early_bird_signups (email) VALUES (mail) ON CONFLICT (email) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.join_early_bird(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_early_bird(text) TO anon, authenticated;
