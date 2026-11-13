-- Terms agreement record (Saagii, 12 Nov 2026): /solo and center join pages make students tick "I agree to the Terms
-- of Use and Privacy Policy" before signing up. accept_terms() keeps who agreed to which version and when, as proof if
-- it's ever disputed. The version is the date /terms and /privacy last changed (TERMS_VERSION in src/lib/terms.ts).
-- Safe to run twice.
SET lock_timeout = '3s';

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  user_id uuid NOT NULL,
  version text NOT NULL CHECK (version ~ '^\d{4}-\d{2}-\d{2}$'),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, version)
);
-- No read or write rules: students write only through accept_terms(), staff read it in the dashboard.
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.terms_acceptances FROM anon, authenticated;

-- Identity comes only from the token. The first agreement to a version is kept; repeats change nothing.
CREATE OR REPLACE FUNCTION public.accept_terms(p_version text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  INSERT INTO public.terms_acceptances (user_id, version) VALUES (auth.uid(), p_version) ON CONFLICT DO NOTHING;
END $$;
-- authenticated by name too, since Supabase grants new functions to it.
REVOKE ALL ON FUNCTION public.accept_terms(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_terms(text) TO authenticated;
