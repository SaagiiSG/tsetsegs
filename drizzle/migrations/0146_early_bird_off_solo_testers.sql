-- Early bird off (Saagii, 19 Nov 2026): /solo stops taking emails, so join_early_bird goes. The list stays, because
-- whop-checkout still gives those emails the 14-day plans. Sign-up stays closed (0134) until Whop takes real cards, but
-- emails in solo_testers can join, so Premium can be tested in Whop's sandbox from a new account. solo_join() is 0134's
-- with that one change; CREATE OR REPLACE keeps 0127's grant to authenticated. Safe to run twice.
SET lock_timeout = '3s';
DROP FUNCTION IF EXISTS public.join_early_bird(text);

-- No grants to anon or authenticated and no policies: only solo_join() (SECURITY DEFINER) and the service role read it.
CREATE TABLE IF NOT EXISTS public.solo_testers (email text PRIMARY KEY CHECK (email = lower(btrim(email))));
ALTER TABLE public.solo_testers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.solo_testers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.solo_testers TO service_role;
INSERT INTO public.solo_testers (email) VALUES ('saranochir.sergelen@gmail.com') ON CONFLICT (email) DO NOTHING;

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
  -- Sign-up closed for now (Saagii, 13 Nov 2026): solo students who already joined sign in as before (above);
  -- nobody new joins except the emails in solo_testers (19 Nov). To reopen, drop this IF; the rest is unchanged.
  IF NOT EXISTS (SELECT 1 FROM public.solo_testers WHERE email = mail) THEN
    RAISE EXCEPTION 'Solo sign-up is closed for now';
  END IF;
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
