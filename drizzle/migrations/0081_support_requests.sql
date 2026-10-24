-- In-app support inbox: center staff send requests from the portal (support@flowersos.co bounced).
-- Rows are written only by submit_support_request; platform admins read and close them at /admin/support,
-- and the notify-support-request function emails the owner once per row by claiming notified_at.
CREATE TABLE public.support_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  institution_id uuid REFERENCES public.institution_customers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_at timestamptz,
  notified_at timestamptz
);
CREATE INDEX support_requests_user_created ON public.support_requests (user_id, created_at DESC);
-- No direct inserts or deletes: rows come only from submit_support_request.
REVOKE ALL ON public.support_requests FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read support requests" ON public.support_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Requesters read their own support requests" ON public.support_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Platform admins update support requests" ON public.support_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Membership is checked directly, not with tenant_has_role: that refuses blocked (unpaid) centers,
-- and their staff are the ones who most need to reach us.
CREATE FUNCTION public.support_can_contact(_institution uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tenant_members WHERE institution_id = _institution AND user_id = auth.uid() AND active)
$$;

CREATE FUNCTION public.submit_support_request(_institution uuid, _subject text, _message text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.tenant_members; new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO m FROM public.tenant_members WHERE institution_id = _institution AND user_id = auth.uid() AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only center staff can contact FlowersOS. Please ask your center.'; END IF;
  _subject := trim(coalesce(_subject, '')); _message := trim(coalesce(_message, ''));
  IF length(_subject) NOT BETWEEN 3 AND 150 OR length(_message) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'Add a subject (3 to 150 characters) and a message (10 to 4000 characters).';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('support_request:' || auth.uid()));
  IF (SELECT count(*) FROM public.support_requests WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'You have sent 5 requests in the last hour. Please try again later.';
  END IF;
  INSERT INTO public.support_requests (institution_id, user_id, role, name, email, subject, message)
  VALUES (_institution, auth.uid(), m.role, m.display_name, m.email, _subject, _message) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

REVOKE ALL ON FUNCTION public.support_can_contact(uuid), public.submit_support_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.support_can_contact(uuid), public.submit_support_request(uuid, text, text) TO authenticated;

DO $$ BEGIN RAISE NOTICE '0097 applied: support_requests inbox'; END $$;
