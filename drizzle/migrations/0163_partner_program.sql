-- Partner program (Saagii, 20 Nov 2026): tutors and creators apply, Saagii approves and gives each a code. A new solo
-- student who enters the code (or opens the invite link) is tied to that partner. Part 1: applications, partners,
-- codes and invites. Tables are service-role only; the app reaches them through the functions below. Safe to run twice.
SET lock_timeout = '3s';

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('tutor', 'creator')),
  link text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'approved', 'declined')),
  notified_at timestamptz,
  partner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_applications_email_created ON public.partner_applications (lower(email), created_at DESC);

CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('tutor', 'creator')),
  code text NOT NULL UNIQUE,
  user_id uuid UNIQUE,
  paused_at timestamptz,
  welcomed_at timestamptz,
  application_id uuid REFERENCES public.partner_applications (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS partners_email_lower ON public.partners (lower(email));

-- One partner per student, forever: the row is the proof the student came through that partner.
CREATE TABLE IF NOT EXISTS public.partner_invites (
  student_user_id uuid PRIMARY KEY REFERENCES public.solo_students (user_id) ON DELETE CASCADE,
  partner_id uuid NOT NULL REFERENCES public.partners (id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_invites_partner ON public.partner_invites (partner_id);

-- Hosted defaults hand new tables to anon and authenticated; take that back so only the functions open the door.
REVOKE ALL ON public.partner_applications, public.partners, public.partner_invites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.partner_applications, public.partners, public.partner_invites TO service_role;
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invites ENABLE ROW LEVEL SECURITY;

-- Checks copied from 0033's submit_educator_demo_request. The email is stored trimmed and lower-cased.
CREATE OR REPLACE FUNCTION public.submit_partner_application(_name text, _email text, _kind text, _link text, _country text, _message text, _website text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE new_id uuid;
BEGIN
  IF coalesce(_website, '') <> '' THEN RAISE EXCEPTION 'Invalid request'; END IF;
  IF _name IS NULL OR length(trim(_name)) NOT BETWEEN 2 AND 100
     OR _email IS NULL OR length(_email) > 255 OR trim(_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     OR _kind IS NULL OR _kind NOT IN ('tutor', 'creator')
     OR _link IS NULL OR length(trim(_link)) > 300
     OR _country IS NULL OR length(_country) > 100
     OR _message IS NULL OR length(_message) > 2000 THEN
    RAISE EXCEPTION 'Please check your application details';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('partner_application:' || lower(trim(_email))));
  IF EXISTS (SELECT 1 FROM public.partner_applications WHERE email = lower(trim(_email)) AND created_at > now() - interval '24 hours') THEN
    RAISE EXCEPTION 'An application for this email was already received. Please wait for our reply.';
  END IF;
  IF (SELECT count(*) FROM public.partner_applications WHERE created_at > now() - interval '1 hour') >= 50 THEN
    RAISE EXCEPTION 'Applications are temporarily busy. Please try again later.';
  END IF;
  INSERT INTO public.partner_applications (name, email, kind, link, country, message)
  VALUES (trim(_name), lower(trim(_email)), _kind, trim(_link), trim(_country), trim(_message)) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_partner_application(text, text, text, text, text, text, text) TO anon, authenticated;

-- Lets the sign-up page say "invite applied" before the student has an account; a paused partner's code is just wrong.
CREATE OR REPLACE FUNCTION public.partner_code_ok(_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.partners WHERE code = upper(btrim(coalesce(_code, ''))) AND paused_at IS NULL)
$$;
REVOKE ALL ON FUNCTION public.partner_code_ok(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.partner_code_ok(text) TO anon, authenticated;

-- A code counts only for a brand-new solo student (made in the last hour, no Whop membership yet), so it can't be added
-- after a purchase. Concurrent calls end in one 'added' and the rest 'already' (the primary key decides).
CREATE OR REPLACE FUNCTION public.solo_use_invite(_code text)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s public.solo_students; p public.partners;
        mail text := lower(btrim(coalesce(auth.jwt()->>'email', '')));
        n int;
BEGIN
  SELECT * INTO s FROM public.solo_students WHERE user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a solo student'; END IF;
  IF EXISTS (SELECT 1 FROM public.partner_invites WHERE student_user_id = uid) THEN RETURN 'already'; END IF;
  SELECT * INTO p FROM public.partners WHERE code = upper(btrim(coalesce(_code, ''))) AND paused_at IS NULL;
  IF NOT FOUND THEN RETURN 'bad_code'; END IF;
  IF s.created_at < now() - interval '1 hour' OR s.whop_membership_id IS NOT NULL THEN RETURN 'too_late'; END IF;
  IF p.user_id = uid OR lower(btrim(p.email)) = coalesce(nullif(lower(btrim(s.email)), ''), mail) THEN RETURN 'own_code'; END IF;
  INSERT INTO public.partner_invites (student_user_id, partner_id) VALUES (uid, p.id) ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN CASE WHEN n = 1 THEN 'added' ELSE 'already' END;
END $$;
REVOKE ALL ON FUNCTION public.solo_use_invite(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solo_use_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_partner_application(_id uuid, _code text)
RETURNS uuid LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.partner_applications; c text := upper(btrim(coalesce(_code, ''))); pid uuid;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF c !~ '^[A-Z0-9]{3,20}$' THEN RAISE EXCEPTION 'A code is 3–20 letters or numbers'; END IF;
  SELECT * INTO a FROM public.partner_applications WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF a.status = 'approved' THEN RAISE EXCEPTION 'Already approved'; END IF;
  IF EXISTS (SELECT 1 FROM public.partners WHERE code = c) THEN RAISE EXCEPTION 'That code is taken'; END IF;
  IF EXISTS (SELECT 1 FROM public.partners WHERE lower(email) = lower(a.email)) THEN RAISE EXCEPTION 'That email is already a partner'; END IF;
  INSERT INTO public.partners (name, email, kind, code, application_id) VALUES (a.name, a.email, a.kind, c, a.id) RETURNING id INTO pid;
  UPDATE public.partner_applications SET status = 'approved', partner_id = pid WHERE id = _id;
  RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.approve_partner_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_partner_application(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.decline_partner_application(_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE st text;
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT status INTO st FROM public.partner_applications WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF st = 'approved' THEN RAISE EXCEPTION 'Already approved'; END IF;
  UPDATE public.partner_applications SET status = 'declined' WHERE id = _id;
END $$;
REVOKE ALL ON FUNCTION public.decline_partner_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_partner_application(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_partner_paused(_partner uuid, _paused boolean)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.partners SET paused_at = CASE WHEN _paused THEN coalesce(paused_at, now()) END WHERE id = _partner;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partner not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_partner_paused(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_partner_paused(uuid, boolean) TO authenticated;
