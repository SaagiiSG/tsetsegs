CREATE TABLE public.institution_customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL,
 country text NOT NULL DEFAULT '',
 contact_name text NOT NULL DEFAULT '',
 contact_email text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'prospect' CHECK (status IN ('prospect','onboarding','active','paused','closed')),
 health text NOT NULL DEFAULT 'not_assessed' CHECK (health IN ('not_assessed','healthy','watch','at_risk')),
 health_notes text NOT NULL DEFAULT '',
 last_check_in date,
 next_check_in date,
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_customers TO authenticated;
GRANT ALL ON public.institution_customers TO service_role;
ALTER TABLE public.institution_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage institution customers" ON public.institution_customers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TABLE public.institution_payment_dues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
 description text NOT NULL DEFAULT '',
 amount numeric(12,2) NOT NULL CHECK (amount > 0),
 currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
 due_date date NOT NULL,
 paid_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_payment_dues TO authenticated;
GRANT ALL ON public.institution_payment_dues TO service_role;
ALTER TABLE public.institution_payment_dues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage institution payment dues" ON public.institution_payment_dues FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX institution_payment_dues_customer_idx ON public.institution_payment_dues(customer_id);
CREATE INDEX institution_payment_dues_unpaid_idx ON public.institution_payment_dues(due_date) WHERE paid_at IS NULL;
CREATE FUNCTION public.touch_institution_customer() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER institution_customer_updated BEFORE UPDATE ON public.institution_customers FOR EACH ROW EXECUTE FUNCTION public.touch_institution_customer();