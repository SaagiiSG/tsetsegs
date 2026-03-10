
-- 1. Review session templates (reusable presets)
CREATE TABLE public.review_session_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT 'SAT',
  total_seats integer NOT NULL DEFAULT 20,
  room text,
  session_times jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_session_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage templates" ON public.review_session_templates
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active templates" ON public.review_session_templates
  FOR SELECT TO public USING (is_active = true);

-- 2. Review sessions (individual instances)
CREATE TABLE public.review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.review_session_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  subject text NOT NULL DEFAULT 'SAT',
  session_date timestamptz NOT NULL,
  total_seats integer NOT NULL DEFAULT 20,
  room text,
  booking_closes_at timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sessions" ON public.review_sessions
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active sessions" ON public.review_sessions
  FOR SELECT TO public USING (is_active = true);

-- 3. Seat bookings
CREATE TABLE public.seat_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_session_id uuid NOT NULL REFERENCES public.review_sessions(id) ON DELETE CASCADE,
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  seat_number integer NOT NULL,
  booked_at timestamptz NOT NULL DEFAULT now(),
  attended boolean,
  cancelled_at timestamptz
);

ALTER TABLE public.seat_bookings ENABLE ROW LEVEL SECURITY;

-- Partial unique index: one seat per session (only non-cancelled)
CREATE UNIQUE INDEX idx_unique_seat_per_session 
  ON public.seat_bookings (review_session_id, seat_number) 
  WHERE cancelled_at IS NULL;

-- One booking per student per session (only non-cancelled)
CREATE UNIQUE INDEX idx_unique_student_per_session 
  ON public.seat_bookings (review_session_id, student_account_id) 
  WHERE cancelled_at IS NULL;

CREATE POLICY "Admins can manage bookings" ON public.seat_bookings
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view bookings" ON public.seat_bookings
  FOR SELECT TO public USING (true);

CREATE POLICY "Public can insert bookings" ON public.seat_bookings
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Public can update own bookings" ON public.seat_bookings
  FOR UPDATE TO public USING (true);

-- 4. Booking bans
CREATE TABLE public.booking_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  banned_until timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bans" ON public.booking_bans
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view bans" ON public.booking_bans
  FOR SELECT TO public USING (true);

CREATE POLICY "Public can insert bans" ON public.booking_bans
  FOR INSERT TO public WITH CHECK (true);
