UPDATE public.questions SET hide_from_practice = true WHERE question_id ILIKE 'BBK%' AND hide_from_practice = false;

CREATE OR REPLACE FUNCTION public.force_hide_bbk_from_practice()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.question_id ILIKE 'BBK%' THEN
    NEW.hide_from_practice := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_hide_bbk ON public.questions;
CREATE TRIGGER trg_force_hide_bbk
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.force_hide_bbk_from_practice();