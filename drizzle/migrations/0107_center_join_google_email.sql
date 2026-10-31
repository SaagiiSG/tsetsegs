-- Center join sign-up with Google or a code-verified email (Saagii, 30 Oct). Every student gets a real email and, soon, a Google account.
-- A student keeps exactly ONE auth user in user_id (RLS and tenant_my_student_id() find students that way), so the
-- extra columns only remember what was connected: google_user_id (the Google auth user), password_user_id (the old
-- phone+password auth user, so staff can switch a student back to phone sign-in).
-- Signs in with Google = user_id = google_user_id. The two private tables are only touched by these RPCs and the
-- tenant-accounts edge function (service role); authenticated/anon get no grants.

ALTER TABLE public.tenant_students
  ADD COLUMN email text,
  ADD COLUMN google_email text,
  ADD COLUMN email_verified_at timestamptz,
  ADD COLUMN google_user_id uuid,
  ADD COLUMN password_user_id uuid,
  ADD COLUMN google_due_on date NOT NULL DEFAULT (current_date + 7);
UPDATE public.tenant_students SET password_user_id = user_id WHERE user_id IS NOT NULL;
-- Fails only if one auth user is already on two student rows of the same center (nothing in the app creates that).
CREATE UNIQUE INDEX tenant_students_center_user ON public.tenant_students (institution_id, user_id) WHERE user_id IS NOT NULL;

CREATE TABLE public.tenant_email_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  email text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_email_codes_lookup ON public.tenant_email_codes (institution_id, email, created_at DESC);
CREATE TABLE public.tenant_google_links (
  token_hash text PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  started_by uuid NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.tenant_email_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_google_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenant_email_codes, public.tenant_google_links FROM PUBLIC, anon, authenticated;

-- Shared by join and claim: the open center for a slug, or the same errors as the tenant-accounts `register` action.
CREATE OR REPLACE FUNCTION public.tenant_open_center(_slug text) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.institution_customers;
BEGIN
  SELECT * INTO c FROM public.institution_customers WHERE lower(slug) = lower(btrim(coalesce(_slug, ''))) AND portal_enabled AND status IS DISTINCT FROM 'churned';
  IF c.id IS NULL THEN RAISE EXCEPTION 'This center portal is not available.'; END IF;
  IF c.access_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This center is paused because of an overdue payment, so new sign-ups are closed. Please contact your center.';
  END IF;
  RETURN c.id;
END $$;

-- True when the caller's JWT comes from a Google sign-in.
CREATE OR REPLACE FUNCTION public.tenant_jwt_is_google() RETURNS boolean
LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT coalesce(auth.jwt()->'app_metadata'->'providers', '[]'::jsonb) ? 'google' OR auth.jwt()->'app_metadata'->>'provider' = 'google'
$$;

-- True when this auth user is already staff or a student (either login) in the center; _except skips the row being taken over.
CREATE OR REPLACE FUNCTION public.tenant_user_in_center(_institution uuid, _uid uuid, _except uuid DEFAULT NULL) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_members WHERE institution_id = _institution AND user_id = _uid)
      OR EXISTS (SELECT 1 FROM public.tenant_students WHERE institution_id = _institution AND (user_id = _uid OR google_user_id = _uid) AND id IS DISTINCT FROM _except)
$$;

CREATE OR REPLACE FUNCTION public.tenant_join_with_google(_slug text, _code text, _name text, _phone text, _school text, _grade text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); mail text := lower(btrim(coalesce(auth.jwt()->>'email', ''))); inst uuid; cls uuid;
        nm text := left(btrim(coalesce(_name, '')), 100); ph text := regexp_replace(coalesce(_phone, ''), '\D', '', 'g'); sid uuid; cur public.tenant_students;
