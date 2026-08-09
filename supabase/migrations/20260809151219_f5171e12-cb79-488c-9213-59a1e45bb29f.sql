CREATE TABLE public.password_reset_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  CONSTRAINT password_reset_requests_status_check CHECK (status IN ('pending','approved','dismissed'))
);

CREATE UNIQUE INDEX password_reset_requests_one_pending
  ON public.password_reset_requests (student_account_id)
  WHERE status = 'pending';

CREATE INDEX password_reset_requests_status_created
  ON public.password_reset_requests (status, created_at DESC);

GRANT SELECT, UPDATE ON public.password_reset_requests TO authenticated;
GRANT ALL ON public.password_reset_requests TO service_role;

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reset requests"
  ON public.password_reset_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Staff can resolve reset requests"
  ON public.password_reset_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE TRIGGER password_reset_requests_updated_at
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();