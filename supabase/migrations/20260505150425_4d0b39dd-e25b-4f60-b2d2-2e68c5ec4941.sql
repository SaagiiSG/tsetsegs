
-- 1. Courses
CREATE TABLE public.ngee_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  room text,
  total_seats int NOT NULL DEFAULT 25,
  weekdays int[] NOT NULL DEFAULT ARRAY[3,5],
  start_time time NOT NULL DEFAULT '16:30',
  end_time time NOT NULL DEFAULT '18:00',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  booking_opens_hour int NOT NULL DEFAULT 8,
  booking_closes_hours_before int NOT NULL DEFAULT 2,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ngee_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active ngee courses" ON public.ngee_courses
  FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins manage ngee courses" ON public.ngee_courses
  FOR ALL TO public USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 2. Sessions
CREATE TABLE public.ngee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.ngee_courses(id) ON DELETE CASCADE,
  session_date timestamptz NOT NULL,
  session_end_date timestamptz NOT NULL,
  booking_opens_at timestamptz NOT NULL,
  booking_closes_at timestamptz NOT NULL,
  total_seats int NOT NULL DEFAULT 25,
  is_cancelled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, session_date)
);
ALTER TABLE public.ngee_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view ngee sessions" ON public.ngee_sessions
  FOR SELECT TO public USING (is_cancelled = false);
CREATE POLICY "Admins manage ngee sessions" ON public.ngee_sessions
  FOR ALL TO public USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3. Bookings
CREATE TABLE public.ngee_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ngee_sessions(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  seat_number int NOT NULL,
  check_in_code text NOT NULL,
  attended boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  checked_in_by text,
  booked_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
ALTER TABLE public.ngee_bookings ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_ngee_unique_seat ON public.ngee_bookings(session_id, seat_number) WHERE cancelled_at IS NULL;
CREATE UNIQUE INDEX idx_ngee_unique_phone ON public.ngee_bookings(session_id, phone) WHERE cancelled_at IS NULL;
CREATE UNIQUE INDEX idx_ngee_unique_code ON public.ngee_bookings(session_id, check_in_code) WHERE cancelled_at IS NULL;

-- BEFORE INSERT: validate window + generate hex code
CREATE OR REPLACE FUNCTION public.ngee_validate_and_codegen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
      candidate := upper(substring(encode(gen_random_bytes(3),'hex') from 1 for 4));
      IF NOT EXISTS (SELECT 1 FROM public.ngee_bookings WHERE session_id = NEW.session_id AND check_in_code = candidate AND cancelled_at IS NULL) THEN
        NEW.check_in_code := candidate;
        EXIT;
      END IF;
      IF attempt > 20 THEN RAISE EXCEPTION 'Could not generate unique code'; END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_ngee_validate_and_codegen
  BEFORE INSERT ON public.ngee_bookings
  FOR EACH ROW EXECUTE FUNCTION public.ngee_validate_and_codegen();

-- Public can insert; trigger enforces window
CREATE POLICY "Public can insert ngee bookings" ON public.ngee_bookings
  FOR INSERT TO public WITH CHECK (true);

-- Admins + teachers see all
CREATE POLICY "Staff can view ngee bookings" ON public.ngee_bookings
  FOR SELECT TO public USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));
CREATE POLICY "Staff can update ngee bookings" ON public.ngee_bookings
  FOR UPDATE TO public USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role));
CREATE POLICY "Admins can delete ngee bookings" ON public.ngee_bookings
  FOR DELETE TO public USING (has_role(auth.uid(),'admin'::app_role));

-- Public view: only seat_number per session (no names/phones/codes)
CREATE OR REPLACE VIEW public.ngee_session_taken_seats
WITH (security_invoker = true) AS
SELECT session_id, seat_number
FROM public.ngee_bookings
WHERE cancelled_at IS NULL;

GRANT SELECT ON public.ngee_session_taken_seats TO anon, authenticated;

