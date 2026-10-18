ALTER TABLE public.institution_customers
  ADD COLUMN IF NOT EXISTS payment_warning_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_warning_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_blocked_at timestamptz;

CREATE OR REPLACE FUNCTION public.tenant_has_role(_institution uuid, _role text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.tenant_members m JOIN public.institution_customers c ON c.id = m.institution_id
    WHERE m.institution_id = _institution AND m.user_id = auth.uid() AND m.active AND c.portal_enabled AND c.access_blocked_at IS NULL
      AND (_role = 'any' OR m.role = _role OR (_role = 'teacher' AND m.role = 'center_admin')))
$function$;

CREATE OR REPLACE FUNCTION public.tenant_access_status(_slug text)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object('blocked', c.access_blocked_at IS NOT NULL, 'warnings', c.payment_warning_count, 'last_warning_at', c.last_warning_at)
  FROM public.institution_customers c WHERE lower(c.slug) = lower(_slug) LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.tenant_access_status(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_customer_warn(_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.institution_customers SET payment_warning_count = payment_warning_count + 1, last_warning_at = now()
  WHERE id = _id RETURNING payment_warning_count INTO n;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.admin_customer_set_blocked(_id uuid, _blocked boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.institution_customers
  SET access_blocked_at = CASE WHEN _blocked THEN now() ELSE NULL END,
      payment_warning_count = CASE WHEN _blocked THEN payment_warning_count ELSE 0 END
  WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_customer_activity()
 RETURNS TABLE(institution_id uuid, students bigint, attempts_7d bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT c.id,
    (SELECT count(*) FROM public.tenant_students s WHERE s.institution_id = c.id AND s.active),
    (SELECT count(*) FROM public.tenant_attempts a WHERE a.institution_id = c.id AND a.created_at > now() - interval '7 days')
  FROM public.institution_customers c;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_customer_warn(uuid), public.admin_customer_set_blocked(uuid, boolean), public.admin_customer_activity() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_warn(uuid), public.admin_customer_set_blocked(uuid, boolean), public.admin_customer_activity() TO authenticated;