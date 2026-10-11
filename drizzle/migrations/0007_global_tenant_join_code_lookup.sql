CREATE OR REPLACE FUNCTION public.tenant_join_lookup_global(_code text)
RETURNS TABLE(class_id uuid, class_name text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cl.id, cl.name, lower(c.slug) FROM public.tenant_classes cl JOIN public.institution_customers c ON c.id = cl.institution_id
  WHERE c.portal_enabled AND c.status <> 'churned' AND cl.join_code = _code LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.tenant_join_lookup_global(text) TO anon, authenticated;