REVOKE ALL ON public.investor_demo_sessions FROM anon, authenticated;
GRANT ALL ON public.investor_demo_sessions TO service_role;
COMMENT ON TABLE public.investor_demo_sessions IS 'Private capability-scoped demo records: no direct anon/authenticated table grants or policies. Access only through validated demo RPCs; expires after 15 minutes.';