UPDATE public.ngee_sessions
SET booking_opens_at = ((CURRENT_DATE + 1)::text || ' 08:00')::timestamp AT TIME ZONE 'Asia/Ulaanbaatar'
WHERE session_date > now()
  AND booking_opens_at <= now();