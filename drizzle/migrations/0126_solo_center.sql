-- Solo portal, part 1 (Saagii, 10 Nov 2026): the solo portal is the center portal running for one built-in center
-- (slug 'solo', name 'flowersos', UTC). solo_join() turns the signed-in account into a tenant_students row of that
-- center, and is_free_solo_user() says when the caller is a solo student without premium (0127 narrows their reads).
-- Never narrow staff: platform staff, center staff, students of another center and main-app students (an auth account
-- linked to a student_accounts row) can't join, and is_free_solo_user() is false for them. No new solo accounts from
-- Mongolia (Cloudflare's cf-ipcountry header); an existing solo student still gets their id back.
-- The solo center is never billing-blocked, and its sprints run back to back in 21-day sprints. Safe to run twice.
SET lock_timeout = '3s';

-- 1. The center. A slug 'solo' that belongs to anything else stops the migration: adopting a real center would put
-- strangers on its roster.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.institution_customers WHERE lower(slug) = 'solo' AND (name <> 'flowersos' OR is_demo)) THEN
    RAISE EXCEPTION '0126: the slug solo already belongs to another center';
  END IF;
END $$;
INSERT INTO public.institution_customers (name, slug, status, portal_enabled, is_demo, portal_settings)
VALUES ('flowersos', 'solo', 'active', true, false, '{"timezone": "UTC"}'::jsonb)
ON CONFLICT (lower(slug)) WHERE slug IS NOT NULL DO NOTHING;

-- Definer: only admins read institution_customers, and 0127's read rules call this as the student.
CREATE OR REPLACE FUNCTION public.solo_institution_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.institution_customers WHERE lower(slug) = 'solo' AND NOT is_demo
$$;
-- anon too: main students read the banks as anon with their token (0093), so a read rule may call these for them.
REVOKE ALL ON FUNCTION public.solo_institution_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solo_institution_id() TO anon, authenticated, service_role;

-- 2. Who is a free solo user. Never NULL: 0127's read rules use it in NOT / AND.
CREATE OR REPLACE FUNCTION public.is_free_solo_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    EXISTS (SELECT 1 FROM public.tenant_students s WHERE s.institution_id = public.solo_institution_id() AND s.user_id = auth.uid() AND s.active)
    AND NOT public.solo_has_premium(auth.uid())
    AND NOT public.is_platform_staff()
    -- A center adds a solo student later: their center access is never narrowed.
    AND NOT EXISTS (SELECT 1 FROM public.tenant_members m WHERE m.user_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM public.tenant_students o WHERE o.user_id = auth.uid() AND o.active AND o.institution_id <> public.solo_institution_id()),
  false)
$$;
REVOKE ALL ON FUNCTION public.is_free_solo_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_free_solo_user() TO anon, authenticated, service_role;

-- 3. Joining. Identity comes only from the token; the function takes no arguments.
CREATE OR REPLACE FUNCTION public.solo_join() RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); mail text := lower(btrim(coalesce(auth.jwt()->>'email', '')));
        inst uuid := public.solo_institution_id(); full_name text; w text[]; sid uuid;
        -- Any whitespace: tabs, newlines, the non-breaking space and the other Unicode spaces.
        ws text := '[\s\u00a0\u2000-\u200b\u202f\u3000\ufeff]'; edges text := '^' || ws || '+|' || ws || '+$';
BEGIN
  -- Two tabs at once: the second waits, then finds the first one's row.
  PERFORM pg_advisory_xact_lock(hashtext('solo_join:' || coalesce(uid::text, '')));
  -- A main student's link is student_accounts.auth_user_id (the phone-login bridge) or their Google link in
  -- student_email_links (email + Google sub, written by the link-google-email function).
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
  -- The client shows its block screen when the message mentions Mongolia. A missing header lets the join through.
  IF nullif(current_setting('request.headers', true), '')::json->>'cf-ipcountry' = 'MN' THEN
    RAISE EXCEPTION 'Solo accounts are for students outside Mongolia';
  END IF;
  full_name := coalesce(nullif(regexp_replace(auth.jwt()->'user_metadata'->>'full_name', edges, '', 'g'), ''),
                        nullif(regexp_replace(auth.jwt()->'user_metadata'->>'name', edges, '', 'g'), ''));
  w := regexp_split_to_array(full_name, ws || '+');
  -- Board name: first name + last initial ("Saran Ochir Sergelen" -> "Saran S."), or 'Solo student' when the token has
  -- no name, so strangers never see an email username. The full name (or the email local part) stays in solo_students.
  INSERT INTO public.tenant_students (institution_id, class_id, name, phone, user_id, active, email_verified_at)
  VALUES (inst, NULL, CASE WHEN full_name IS NULL THEN 'Solo student'
            ELSE left(w[1] || CASE WHEN array_length(w, 1) >= 2 THEN ' ' || upper(left(w[array_length(w, 1)], 1)) || '.' ELSE '' END, 100) END,
          'solo-' || uid, uid, true, now())
  RETURNING id INTO sid;
  -- plan and premium_until are left to guard_solo_student (0034): free on insert, unchanged on update.
  INSERT INTO public.solo_students (user_id, name, email, provider)
  VALUES (uid, coalesce(full_name, split_part(mail, '@', 1)), mail, coalesce(auth.jwt()->'app_metadata'->>'provider', 'email'))
  ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, provider = EXCLUDED.provider;
  RETURN sid;
END $$;
-- Closed until 0127 fills the free tier and opens it; authenticated by name too, since Supabase grants new functions to it.
REVOKE ALL ON FUNCTION public.solo_join() FROM PUBLIC, anon, authenticated;

-- 4. Never billing-blocked: 0018's function, refusing to block the solo center (unblocking it still works).
CREATE OR REPLACE FUNCTION public.admin_customer_set_blocked(_id uuid, _blocked boolean)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _blocked AND _id = public.solo_institution_id() THEN RAISE EXCEPTION 'The solo center can''t be blocked'; END IF;
  UPDATE public.institution_customers
  SET access_blocked_at = CASE WHEN _blocked THEN now() ELSE NULL END,
      payment_warning_count = CASE WHEN _blocked THEN payment_warning_count ELSE 0 END
  WHERE id = _id;
END $$;

-- 5. Season 1, Sprint 1: 21 days from today (UTC, the center's time zone), then tenant_sprints_current (0105) starts
-- the next one each time a sprint ends. Same row as "Start sprints" in src/portal/admin/ToolPages.tsx.
INSERT INTO public.tenant_sprints (institution_id, name, starts_on, ends_on, status, season_number, sprint_number, auto_next)
SELECT c.id, 'Season 1 · Sprint 1', t.d, t.d + 20, 'active', 1, 1, true
FROM public.institution_customers c, (SELECT (now() AT TIME ZONE 'UTC')::date AS d) t
WHERE c.id = public.solo_institution_id()
  AND NOT EXISTS (SELECT 1 FROM public.tenant_sprints s WHERE s.institution_id = c.id);

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE '0126 applied: solo center'; END $$;