-- Public RPC: lookup own booking by phone
CREATE OR REPLACE FUNCTION public.ngee_lookup_booking(p_session_id uuid, p_phone text)
RETURNS TABLE(id uuid, seat_number int, check_in_code text, first_name text, last_name text, attended boolean, cancelled_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, seat_number, check_in_code, first_name, last_name, attended, cancelled_at
  FROM public.ngee_bookings
  WHERE session_id = p_session_id AND phone = p_phone AND cancelled_at IS NULL
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.ngee_lookup_booking(uuid, text) TO anon, authenticated;

-- Public RPC: cancel own booking via phone (until booking_closes_at)
CREATE OR REPLACE FUNCTION public.ngee_cancel_booking(p_session_id uuid, p_phone text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s record;
BEGIN
  SELECT * INTO s FROM public.ngee_sessions WHERE id = p_session_id;
  IF s.id IS NULL THEN RETURN false; END IF;
  IF now() > s.booking_closes_at THEN RAISE EXCEPTION 'Cancellation window closed'; END IF;
  UPDATE public.ngee_bookings
  SET cancelled_at = now()
  WHERE session_id = p_session_id AND phone = p_phone AND cancelled_at IS NULL;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ngee_cancel_booking(uuid, text) TO anon, authenticated;

-- Staff RPC: check in by hex code
CREATE OR REPLACE FUNCTION public.ngee_check_in_by_code(p_session_id uuid, p_code text)
RETURNS TABLE(id uuid, first_name text, last_name text, seat_number int, already_checked boolean, checked_in_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record;
  was_checked boolean;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO b FROM public.ngee_bookings
    WHERE session_id = p_session_id AND upper(check_in_code) = upper(p_code) AND cancelled_at IS NULL
    LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'Code not found'; END IF;
  was_checked := b.attended;
  IF NOT was_checked THEN
    UPDATE public.ngee_bookings
      SET attended = true, checked_in_at = now(), checked_in_by = COALESCE(get_current_teacher_username(), 'admin')
      WHERE id = b.id
      RETURNING attended, checked_in_at INTO b.attended, b.checked_in_at;
  END IF;
  RETURN QUERY SELECT b.id, b.first_name, b.last_name, b.seat_number, was_checked, b.checked_in_at;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ngee_check_in_by_code(uuid, text) TO authenticated;

-- Staff RPC: undo check-in
CREATE OR REPLACE FUNCTION public.ngee_undo_check_in(p_booking_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.ngee_bookings SET attended = false, checked_in_at = NULL, checked_in_by = NULL WHERE id = p_booking_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ngee_undo_check_in(uuid) TO authenticated;

-- Session generator
CREATE OR REPLACE FUNCTION public.generate_ngee_sessions(p_course_id uuid, p_weeks_ahead int DEFAULT 12)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
  d date;
  end_d date;
  inserted_count int := 0;
  session_dt timestamptz;
  session_end_dt timestamptz;
  open_at timestamptz;
  close_at timestamptz;
BEGIN
  SELECT * INTO c FROM public.ngee_courses WHERE id = p_course_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Course not found'; END IF;
  d := GREATEST(c.start_date, CURRENT_DATE);
  end_d := CURRENT_DATE + (p_weeks_ahead * 7);
  WHILE d <= end_d LOOP
    -- ISODOW: Mon=1..Sun=7
    IF EXTRACT(ISODOW FROM d)::int = ANY(c.weekdays) THEN
      session_dt := (d::text || ' ' || c.start_time::text)::timestamptz;
      session_end_dt := (d::text || ' ' || c.end_time::text)::timestamptz;
      open_at := (d::text || ' ' || lpad(c.booking_opens_hour::text,2,'0') || ':00')::timestamptz;
      close_at := session_dt - (c.booking_closes_hours_before || ' hours')::interval;
      BEGIN
        INSERT INTO public.ngee_sessions(course_id, session_date, session_end_date, booking_opens_at, booking_closes_at, total_seats)
        VALUES (c.id, session_dt, session_end_dt, open_at, close_at, c.total_seats);
        inserted_count := inserted_count + 1;
      EXCEPTION WHEN unique_violation THEN
        -- skip existing
      END;
    END IF;
    d := d + 1;
  END LOOP;
  RETURN inserted_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.generate_ngee_sessions(uuid, int) TO authenticated;

-- Seed: course + 12 weeks of sessions
DO $$
DECLARE
  new_course_id uuid;
BEGIN
  INSERT INTO public.ngee_courses(name, room, total_seats, weekdays, start_time, end_time, start_date)
  VALUES ('National Generalized Entrance Exam', '1105', 25, ARRAY[3,5], '16:30', '18:00', CURRENT_DATE)
  RETURNING id INTO new_course_id;
  PERFORM public.generate_ngee_sessions(new_course_id, 12);
END $$;
