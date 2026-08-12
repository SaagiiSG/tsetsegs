DROP POLICY IF EXISTS "Students can read their own bug reports" ON public.bug_reports;
REVOKE SELECT ON public.bug_reports FROM anon;