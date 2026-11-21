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

-- Part 2: earnings and payouts. One earning per student (first yearly payment) and per Whop payment id.
CREATE TABLE IF NOT EXISTS public.partner_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id),
  student_user_id uuid NOT NULL UNIQUE,
  payment_id text NOT NULL UNIQUE,
  paid_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  amount_cents integer NOT NULL DEFAULT 1000,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'void', 'paid')),
  voided_at timestamptz,
  paid_marked_at timestamptz,
  alerted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_earnings_partner ON public.partner_earnings (partner_id);

-- A refund can arrive before its payment event; the tombstone makes the late payment land as void.
CREATE TABLE IF NOT EXISTS public.partner_voided_payments (
  payment_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.partner_earnings, public.partner_voided_payments FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.partner_earnings, public.partner_voided_payments TO service_role;
ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_voided_payments ENABLE ROW LEVEL SECURITY;

-- Only a student's first yearly payment above $0 can earn. A refunded one is stored as void so it still is the
-- student's one earning, while a refunded monthly payment never blocks a later yearly one.
CREATE OR REPLACE FUNCTION public.partner_record_payment(_user uuid, _membership text, _payment text, _yearly boolean, _amount numeric, _paid_at timestamptz)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid; pid uuid; n int; voided boolean;
        due timestamptz := ((_paid_at AT TIME ZONE 'UTC')::date + 14)::timestamp AT TIME ZONE 'UTC';
BEGIN
  SELECT user_id INTO sid FROM public.solo_students WHERE user_id = _user;
  IF sid IS NULL AND _membership IS NOT NULL THEN
    SELECT user_id INTO sid FROM public.solo_students WHERE whop_membership_id = _membership;
  END IF;
  IF sid IS NULL THEN RETURN 'no_student'; END IF;
  SELECT partner_id INTO pid FROM public.partner_invites WHERE student_user_id = sid;
  IF pid IS NULL THEN RETURN 'no_partner'; END IF;
  IF NOT coalesce(_yearly, false) OR coalesce(_amount, 0) <= 0 THEN RETURN 'not_counted'; END IF;
  voided := EXISTS (SELECT 1 FROM public.partner_voided_payments WHERE payment_id = _payment);
  INSERT INTO public.partner_earnings (partner_id, student_user_id, payment_id, paid_at, due_at, status, voided_at)
  VALUES (pid, sid, _payment, _paid_at, due, CASE WHEN voided THEN 'void' ELSE 'pending' END, CASE WHEN voided THEN now() END)
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN CASE WHEN n = 0 THEN 'already' WHEN voided THEN 'voided' ELSE 'earned' END;
END $$;
REVOKE ALL ON FUNCTION public.partner_record_payment(uuid, text, text, boolean, numeric, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_record_payment(uuid, text, text, boolean, numeric, timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.partner_void_payment(_payment text)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  INSERT INTO public.partner_voided_payments (payment_id) VALUES (_payment) ON CONFLICT DO NOTHING;
  UPDATE public.partner_earnings SET status = 'void', voided_at = now() WHERE payment_id = _payment AND status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 1 THEN RETURN 'voided'; END IF;
  RETURN CASE WHEN EXISTS (SELECT 1 FROM public.partner_earnings WHERE payment_id = _payment AND status = 'paid') THEN 'paid_already' ELSE 'none' END;
END $$;
REVOKE ALL ON FUNCTION public.partner_void_payment(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.partner_void_payment(text) TO service_role;

CREATE OR REPLACE FUNCTION public.partner_mark_paid(_earning uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.partner_earnings SET status = 'paid', paid_marked_at = now()
  WHERE id = _earning AND status = 'pending' AND due_at <= now();
  IF NOT FOUND THEN RAISE EXCEPTION 'Only a $10 that is due can be marked paid'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.partner_mark_paid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_mark_paid(uuid) TO authenticated;

-- One UPDATE claims the due earnings, so a second or concurrent run of the daily email never repeats them.
CREATE OR REPLACE FUNCTION public.claim_partner_payouts_due()
RETURNS TABLE (id uuid, partner_name text, code text, amount_cents integer, due_at timestamptz)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.partner_earnings e SET alerted_at = now() FROM public.partners p
  WHERE p.id = e.partner_id AND e.status = 'pending' AND e.due_at <= now() AND e.alerted_at IS NULL
  RETURNING e.id, p.name, p.code, e.amount_cents, e.due_at
$$;
REVOKE ALL ON FUNCTION public.claim_partner_payouts_due() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_partner_payouts_due() TO service_role;

CREATE OR REPLACE FUNCTION public.unclaim_partner_payouts_due(_ids uuid[])
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.partner_earnings SET alerted_at = NULL WHERE id = ANY(_ids)
$$;
REVOKE ALL ON FUNCTION public.unclaim_partner_payouts_due(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.unclaim_partner_payouts_due(uuid[]) TO service_role;

-- The partner's own page: dates, statuses and amounts only, never who the student is. The sign-in email must be
-- confirmed, or anyone could sign up with a partner's address and read their page.
CREATE OR REPLACE FUNCTION public.partner_dashboard()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p public.partners;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO p FROM public.partners WHERE user_id = uid;
  IF NOT FOUND THEN
    SELECT pt.* INTO p FROM public.partners pt JOIN auth.users u ON lower(btrim(u.email)) = lower(pt.email)
    WHERE u.id = uid AND u.email_confirmed_at IS NOT NULL AND pt.user_id IS NULL;
    IF NOT FOUND THEN RETURN NULL; END IF;
    UPDATE public.partners SET user_id = uid WHERE id = p.id;
  END IF;
  RETURN jsonb_build_object('name', p.name, 'code', p.code, 'paused', p.paused_at IS NOT NULL, 'invites', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'signed_up', i.created_at, 'whop_status', s.whop_status, 'billing_days', s.whop_billing_period_days,
      'period_end', s.whop_period_end, 'earning_status', e.status, 'paid_at', e.paid_at, 'due_at', e.due_at,
      'paid_marked_at', e.paid_marked_at) ORDER BY i.created_at DESC)
    FROM public.partner_invites i
    JOIN public.solo_students s ON s.user_id = i.student_user_id
    LEFT JOIN public.partner_earnings e ON e.student_user_id = i.student_user_id
    WHERE i.partner_id = p.id), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.partner_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_dashboard() TO authenticated;

-- missing = students whose yearly payment we never recorded (webhook down or a bad plan id), so Saagii can fix it by hand.
CREATE OR REPLACE FUNCTION public.partner_admin_data()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT coalesce(public.has_role(auth.uid(), 'admin'), false) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN jsonb_build_object(
    'applications', coalesce((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'email', a.email, 'kind', a.kind,
      'link', a.link, 'country', a.country, 'message', a.message, 'status', a.status, 'created_at', a.created_at)
      ORDER BY a.created_at DESC) FROM public.partner_applications a), '[]'::jsonb),
    'partners', coalesce((SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'email', p.email, 'kind', p.kind,
      'code', p.code, 'paused', p.paused_at IS NOT NULL, 'created_at', p.created_at,
      'signed_up', (SELECT count(*) FROM public.partner_invites i WHERE i.partner_id = p.id),
      'paid_yearly', (SELECT count(*) FROM public.partner_earnings e WHERE e.partner_id = p.id AND e.status <> 'void'),
      'owed_cents', (SELECT coalesce(sum(e.amount_cents), 0) FROM public.partner_earnings e WHERE e.partner_id = p.id AND e.status = 'pending'),
      'paid_cents', (SELECT coalesce(sum(e.amount_cents), 0) FROM public.partner_earnings e WHERE e.partner_id = p.id AND e.status = 'paid'))
      ORDER BY p.created_at DESC) FROM public.partners p), '[]'::jsonb),
    'earnings', coalesce((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'partner_name', p.name, 'code', p.code,
      'paid_at', e.paid_at, 'due_at', e.due_at, 'status', e.status, 'amount_cents', e.amount_cents, 'paid_marked_at', e.paid_marked_at)
      ORDER BY e.paid_at DESC) FROM public.partner_earnings e JOIN public.partners p ON p.id = e.partner_id), '[]'::jsonb),
    'missing', coalesce((SELECT jsonb_agg(jsonb_build_object('partner_name', p.name, 'code', p.code, 'signed_up', i.created_at)
      ORDER BY i.created_at DESC)
      FROM public.partner_invites i
      JOIN public.partners p ON p.id = i.partner_id
      JOIN public.solo_students s ON s.user_id = i.student_user_id
      WHERE s.whop_billing_period_days = 365 AND s.whop_status IN ('active', 'canceling')
        AND NOT EXISTS (SELECT 1 FROM public.partner_earnings e WHERE e.student_user_id = i.student_user_id)), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.partner_admin_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.partner_admin_data() TO authenticated;

-- shortcut: 15:00 UTC is 8:00 in Calgary in winter, 9:00 in summer; move it if the hour matters.
SELECT cron.schedule('partner-payouts-due-daily', '0 15 * * *', $$select public._post_edge_function('partner-payouts-due', '{}'::jsonb);$$);
