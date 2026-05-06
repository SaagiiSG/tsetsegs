ALTER VIEW public.ngee_session_taken_seats SET (security_invoker = false);

CREATE OR REPLACE VIEW public.ngee_session_taken_seats
WITH (security_barrier = true, security_invoker = false) AS
SELECT session_id, seat_number
FROM public.ngee_bookings
WHERE cancelled_at IS NULL;

GRANT SELECT ON public.ngee_session_taken_seats TO anon, authenticated;