BEGIN
  IF uid IS NULL OR mail = '' OR NOT public.tenant_jwt_is_google() THEN RAISE EXCEPTION 'Sign in with Google first.'; END IF;
  inst := public.tenant_open_center(_slug);
  SELECT id INTO cls FROM public.tenant_classes WHERE institution_id = inst AND join_code = btrim(coalesce(_code, ''));
  IF cls IS NULL THEN RAISE EXCEPTION 'This sign-up link is not valid. Ask your center for a new one.'; END IF;
  IF length(nm) < 2 THEN RAISE EXCEPTION 'Enter your full name.'; END IF;
  IF length(ph) < 6 OR length(ph) > 15 THEN RAISE EXCEPTION 'Enter a valid phone number.'; END IF;
  SELECT * INTO cur FROM public.tenant_students WHERE institution_id = inst AND phone = ph FOR UPDATE;
  IF public.tenant_user_in_center(inst, uid, cur.id) THEN RAISE EXCEPTION 'You already have an account here. Sign in instead.'; END IF;
  IF (SELECT count(*) FROM public.tenant_registrations WHERE institution_id = inst AND created_at >= now() - interval '1 hour') > 200 THEN
    RAISE EXCEPTION 'Too many sign-ups right now. Please try again later.';
  END IF;
  IF cur.id IS NOT NULL THEN
    IF cur.user_id IS NOT NULL THEN RAISE EXCEPTION 'You already have an account here. Sign in instead.'; END IF;
    IF NOT cur.active THEN RAISE EXCEPTION 'This phone number is not active here. Ask your center.'; END IF;
    -- Admin-added student: take over the row, keep their batch (only a student with no batch takes the link's).
    UPDATE public.tenant_students SET user_id = uid, google_user_id = uid, email = coalesce(nullif(email, ''), mail), google_email = mail, class_id = coalesce(class_id, cls)
      WHERE id = cur.id;
    sid := cur.id;
  ELSE
    INSERT INTO public.tenant_students (institution_id, class_id, name, phone, user_id, google_user_id, email, google_email)
      VALUES (inst, cls, nm, ph, uid, uid, mail, mail) RETURNING id INTO sid;
  END IF;
  INSERT INTO public.tenant_registrations (institution_id, class_id, name, phone, email, school, grade, status, reviewed_at)
    VALUES (inst, coalesce(cur.class_id, cls), nm, ph, mail, left(btrim(coalesce(_school, '')), 120), left(btrim(coalesce(_grade, '')), 20), 'approved', now());
  RETURN jsonb_build_object('ok', true, 'student_id', sid);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'You already have an account here. Sign in instead.';
END $$;

CREATE OR REPLACE FUNCTION public.tenant_claim_with_google(_slug text, _phone text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); mail text := lower(btrim(coalesce(auth.jwt()->>'email', ''))); inst uuid;
        ph text := regexp_replace(coalesce(_phone, ''), '\D', '', 'g'); cur public.tenant_students;
BEGIN
  IF uid IS NULL OR mail = '' OR NOT public.tenant_jwt_is_google() THEN RAISE EXCEPTION 'Sign in with Google first.'; END IF;
  inst := public.tenant_open_center(_slug);
  IF length(ph) < 6 OR length(ph) > 15 THEN RAISE EXCEPTION 'Enter a valid phone number.'; END IF;
  SELECT * INTO cur FROM public.tenant_students WHERE institution_id = inst AND phone = ph FOR UPDATE;
  IF cur.id IS NULL THEN RAISE EXCEPTION 'We could not find that phone number. Ask your center.'; END IF;
  IF cur.user_id IS NOT NULL THEN RAISE EXCEPTION 'This account already has a login. Sign in instead.'; END IF;
  IF NOT cur.active THEN RAISE EXCEPTION 'This phone number is not active here. Ask your center.'; END IF;
  IF public.tenant_user_in_center(inst, uid, cur.id) THEN RAISE EXCEPTION 'You already have an account here. Sign in instead.'; END IF;
  UPDATE public.tenant_students SET user_id = uid, google_user_id = uid, google_email = mail, email = coalesce(nullif(email, ''), mail) WHERE id = cur.id;
  RETURN jsonb_build_object('ok', true, 'student_id', cur.id);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'You already have an account here. Sign in instead.';
END $$;

CREATE OR REPLACE FUNCTION public.tenant_google_link_start(_institution uuid) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sid uuid := public.tenant_my_student_id(_institution); tok text;
BEGIN
  IF auth.uid() IS NULL OR sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF EXISTS (SELECT 1 FROM public.tenant_students WHERE id = sid AND user_id = google_user_id) THEN RAISE EXCEPTION 'This account already signs in with Google.'; END IF;
  -- Two uuids = 244 random bits; only the hash is kept.
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  DELETE FROM public.tenant_google_links WHERE student_id = sid OR expires_at < now();
  INSERT INTO public.tenant_google_links (token_hash, student_id, started_by, expires_at)
    VALUES (encode(sha256(convert_to(tok, 'utf8')), 'hex'), sid, auth.uid(), now() + interval '10 minutes');
  RETURN tok;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_google_link_finish(_token text) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); mail text := lower(btrim(coalesce(auth.jwt()->>'email', ''))); lk public.tenant_google_links; s public.tenant_students;
