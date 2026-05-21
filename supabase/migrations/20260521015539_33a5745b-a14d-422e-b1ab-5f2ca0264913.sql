
CREATE TABLE public.sms_auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_key text NOT NULL,
  keyword text NOT NULL,
  reply_template text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sent_count integer NOT NULL DEFAULT 0,
  last_fired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sms_auto_replies_flow_keyword_uniq
  ON public.sms_auto_replies (flow_key, lower(keyword));
ALTER TABLE public.sms_auto_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sms_auto_replies" ON public.sms_auto_replies
  FOR ALL USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_sms_auto_replies_updated_at
  BEFORE UPDATE ON public.sms_auto_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
