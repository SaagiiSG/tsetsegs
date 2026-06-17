ALTER TABLE public.students ADD COLUMN previous_ielts_score NUMERIC(3,1);

GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
