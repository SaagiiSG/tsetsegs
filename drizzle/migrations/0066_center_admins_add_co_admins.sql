-- Center admins can now add co-admins (tenant-accounts create_member), so they may also manage those rows,
-- e.g. deactivate a co-admin. Still only in centers they admin, never their own row, and never a role other
-- than teacher or center_admin. Platform admin stays in user_roles, which this does not touch.
DROP POLICY IF EXISTS "Center admins update their team" ON public.tenant_members;
CREATE POLICY "Center admins update their team" ON public.tenant_members FOR UPDATE TO authenticated
  USING (public.tenant_has_role(institution_id, 'center_admin') AND user_id <> auth.uid())
  WITH CHECK (public.tenant_has_role(institution_id, 'center_admin') AND user_id <> auth.uid() AND role IN ('teacher', 'center_admin'));

DO $$ BEGIN RAISE NOTICE '0066 applied: center admins can manage co-admins in their own center'; END $$;
