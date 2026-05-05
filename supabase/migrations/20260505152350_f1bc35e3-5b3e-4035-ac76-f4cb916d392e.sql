CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.ngee_validate_and_codegen()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  s record;
  attempt int := 0;
  candidate text;
BEGIN
  SELECT * INTO s FROM public.ngee_sessions WHERE id = NEW.session_id;
  IF s.id IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF s.is_cancelled THEN RAISE EXCEPTION 'Session is cancelled'; END IF;
  IF now() < s.booking_opens_at THEN
    RAISE EXCEPTION 'Booking is not open yet. Opens at %', s.booking_opens_at;
  END IF;
  IF now() > s.booking_closes_at THEN
    RAISE EXCEPTION 'Booking is closed';
  END IF;
  IF NEW.seat_number < 1 OR NEW.seat_number > s.total_seats THEN
    RAISE EXCEPTION 'Invalid seat number';
  END IF;

  IF NEW.check_in_code IS NULL OR NEW.check_in_code = '' THEN
    LOOP
      attempt := attempt + 1;
      candidate := upper(substring(encode(extensions.gen_random_bytes(3),'hex') from 1 for 4));
      IF NOT EXISTS (SELECT 1 FROM public.ngee_bookings WHERE session_id = NEW.session_id AND check_in_code = candidate AND cancelled_at IS NULL) THEN
        NEW.check_in_code := candidate;
        EXIT;
      END IF;
      IF attempt > 20 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;