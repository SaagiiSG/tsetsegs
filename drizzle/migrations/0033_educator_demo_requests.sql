CREATE TABLE public.educator_demo_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, institution_name text NOT NULL, email text NOT NULL, phone text NOT NULL, country text NOT NULL DEFAULT '', student_count integer NOT NULL, message text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'new', approved_at timestamptz, payment_confirmed_at timestamptz, reviewed_by uuid, institution_id uuid REFERENCES public.institution_customers(id), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.educator_demo_requests TO authenticated;
GRANT ALL ON public.educator_demo_requests TO service_role;
ALTER TABLE public.educator_demo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform admins read demo requests" ON public.educator_demo_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX educator_demo_requests_created ON public.educator_demo_requests(created_at DESC);
CREATE INDEX educator_demo_requests_institution ON public.educator_demo_requests(institution_id);
CREATE FUNCTION public.submit_educator_demo_request(_name text, _institution text, _email text, _phone text, _country text, _students integer, _message text, _website text DEFAULT '') RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE new_id uuid;
BEGIN
 IF coalesce(_website,'') <> '' THEN RAISE EXCEPTION 'Invalid request'; END IF;
 IF _name IS NULL OR length(trim(_name)) NOT BETWEEN 2 AND 100 OR _institution IS NULL OR length(trim(_institution)) NOT BETWEEN 2 AND 150 OR _email IS NULL OR length(_email)>255 OR trim(_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR _phone IS NULL OR length(trim(_phone)) NOT BETWEEN 5 AND 30 OR trim(_phone) !~ '^[+0-9() -]+$' OR _country IS NULL OR length(_country)>100 OR _students IS NULL OR _students NOT BETWEEN 1 AND 100000 OR _message IS NULL OR length(_message)>2000 THEN RAISE EXCEPTION 'Please check your application details'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(lower(trim(_email))));
 IF EXISTS(SELECT 1 FROM public.educator_demo_requests WHERE lower(email)=lower(trim(_email)) AND created_at>now()-interval '24 hours') THEN RAISE EXCEPTION 'A request for this email was already received. Please wait for our team to contact you.'; END IF;
 IF (SELECT count(*) FROM public.educator_demo_requests WHERE created_at>now()-interval '1 hour')>=100 THEN RAISE EXCEPTION 'Requests are temporarily busy. Please try again later.'; END IF;
 INSERT INTO public.educator_demo_requests(name,institution_name,email,phone,country,student_count,message) VALUES(trim(_name),trim(_institution),lower(trim(_email)),trim(_phone),trim(_country),_students,trim(_message)) RETURNING id INTO new_id;
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_educator_demo_request(text,text,text,text,text,integer,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_educator_demo_request(text,text,text,text,text,integer,text,text) TO anon,authenticated;
CREATE FUNCTION public.review_educator_demo_request(_id uuid, _action text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.educator_demo_requests; customer_id uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
 SELECT * INTO r FROM public.educator_demo_requests WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
 IF _action='approve' THEN UPDATE public.educator_demo_requests SET approved_at=now(),status='approved',reviewed_by=auth.uid() WHERE id=_id;
 ELSIF _action='confirm_payment' THEN UPDATE public.educator_demo_requests SET payment_confirmed_at=now(),reviewed_by=auth.uid() WHERE id=_id;
 ELSIF _action='contacted' THEN UPDATE public.educator_demo_requests SET status='contacted',reviewed_by=auth.uid() WHERE id=_id;
 ELSIF _action='decline' THEN UPDATE public.educator_demo_requests SET status='declined',approved_at=NULL,reviewed_by=auth.uid() WHERE id=_id;
 ELSIF _action='revoke_payment' THEN UPDATE public.educator_demo_requests SET payment_confirmed_at=NULL,reviewed_by=auth.uid() WHERE id=_id;
 ELSIF _action='prepare_workspace' THEN
  IF r.approved_at IS NULL OR r.payment_confirmed_at IS NULL OR r.status='declined' THEN RAISE EXCEPTION 'Owner approval and confirmed payment are both required'; END IF;
  IF r.institution_id IS NOT NULL THEN RETURN r.institution_id; END IF;
  INSERT INTO public.institution_customers(name,country,contact_name,contact_email,status,notes,portal_enabled) VALUES(r.institution_name,r.country,r.name,r.email,'active','Educator demo application. Phone: '||r.phone,false) RETURNING id INTO customer_id;
  UPDATE public.educator_demo_requests SET institution_id=customer_id,status='ready',reviewed_by=auth.uid() WHERE id=_id;
  RETURN customer_id;
 ELSE RAISE EXCEPTION 'Invalid review action'; END IF;
 RETURN r.institution_id;
END $$;
REVOKE ALL ON FUNCTION public.review_educator_demo_request(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_educator_demo_request(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.tenant_has_role(_institution uuid, _role text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.tenant_members m JOIN public.institution_customers c ON c.id=m.institution_id WHERE m.institution_id=_institution AND m.user_id=auth.uid() AND m.active AND c.portal_enabled AND c.access_blocked_at IS NULL AND (_role='any' OR m.role=_role OR (_role='teacher' AND m.role='center_admin')) AND NOT EXISTS(SELECT 1 FROM public.educator_demo_requests r WHERE r.institution_id=c.id AND (r.approved_at IS NULL OR r.payment_confirmed_at IS NULL OR r.status='declined')))
$$;