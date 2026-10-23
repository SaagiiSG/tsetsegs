-- A blocked (unpaid) center's students get nothing from the database, like its staff since 0018.
-- Only access_blocked_at counts, so warned centers are unchanged. tenant_lookup and tenant_access_status
-- are untouched, so the portal still loads and shows its "Access paused" screen.

-- Every student policy and student RPC goes through this.
CREATE OR REPLACE FUNCTION public.tenant_my_student_id(_institution uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.tenant_students s JOIN public.institution_customers c ON c.id = s.institution_id
  WHERE s.institution_id = _institution AND s.user_id = auth.uid() AND s.active AND c.portal_enabled AND c.access_blocked_at IS NULL LIMIT 1
$$;

-- Students can't read institution_customers, so the policy below needs a definer helper.
CREATE OR REPLACE FUNCTION public.tenant_center_blocked(_institution uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.institution_customers WHERE id = _institution AND access_blocked_at IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION public.tenant_center_blocked(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tenant_center_blocked(uuid) TO authenticated;

-- Hiding the student's own row also empties "Students view their class", which reads tenant_students through this policy.
DROP POLICY IF EXISTS "Students view themselves" ON public.tenant_students;
CREATE POLICY "Students view themselves" ON public.tenant_students FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND NOT public.tenant_center_blocked(institution_id));

DO $$ BEGIN RAISE NOTICE '0063 applied: blocked centers'' students are locked out'; END $$;
