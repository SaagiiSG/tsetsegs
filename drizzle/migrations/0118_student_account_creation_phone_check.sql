CREATE OR REPLACE FUNCTION public.student_phone_enrolled(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.phone = _phone
       OR s.phone = replace(_phone, '-', '')
       OR replace(s.phone, '-', '') = _phone
  )
$$;

REVOKE ALL ON FUNCTION public.student_phone_enrolled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_phone_enrolled(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Account creation requires enrolled phone" ON public.student_accounts;

CREATE POLICY "Account creation requires enrolled phone"
ON public.student_accounts
FOR INSERT
TO public
WITH CHECK (public.student_phone_enrolled(phone_number));