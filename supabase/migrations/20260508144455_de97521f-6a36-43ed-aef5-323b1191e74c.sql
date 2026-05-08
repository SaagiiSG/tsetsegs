CREATE TABLE public.desmos_usage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id uuid NOT NULL,
  question_id uuid,
  context text,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  duration_seconds integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_desmos_usage_student_question ON public.desmos_usage_events(student_account_id, question_id);
CREATE INDEX idx_desmos_usage_opened_at ON public.desmos_usage_events(opened_at DESC);

ALTER TABLE public.desmos_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert desmos events"
ON public.desmos_usage_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "Public can update desmos events"
ON public.desmos_usage_events FOR UPDATE
USING (true);

CREATE POLICY "Staff can view desmos events"
ON public.desmos_usage_events FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role));

CREATE POLICY "Admins can manage desmos events"
ON public.desmos_usage_events FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));