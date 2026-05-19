
-- Expand sms_logs.kind allowed values
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS sms_logs_kind_check;
ALTER TABLE public.sms_logs ADD CONSTRAINT sms_logs_kind_check
  CHECK (kind = ANY (ARRAY['absence','welcome','manual','fee_paid','batch_start','broadcast']));

-- sms_flows table
CREATE TABLE IF NOT EXISTS public.sms_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  template_mn text NOT NULL,
  recipient_role text NOT NULL DEFAULT 'parent',
  trigger_type text NOT NULL DEFAULT 'event',
  last_fired_at timestamptz,
  sent_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sms flows" ON public.sms_flows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers can view sms flows" ON public.sms_flows
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'teacher'::app_role));

CREATE TRIGGER trg_sms_flows_updated_at
  BEFORE UPDATE ON public.sms_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed flows
INSERT INTO public.sms_flows (key, name, description, template_mn, recipient_role, trigger_type) VALUES
  ('welcome', 'Тавтай морил SMS', 'Шинээр сурагч бүртгүүлэхэд эцэг эх рүү нэвтрэх мэдээлэл илгээнэ', 'Сайн байна уу? Цэцэгс сургалтын төвөөс холбогдож байна аа. {name} сурагчийн дансны мэдээлэл: Утас: {phone}, Нууц үг: {password}. flowersos.co/login', 'parent', 'event'),
  ('absence', 'Хичээл тасалсан мэдэгдэл', 'Сурагч хичээлд ирээгүй үед эцэг эх рүү автоматаар илгээнэ', 'Сайн байна уу? Цэцэгс сургалтын төвөөс холбогдож байна аа. {name} {date} хичээлээс {status_mn} байна аа.', 'parent', 'event'),
  ('fee_paid', 'Сургалтын төлбөр төлсөн мэдэгдэл', 'Сурагчийн төлбөр бүртгэгдэхэд баталгаажуулах SMS', 'Сайн байна уу? Цэцэгс сургалтын төв. {name} сурагчийн сургалтын төлбөр амжилттай хүлээн авлаа. Баярлалаа!', 'parent', 'event'),
  ('batch_start', 'Хичээл маргааш эхэлнэ', 'Бүлгийн хичээл эхлэхээс 1 өдрийн өмнө сануулга', 'Сайн байна уу? Цэцэгс сургалтын төв. {name} сурагчийн {batch} бүлгийн хичээл маргааш ({date}) эхэлнэ. Тавтай морилно уу!', 'parent', 'cron'),
  ('broadcast', 'Гар утсаар мэдэгдэл', 'Админ гараар олон хүлээн авагч руу илгээх', '', 'other', 'manual')
ON CONFLICT (key) DO NOTHING;

-- Add fee_paid_at to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS fee_paid_at timestamptz;

-- Trigger: send fee paid SMS
CREATE OR REPLACE FUNCTION public.notify_fee_paid_sms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.fee_paid_at IS NOT NULL
     AND (OLD.fee_paid_at IS NULL OR OLD.fee_paid_at IS DISTINCT FROM NEW.fee_paid_at)
  THEN
    PERFORM public._post_edge_function(
      'send-fee-paid-sms',
      jsonb_build_object('student_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_fee_paid_sms ON public.students;
CREATE TRIGGER trg_notify_fee_paid_sms
  AFTER UPDATE OF fee_paid_at ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.notify_fee_paid_sms();

-- Ensure pg_cron available
CREATE EXTENSION IF NOT EXISTS pg_cron;
