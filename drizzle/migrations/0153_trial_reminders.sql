-- Trial reminder emails (Saagii, 20 Nov 2026: the Terms promise "We remind you before the trial ends"). Every hour the
-- trial-reminders edge function claims the solo students whose Whop trial ends within 2 days, isn't canceled and
-- hasn't been reminded for this end date, and emails them. The claim is one UPDATE, so a second or concurrent run never
-- sends twice; a failed send is unclaimed for the next hour. Safe to run twice.
SET lock_timeout = '3s';
ALTER TABLE public.solo_students ADD COLUMN IF NOT EXISTS trial_reminded_for timestamptz;

-- 0149's guard, now also keeping students off trial_reminded_for.
CREATE OR REPLACE FUNCTION public.guard_solo_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    NEW.updated_at := now(); RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.plan := 'free'; NEW.premium_until := NULL; NEW.whop_membership_id := NULL; NEW.whop_updated_at := NULL;
    NEW.whop_status := NULL; NEW.whop_period_end := NULL; NEW.whop_cancel_at_period_end := NULL; NEW.whop_billing_period_days := NULL;
    NEW.trial_reminded_for := NULL;
  ELSE
    NEW.plan := OLD.plan; NEW.premium_until := OLD.premium_until; NEW.user_id := OLD.user_id; NEW.created_at := OLD.created_at;
    NEW.whop_membership_id := OLD.whop_membership_id; NEW.whop_updated_at := OLD.whop_updated_at;
    NEW.whop_status := OLD.whop_status; NEW.whop_period_end := OLD.whop_period_end;
    NEW.whop_cancel_at_period_end := OLD.whop_cancel_at_period_end; NEW.whop_billing_period_days := OLD.whop_billing_period_days;
    NEW.trial_reminded_for := OLD.trial_reminded_for;
  END IF;
  NEW.name := left(coalesce(NEW.name, ''), 80);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Marks and returns the students due a reminder. Row locks make a concurrent run wait, then see the mark and skip.
CREATE OR REPLACE FUNCTION public.claim_trial_reminders()
RETURNS TABLE (user_id uuid, email text, name text, period_end timestamptz, billing_period_days integer)
LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.solo_students s SET trial_reminded_for = s.whop_period_end
  WHERE s.plan = 'premium' AND s.whop_status = 'trialing' AND NOT coalesce(s.whop_cancel_at_period_end, false)
    AND s.whop_period_end > now() AND s.whop_period_end <= now() + interval '2 days'
    AND s.trial_reminded_for IS DISTINCT FROM s.whop_period_end
    AND coalesce(s.email, '') <> ''
  RETURNING s.user_id, s.email, s.name, s.whop_period_end, s.whop_billing_period_days;
$$;

-- A send that failed goes back in the queue for the next run, unless the trial has moved on since.
CREATE OR REPLACE FUNCTION public.unclaim_trial_reminder(_user uuid, _period_end timestamptz)
RETURNS void LANGUAGE sql VOLATILE SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.solo_students SET trial_reminded_for = NULL WHERE user_id = _user AND trial_reminded_for = _period_end;
$$;

REVOKE ALL ON FUNCTION public.claim_trial_reminders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unclaim_trial_reminder(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_trial_reminders() TO service_role;
GRANT EXECUTE ON FUNCTION public.unclaim_trial_reminder(uuid, timestamptz) TO service_role;

-- Hourly, a quarter past (the sprint autopilot runs on the hour). cron.schedule replaces a job of the same name.
SELECT cron.schedule('trial-reminders-hourly', '15 * * * *', $$select public._post_edge_function('trial-reminders', '{}'::jsonb);$$);
