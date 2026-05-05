
-- Fix NGEE session generator to use Mongolia timezone (Asia/Ulaanbaatar, UTC+8)
CREATE OR REPLACE FUNCTION public.generate_ngee_sessions(p_course_id uuid, p_weeks_ahead integer DEFAULT 12)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c record;
  d date;
  end_d date;
  inserted_count int := 0;
  session_dt timestamptz;
  session_end_dt timestamptz;
  open_at timestamptz;
  close_at timestamptz;
  tz text := 'Asia/Ulaanbaatar';
BEGIN
  SELECT * INTO c FROM public.ngee_courses WHERE id = p_course_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Course not found'; END IF;
  d := GREATEST(c.start_date, CURRENT_DATE);
  end_d := CURRENT_DATE + (p_weeks_ahead * 7);
  WHILE d <= end_d LOOP
    IF EXTRACT(ISODOW FROM d)::int = ANY(c.weekdays) THEN
      session_dt := ((d::text || ' ' || c.start_time::text)::timestamp) AT TIME ZONE tz;
      session_end_dt := ((d::text || ' ' || c.end_time::text)::timestamp) AT TIME ZONE tz;
      open_at := ((d::text || ' ' || lpad(c.booking_opens_hour::text,2,'0') || ':00')::timestamp) AT TIME ZONE tz;
      close_at := session_dt - (c.booking_closes_hours_before || ' hours')::interval;
      BEGIN
        INSERT INTO public.ngee_sessions(course_id, session_date, session_end_date, booking_opens_at, booking_closes_at, total_seats)
        VALUES (c.id, session_dt, session_end_dt, open_at, close_at, c.total_seats);
        inserted_count := inserted_count + 1;
      EXCEPTION WHEN unique_violation THEN
      END;
    END IF;
    d := d + 1;
  END LOOP;
  RETURN inserted_count;
END;
$function$;

-- Fix already-generated sessions: shift -8 hours so 16:30 UTC becomes 08:30 UTC (= 16:30 Mongolia)
UPDATE public.ngee_sessions
SET session_date = session_date - interval '8 hours',
    session_end_date = session_end_date - interval '8 hours',
    booking_closes_at = booking_closes_at - interval '8 hours',
    booking_opens_at = CASE
      -- For sessions where opens_at was set from booking_opens_hour (08:00 UTC), shift to Mongolia 08:00 = 00:00 UTC of that day
      WHEN booking_opens_at::time = '08:00:00' THEN booking_opens_at - interval '8 hours'
      ELSE booking_opens_at
    END;
