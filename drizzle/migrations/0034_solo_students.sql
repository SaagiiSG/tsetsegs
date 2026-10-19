CREATE TABLE public.solo_students (
  user_id uuid PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  email text,
  provider text,
  plan text NOT NULL DEFAULT 'free',
  premium_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.solo_students TO authenticated;
GRANT ALL ON public.solo_students TO service_role;
ALTER TABLE public.solo_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo student reads own row" ON public.solo_students FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Solo student creates own row" ON public.solo_students FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Solo student updates own row" ON public.solo_students FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Only admins may change plan/premium; students can edit their name only.
CREATE OR REPLACE FUNCTION public.guard_solo_student()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    NEW.updated_at := now(); RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.plan := 'free'; NEW.premium_until := NULL;
  ELSE
    NEW.plan := OLD.plan; NEW.premium_until := OLD.premium_until; NEW.user_id := OLD.user_id; NEW.created_at := OLD.created_at;
  END IF;
  NEW.name := left(coalesce(NEW.name, ''), 80);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER guard_solo_student BEFORE INSERT OR UPDATE ON public.solo_students FOR EACH ROW EXECUTE FUNCTION public.guard_solo_student();

CREATE OR REPLACE FUNCTION public.solo_has_premium(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.solo_students WHERE user_id = _user AND plan = 'premium' AND (premium_until IS NULL OR premium_until > now()))
$$;