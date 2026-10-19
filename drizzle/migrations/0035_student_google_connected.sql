CREATE OR REPLACE FUNCTION public.student_google_connected()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.student_email_links WHERE student_account_id = public.request_student_id());
$$;
REVOKE ALL ON FUNCTION public.student_google_connected() FROM public;
GRANT EXECUTE ON FUNCTION public.student_google_connected() TO anon, authenticated;