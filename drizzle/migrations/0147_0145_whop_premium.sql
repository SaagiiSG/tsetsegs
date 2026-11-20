SET lock_timeout = '3s';
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_membership_id text;
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.guard_solo_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    NEW.updated_at := now(); RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.plan := 'free'; NEW.premium_until := NULL; NEW.whop_membership_id := NULL; NEW.whop_updated_at := NULL;
  ELSE
    NEW.plan := OLD.plan; NEW.premium_until := OLD.premium_until; NEW.user_id := OLD.user_id; NEW.created_at := OLD.created_at;
    NEW.whop_membership_id := OLD.whop_membership_id; NEW.whop_updated_at := OLD.whop_updated_at;
  END IF;
  NEW.name := left(coalesce(NEW.name, ''), 80);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.whop_sync_membership(_user uuid, _membership text, _status text, _period_end timestamptz, _updated_at timestamptz)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.solo_students;
BEGIN
  SELECT * INTO r FROM public.solo_students WHERE user_id = _user FOR UPDATE;
  IF NOT FOUND THEN RETURN 'no solo student'; END IF;
  IF r.whop_membership_id = _membership AND r.whop_updated_at >= _updated_at THEN RETURN 'stale'; END IF;
  IF _status IN ('active', 'trialing', 'completed', 'canceling') THEN
    UPDATE public.solo_students SET plan = 'premium', premium_until = _period_end + interval '1 day',
      whop_membership_id = _membership, whop_updated_at = _updated_at WHERE user_id = _user;
    RETURN 'premium';
  END IF;
  IF r.whop_membership_id = _membership THEN
    UPDATE public.solo_students SET plan = 'free', premium_until = NULL, whop_updated_at = _updated_at WHERE user_id = _user;
    RETURN 'free';
  END IF;
  RETURN 'not the current membership';
END $$;
REVOKE ALL ON FUNCTION public.whop_sync_membership(uuid, text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whop_sync_membership(uuid, text, text, timestamptz, timestamptz) TO service_role;