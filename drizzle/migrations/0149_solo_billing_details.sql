-- Billing details for solo Premium (Saagii, 19 Nov 2026): the Billing page and the plan chip show trial or paid, monthly
-- or yearly, the period end and a pending cancel, all from the Whop membership as whop-webhook last saw it.
-- whop_sync_membership() (0145) gains two arguments with defaults, so the older five-argument whop-webhook call keeps
-- working until the new function deploys. Safe to run twice.
SET lock_timeout = '3s';
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_status text;
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_period_end timestamptz;
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_cancel_at_period_end boolean;
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS whop_billing_period_days integer;

-- 0145's guard, now also keeping students off the four new columns.
CREATE OR REPLACE FUNCTION public.guard_solo_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    NEW.updated_at := now(); RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.plan := 'free'; NEW.premium_until := NULL; NEW.whop_membership_id := NULL; NEW.whop_updated_at := NULL;
    NEW.whop_status := NULL; NEW.whop_period_end := NULL; NEW.whop_cancel_at_period_end := NULL; NEW.whop_billing_period_days := NULL;
  ELSE
    NEW.plan := OLD.plan; NEW.premium_until := OLD.premium_until; NEW.user_id := OLD.user_id; NEW.created_at := OLD.created_at;
    NEW.whop_membership_id := OLD.whop_membership_id; NEW.whop_updated_at := OLD.whop_updated_at;
    NEW.whop_status := OLD.whop_status; NEW.whop_period_end := OLD.whop_period_end;
    NEW.whop_cancel_at_period_end := OLD.whop_cancel_at_period_end; NEW.whop_billing_period_days := OLD.whop_billing_period_days;
  END IF;
  NEW.name := left(coalesce(NEW.name, ''), 80);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- 0145's function plus the billing details. Same stale and current-membership rules.
DROP FUNCTION IF EXISTS public.whop_sync_membership(uuid, text, text, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.whop_sync_membership(_user uuid, _membership text, _status text, _period_end timestamptz,
  _updated_at timestamptz, _cancel_at_period_end boolean DEFAULT NULL, _billing_period_days integer DEFAULT NULL)
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
      whop_membership_id = _membership, whop_updated_at = _updated_at, whop_status = _status, whop_period_end = _period_end,
      whop_cancel_at_period_end = _cancel_at_period_end, whop_billing_period_days = _billing_period_days
    WHERE user_id = _user;
    RETURN 'premium';
  END IF;
  IF r.whop_membership_id = _membership THEN
    UPDATE public.solo_students SET plan = 'free', premium_until = NULL, whop_updated_at = _updated_at, whop_status = _status,
      whop_period_end = _period_end, whop_cancel_at_period_end = _cancel_at_period_end, whop_billing_period_days = _billing_period_days
    WHERE user_id = _user;
    RETURN 'free';
  END IF;
  RETURN 'not the current membership';
END $$;
REVOKE ALL ON FUNCTION public.whop_sync_membership(uuid, text, text, timestamptz, timestamptz, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.whop_sync_membership(uuid, text, text, timestamptz, timestamptz, boolean, integer) TO service_role;
