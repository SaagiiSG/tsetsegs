-- =====================================================================
-- Phase 1: Schema bridge for student Supabase Auth migration
-- Reversible. No behavior changes; new column is nullable and unused yet.
-- =====================================================================

-- 1. Add nullable link column on student_accounts -> auth.users.id
ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_accounts_auth_user_id
  ON public.student_accounts(auth_user_id);

-- 2. Phone normalization helper: takes any Mongolian phone input
--    and returns E.164 (+976XXXXXXXX). NULL if it can't be normalized.
CREATE OR REPLACE FUNCTION public.normalize_mn_phone(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  digits text;
BEGIN
  IF p IS NULL THEN RETURN NULL; END IF;
  digits := regexp_replace(p, '[^0-9]', '', 'g');
  IF digits = '' THEN RETURN NULL; END IF;
  -- Strip leading 976 country code if present, then re-add as +976
  IF length(digits) > 8 AND left(digits, 3) = '976' THEN
    digits := substring(digits FROM 4);
  END IF;
  -- Expect 8-digit local Mongolian number
  IF length(digits) <> 8 THEN
    RETURN NULL;
  END IF;
  RETURN '+976' || digits;
END;
$$;

-- 3. Returns the currently authenticated student's student_accounts.id,
--    or NULL if the JWT does not map to a student. Used by future RLS.
CREATE OR REPLACE FUNCTION public.current_student_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.student_accounts
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- 4. Enrollment gate: true if this phone number belongs to an admin-added student.
--    Used by the new student-signup edge function.
CREATE OR REPLACE FUNCTION public.is_enrolled_phone(p text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE regexp_replace(s.phone, '[^0-9]', '', 'g') =
          regexp_replace(p,    '[^0-9]', '', 'g')
       OR regexp_replace(s.phone, '[^0-9]', '', 'g') =
          right(regexp_replace(p, '[^0-9]', '', 'g'), 8)
  );
$$;

-- Lock down execute on the helpers
REVOKE ALL ON FUNCTION public.current_student_account_id()  FROM public;
REVOKE ALL ON FUNCTION public.is_enrolled_phone(text)        FROM public;
REVOKE ALL ON FUNCTION public.normalize_mn_phone(text)       FROM public;

GRANT EXECUTE ON FUNCTION public.current_student_account_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_enrolled_phone(text)       TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_mn_phone(text)      TO authenticated, service_role;
