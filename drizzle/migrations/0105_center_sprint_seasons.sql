-- Center sprints run on their own (Saagii, 30 Oct): the center admin starts the first sprint, then each sprint is
-- followed by the next with the same length, in seasons of 3, like the main site's autopilot.
-- No schedule needed: tenant_sprints_current() moves sprints along whenever anyone in the center loads them.
-- It finishes every active sprint whose end date has passed (the existing rank snapshot trigger then moves tiers),
-- and starts the next one only for sprints in the cycle (auto_next). Paused sprints are left alone.

ALTER TABLE public.tenant_sprints
  ADD COLUMN season_number integer CHECK (season_number > 0),
  ADD COLUMN sprint_number integer CHECK (sprint_number BETWEEN 1 AND 3),
  ADD COLUMN auto_next boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.tenant_sprints_current(_institution uuid)
RETURNS SETOF public.tenant_sprints LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cur public.tenant_sprints; tz text; today date; n integer := 0;
BEGIN
  -- Same readers as the "Center members view sprints" policy; anyone else gets nothing.
  IF NOT (public.tenant_has_role(_institution, 'teacher') OR public.tenant_my_student_id(_institution) IS NOT NULL
          OR public.has_role(auth.uid(), 'admin')) THEN
    RETURN;
  END IF;
  -- One caller moves this center's sprints at a time; the others just read.
  IF pg_try_advisory_xact_lock(hashtext('tenant_sprints_current:' || _institution::text)) THEN
    SELECT c.portal_settings->>'timezone' INTO tz FROM public.institution_customers c WHERE c.id = _institution;
    IF tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = tz) THEN tz := 'UTC'; END IF;
    today := (now() AT TIME ZONE tz)::date;
    LOOP
      SELECT * INTO cur FROM public.tenant_sprints s
        WHERE s.institution_id = _institution AND s.status = 'active' AND s.ends_on < today
        ORDER BY s.ends_on, s.created_at LIMIT 1;
      EXIT WHEN cur.id IS NULL OR n >= 500;
      n := n + 1;
      UPDATE public.tenant_sprints SET status = 'finished' WHERE id = cur.id;
      IF cur.auto_next THEN
        INSERT INTO public.tenant_sprints (institution_id, name, starts_on, ends_on, status, season_number, sprint_number, auto_next)
        SELECT _institution, format('Season %s · Sprint %s', ns, nn), cur.ends_on + 1, cur.ends_on + 1 + (cur.ends_on - cur.starts_on), 'active', ns, nn, true
        FROM (SELECT CASE WHEN coalesce(cur.sprint_number, 3) >= 3 THEN coalesce(cur.season_number, 0) + 1 ELSE cur.season_number END AS ns,
                     CASE WHEN coalesce(cur.sprint_number, 3) >= 3 THEN 1 ELSE cur.sprint_number + 1 END AS nn) x;
      END IF;
    END LOOP;
  END IF;
  RETURN QUERY SELECT * FROM public.tenant_sprints s WHERE s.institution_id = _institution ORDER BY s.starts_on DESC, s.created_at DESC LIMIT 50;
END $$;

REVOKE ALL ON FUNCTION public.tenant_sprints_current(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_sprints_current(uuid) TO authenticated;