BEGIN
  IF uid IS NULL OR mail = '' OR NOT public.tenant_jwt_is_google() THEN RAISE EXCEPTION 'Sign in with Google first.'; END IF;
  -- Single use: the row is deleted on success; a failed finish rolls back and leaves it to expire (10 minutes).
  SELECT * INTO lk FROM public.tenant_google_links WHERE token_hash = encode(sha256(convert_to(coalesce(_token, ''), 'utf8')), 'hex') FOR UPDATE;
  IF lk.token_hash IS NULL OR lk.expires_at < now() THEN RAISE EXCEPTION 'This link expired. Try again.'; END IF;
  SELECT * INTO s FROM public.tenant_students WHERE id = lk.student_id FOR UPDATE;
  IF s.id IS NULL OR s.user_id IS DISTINCT FROM lk.started_by THEN RAISE EXCEPTION 'This link expired. Try again.'; END IF;
  IF public.tenant_user_in_center(s.institution_id, uid, s.id) THEN RAISE EXCEPTION 'That Google account is already used here.'; END IF;
  UPDATE public.tenant_students SET user_id = uid, google_user_id = uid, google_email = mail, email = coalesce(nullif(email, ''), mail),
    password_user_id = coalesce(password_user_id, nullif(lk.started_by, s.google_user_id)) WHERE id = s.id;
  DELETE FROM public.tenant_google_links WHERE token_hash = lk.token_hash;
  RETURN jsonb_build_object('ok', true, 'student_id', s.id);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'That Google account is already used here.';
END $$;

CREATE OR REPLACE FUNCTION public.tenant_give_google_time(_student uuid) RETURNS date
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE inst uuid; d date;
BEGIN
  SELECT institution_id INTO inst FROM public.tenant_students WHERE id = _student;
  IF inst IS NULL OR NOT public.tenant_has_role(inst, 'center_admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.tenant_students SET google_due_on = greatest(google_due_on, current_date) + 7 WHERE id = _student RETURNING google_due_on INTO d;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_switch_to_phone(_student uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.tenant_students;
BEGIN
  SELECT * INTO s FROM public.tenant_students WHERE id = _student FOR UPDATE;
  IF s.id IS NULL OR NOT public.tenant_has_role(s.institution_id, 'center_admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF s.user_id IS NULL OR s.google_user_id IS NULL OR s.user_id <> s.google_user_id THEN
    RAISE EXCEPTION 'This student already signs in with their phone.';
  END IF;
  -- Keeps email, google_email and google_user_id (the center still sends announcements there). Null = student sets a new password.
  UPDATE public.tenant_students SET user_id = password_user_id WHERE id = s.id;
  RETURN jsonb_build_object('ok', true, 'student_id', s.id);
END $$;

REVOKE ALL ON FUNCTION public.tenant_open_center(text), public.tenant_user_in_center(uuid, uuid, uuid), public.tenant_jwt_is_google() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tenant_join_with_google(text, text, text, text, text, text), public.tenant_claim_with_google(text, text),
  public.tenant_google_link_start(uuid), public.tenant_google_link_finish(text), public.tenant_give_google_time(uuid), public.tenant_switch_to_phone(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_join_with_google(text, text, text, text, text, text), public.tenant_claim_with_google(text, text),
  public.tenant_google_link_start(uuid), public.tenant_google_link_finish(text), public.tenant_give_google_time(uuid), public.tenant_switch_to_phone(uuid)
  TO authenticated;
