ALTER TABLE public.seat_bookings ADD COLUMN check_in_code text;

-- Generate unique codes for existing bookings
UPDATE public.seat_bookings SET check_in_code = upper(substr(md5(random()::text), 1, 6)) WHERE check_in_code IS NULL;

-- We can drop check_in_code from review_sessions since it's no longer needed there
ALTER TABLE public.review_sessions DROP COLUMN IF EXISTS check_in_code;