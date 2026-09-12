REVOKE ALL ON FUNCTION public.resolve_account_cohort(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_student_account_cohort() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resync_cohort_for_student() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resync_cohort_for_batch() FROM PUBLIC, anon, authenticated;