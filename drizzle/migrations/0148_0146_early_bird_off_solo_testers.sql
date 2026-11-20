SET lock_timeout = '3s';
DROP FUNCTION IF EXISTS public.join_early_bird(text);

CREATE TABLE IF NOT EXISTS public.solo_testers (email text PRIMARY KEY CHECK (email = lower(btrim(email))));
ALTER TABLE public.solo_testers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solo_testers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.solo_testers TO service_role;
INSERT INTO public.solo_testers (email) VALUES ('saranochir.sergelen@gmail.com') ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.solo_join() RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); mail text := lower(btrim(coalesce(auth.jwt()->>'email', '')));
        inst uuid := public.solo_institution_id(); full_name text; w text[]; sid uuid;
        ws text := '[\s\u00a0\u2000-\u200b\u202f\u3000\ufeff]'; edges text := '^' || ws || '+|' || ws || '+$';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('solo_join:' || coalesce(uid::text, '')));
  IF uid IS NULL OR mail = '' OR public.is_platform_staff()
     OR EXISTS (SELECT 1 FROM public.tenant_members WHERE user_id = uid)
     OR EXISTS (SELECT 1 FROM public.tenant_students WHERE institution_id IS DISTINCT FROM inst AND uid IN (user_id, google_user_id, password_user_id))
     OR EXISTS (SELECT 1 FROM public.student_accounts WHERE auth_user_id = uid)
     OR EXISTS (SELECT 1 FROM public.student_email_links WHERE lower(email) = mail
                  OR google_sub IN (SELECT i.identity_data->>'sub' FROM auth.identities i WHERE i.user_id = uid AND i.provider = 'google')) THEN
    RAISE EXCEPTION 'This account can''t join solo';
  END IF;
  SELECT id INTO sid FROM public.tenant_students WHERE institution_id = inst AND user_id = uid;
  IF sid IS NOT NULL THEN RETURN sid; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.solo_testers WHERE email = mail) THEN
    RAISE EXCEPTION 'Solo sign-up is closed for now';
  END IF;
  IF nullif(current_setting('request.headers', true), '')::json->>'cf-ipcountry' = 'MN' THEN
    RAISE EXCEPTION 'Solo accounts are for students outside Mongolia';
  END IF;
  full_name := coalesce(nullif(regexp_replace(auth.jwt()->'user_metadata'->>'full_name', edges, '', 'g'), ''),
                        nullif(regexp_replace(auth.jwt()->'user_metadata'->>'name', edges, '', 'g'), ''));
  w := regexp_split_to_array(full_name, ws || '+');
  INSERT INTO public.tenant_students (institution_id, class_id, name, phone, user_id, active, email_verified_at)
  VALUES (inst, NULL, CASE WHEN full_name IS NULL THEN 'Solo student'
            ELSE left(w[1] || CASE WHEN array_length(w, 1) >= 2 THEN ' ' || upper(left(w[array_length(w, 1)], 1)) || '.' ELSE '' END, 100) END,
          'solo-' || uid, uid, true, now())
  RETURNING id INTO sid;
  INSERT INTO public.solo_students (user_id, name, email, provider)
  VALUES (uid, coalesce(full_name, split_part(mail, '@', 1)), mail, coalesce(auth.jwt()->'app_metadata'->>'provider', 'email'))
  ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, provider = EXCLUDED.provider;
  RETURN sid;
END $$;