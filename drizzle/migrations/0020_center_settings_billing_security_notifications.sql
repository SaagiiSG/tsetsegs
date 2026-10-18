CREATE OR REPLACE FUNCTION public.tenant_update_settings(_institution uuid, _settings jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v jsonb; logo text := nullif(trim(_settings->>'logo_url'), ''); days int; cutoff timestamptz;
BEGIN
  IF NOT (public.tenant_has_role(_institution, 'center_admin') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF logo IS NOT NULL AND NOT (logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' OR logo ~ '^https://') THEN logo := NULL; END IF;
  IF length(logo) > 250000 THEN RAISE EXCEPTION 'Logo is too large'; END IF;
  days := CASE WHEN (_settings->>'session_days') ~ '^(1|7|30|90)$' THEN (_settings->>'session_days')::int END;
  BEGIN cutoff := least((_settings->>'signout_before')::timestamptz, now()); EXCEPTION WHEN others THEN cutoff := NULL; END;
  v := jsonb_strip_nulls(jsonb_build_object(
    'display_name', left(nullif(trim(_settings->>'display_name'), ''), 80),
    'logo_url', logo,
    'brand_color', CASE WHEN (_settings->>'brand_color') ~ '^#[0-9a-fA-F]{6}$' THEN _settings->>'brand_color' END,
    'contact_email', left(nullif(trim(_settings->>'contact_email'), ''), 200),
    'billing_email', CASE WHEN trim(_settings->>'billing_email') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN left(trim(_settings->>'billing_email'), 200) END,
    'timezone', left(nullif(trim(_settings->>'timezone'), ''), 60),
    'session_days', days,
    'signout_before', cutoff,
    'notify_new_students', CASE WHEN jsonb_typeof(_settings->'notify_new_students') = 'boolean' THEN _settings->'notify_new_students' END,
    'notify_overdue', CASE WHEN jsonb_typeof(_settings->'notify_overdue') = 'boolean' THEN _settings->'notify_overdue' END,
    'notify_inactive', CASE WHEN jsonb_typeof(_settings->'notify_inactive') = 'boolean' THEN _settings->'notify_inactive' END
  ));
  UPDATE public.institution_customers SET portal_settings = v, updated_at = now() WHERE id = _institution;
  RETURN v;
END $function$;