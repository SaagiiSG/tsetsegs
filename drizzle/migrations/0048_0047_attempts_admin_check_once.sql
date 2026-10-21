
-- The admin check ran once per row, so a signed-out request scanned all ~818K
-- answers (about 3s, then a timeout) before returning nothing. Wrapping it in
-- SELECT makes Postgres run it once per query. Same rule, same access.
DROP POLICY IF EXISTS "Admins can manage student attempts" ON public.student_attempts;
CREATE POLICY "Admins can manage student attempts" ON public.student_attempts FOR ALL
  USING ((SELECT public.has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::app_role)));