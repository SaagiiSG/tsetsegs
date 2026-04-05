
CREATE TABLE public.registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  full_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_pending_phone UNIQUE (phone_number)
);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a registration request
CREATE POLICY "Anyone can insert registration requests"
  ON public.registration_requests
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only admins can view all requests
CREATE POLICY "Admins can manage registration requests"
  ON public.registration_requests
  FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Public can check their own request status by phone
CREATE POLICY "Anyone can view own registration request"
  ON public.registration_requests
  FOR SELECT
  TO public
  USING (true);
