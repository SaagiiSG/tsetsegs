
DO $$
DECLARE
  v_room text;
  rec record;
  v_course_id uuid;
  v_session_dt timestamptz;
  tz text := 'Asia/Ulaanbaatar';
BEGIN
  SELECT room INTO v_room FROM public.ngee_courses WHERE is_active = true ORDER BY created_at LIMIT 1;

  FOR rec IN
    SELECT * FROM (VALUES
      ('Сэтгэл зүйч мэргэжилийн тухай'::text, DATE '2026-05-08'),
      ('Үерхлийн хил хязгаар',               DATE '2026-05-13'),
      ('College Application явуулах зөвлөгөө', DATE '2026-05-20'),
      ('Сэтгэцийн эрүүл мэндээ анхаарах зөвлөгөө', DATE '2026-05-27')
    ) AS t(name, d)
  LOOP
    SELECT id INTO v_course_id FROM public.ngee_courses WHERE name = rec.name LIMIT 1;
    IF v_course_id IS NULL THEN
      INSERT INTO public.ngee_courses(name, is_active, start_date, start_time, end_time, weekdays, total_seats, room, booking_opens_hour, booking_closes_hours_before)
      VALUES (rec.name, true, rec.d, '18:20', '20:00', ARRAY[EXTRACT(ISODOW FROM rec.d)::int], 25, v_room, 8, 1)
      RETURNING id INTO v_course_id;
    END IF;

    v_session_dt := ((rec.d::text || ' 18:20')::timestamp) AT TIME ZONE tz;

    IF NOT EXISTS (SELECT 1 FROM public.ngee_sessions WHERE course_id = v_course_id AND session_date = v_session_dt) THEN
      INSERT INTO public.ngee_sessions(course_id, session_date, session_end_date, booking_opens_at, booking_closes_at, total_seats)
      VALUES (
        v_course_id,
        v_session_dt,
        ((rec.d::text || ' 20:00')::timestamp) AT TIME ZONE tz,
        now(),
        v_session_dt - interval '1 hour',
        25
      );
    END IF;
  END LOOP;
END $$;
