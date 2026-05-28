GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_email_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_email_links TO anon;
GRANT ALL ON public.student_email_links TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO anon;
GRANT ALL ON public.announcement_reads TO service_role;