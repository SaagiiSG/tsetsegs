ALTER TABLE public.review_sessions ADD COLUMN check_in_code text;
ALTER TABLE public.seat_bookings ADD COLUMN checked_in_at timestamptz;