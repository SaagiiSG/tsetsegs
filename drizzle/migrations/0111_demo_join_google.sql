-- Live demo (Saagii, 30 Oct): demo centers refuse 0110's Google and email paths. Real centers are unchanged: each
-- function below is 0110's body with one demo line added, and the REVOKE/GRANT lines are 0110's.
-- Join and claim with Google both go through tenant_open_center, so its line covers them; the link, switch-back and
-- extra-time RPCs check the student's center. (0108's demo_guard_login trigger would also refuse any real Google
-- account written onto a demo row; these lines say so first, in the demo's own words.)
SET lock_timeout = '3s';

CREATE OR REPLACE FUNCTION public.tenant_open_center(_slug text) RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE c public.institution_customers;
BEGIN
  SELECT * INTO c FROM public.institution_customers WHERE lower(slug) = lower(btrim(coalesce(_slug, ''))) AND portal_enabled AND status IS DISTINCT FROM 'churned';
  IF c.id IS NULL THEN RAISE EXCEPTION 'This center portal is not available.'; END IF;
  IF c.is_demo THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
  IF c.access_blocked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This center is paused because of an overdue payment, so new sign-ups are closed. Please contact your center.';
  END IF;
  RETURN c.id;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_google_link_start(_institution uuid) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sid uuid := public.tenant_my_student_id(_institution); tok text;
BEGIN
  IF auth.uid() IS NULL OR sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF public.is_demo_center(_institution) THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
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
  IF public.is_demo_center(s.institution_id) THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
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
  IF public.is_demo_center(inst) THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
  UPDATE public.tenant_students SET google_due_on = greatest(google_due_on, current_date) + 7 WHERE id = _student RETURNING google_due_on INTO d;
  RETURN d;
END $$;

CREATE OR REPLACE FUNCTION public.tenant_switch_to_phone(_student uuid) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.tenant_students;
BEGIN
  SELECT * INTO s FROM public.tenant_students WHERE id = _student FOR UPDATE;
  IF s.id IS NULL OR NOT public.tenant_has_role(s.institution_id, 'center_admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF public.is_demo_center(s.institution_id) THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
  IF s.user_id IS NULL OR s.google_user_id IS NULL OR s.user_id <> s.google_user_id THEN
    RAISE EXCEPTION 'This student already signs in with their phone.';
  END IF;
  -- Keeps email, google_email and google_user_id (the center still sends announcements there). Null = student sets a new password.
  UPDATE public.tenant_students SET user_id = password_user_id WHERE id = s.id;
  RETURN jsonb_build_object('ok', true, 'student_id', s.id);
END $$;

REVOKE ALL ON FUNCTION public.tenant_open_center(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tenant_google_link_start(uuid), public.tenant_google_link_finish(text), public.tenant_give_google_time(uuid), public.tenant_switch_to_phone(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_google_link_start(uuid), public.tenant_google_link_finish(text), public.tenant_give_google_time(uuid), public.tenant_switch_to_phone(uuid)
  TO authenticated;

-- The sample student starts with a verified email, so the "Connect your Google account" screen (CenterGoogleGate)
-- never stands between a visitor and the student portal. Only the flag: no address is stored, so nothing can be sent.
-- Same as 0109's demo_attach_logins plus email_verified_at; it is here, not in 0109, because 0110 adds the column.
CREATE OR REPLACE FUNCTION public.demo_attach_logins(_copy uuid, _admin uuid, _teacher uuid, _student uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst uuid;
BEGIN
  SELECT c.institution_id INTO inst FROM demo_copies c JOIN institution_customers i ON i.id = c.institution_id AND i.is_demo WHERE c.id = _copy;
  IF inst IS NULL THEN RAISE EXCEPTION 'Unknown demo copy'; END IF;
  UPDATE tenant_members SET user_id = _admin WHERE institution_id = inst AND email = 'daniel.brooks@demo.flowersos.co';
  UPDATE tenant_members SET user_id = _teacher WHERE institution_id = inst AND email = 'elena.rivera@demo.flowersos.co';
  UPDATE tenant_students SET user_id = _student, email_verified_at = now() WHERE institution_id = inst AND phone = '5550100';
  UPDATE demo_copies SET user_ids = ARRAY[_admin, _teacher, _student] WHERE id = _copy;
END $$;
REVOKE ALL ON FUNCTION public.demo_attach_logins(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_attach_logins(uuid, uuid, uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
