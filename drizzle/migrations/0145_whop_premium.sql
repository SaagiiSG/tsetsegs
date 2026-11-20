-- Solo Premium through Whop (Saagii, 19 Nov 2026). The whop-webhook edge function calls whop_sync_membership() on every
-- membership.activated / membership.updated event, so Whop's own record decides plan and premium_until. Safe to run twice.
SET lock_timeout = '3s';
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_membership_id text;
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_updated_at timestamptz;

-- 0034's guard, now also keeping students off the two Whop columns.
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

-- One Whop membership's state onto its student. Returns what it did, for the webhook's log.
-- Premium runs to the end of the paid (or trial) period plus a day, so a late renewal event never locks a paying student.
-- Webhooks can arrive out of order: an event older than the last one applied for the same membership is skipped.
-- A membership that stops granting access only downgrades the student if it is the one we last applied, so ending an
-- old membership (or an admin-granted Premium with no membership) never takes Premium away.
CREATE OR REPLACE FUNCTION public.whop_sync_membership(_user uuid, _membership text, _status text, _period_end timestamptz, _updated_at timestamptz)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.solo_students;
BEGIN
  SELECT * INTO r FROM public.solo_students WHERE user_id = _user FOR UPDATE;
  IF NOT FOUND THEN RETURN 'no solo student'; END IF;
  IF r.whop_membership_id = _membership AND r.whop_updated_at >= _updated_at THEN RETURN 'stale'; END IF;
  -- Whop's SaaS guide: active, trialing and completed grant access; past_due, canceled, expired and the rest don't.
  -- canceling (in Whop's SDK, not its guide) keeps access to the period end, as the Terms promise after a cancel.
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
