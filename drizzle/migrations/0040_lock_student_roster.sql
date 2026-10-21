
-- Step 1 of 2: lookups the new app code uses. Safe to apply before publishing.
-- ============ Narrow roster lookups for the signed-out pages ============
-- Sign-in: one roster row by exact phone. The app sends up to 3 spellings.
CREATE OR REPLACE FUNCTION public.student_roster_for_login(_phones text[])
RETURNS TABLE(id uuid, phone text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.phone FROM public.students s
  WHERE s.phone = ANY(_phones) AND cardinality(_phones) <= 3
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.student_roster_for_login(text[]) TO anon, authenticated;

-- Registration form: is this phone already in the class (QR link) or anywhere (code)?
CREATE OR REPLACE FUNCTION public.student_phone_registered(_phone text, _batch_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _batch_id IS NULL
    THEN EXISTS (SELECT 1 FROM public.students s WHERE s.phone = _phone)
    ELSE EXISTS (SELECT 1 FROM public.students s WHERE s.batch_id = _batch_id
      AND regexp_replace(coalesce(s.phone, ''), '\D', '', 'g') = regexp_replace(_phone, '\D', '', 'g'))
  END;
$$;
GRANT EXECUTE ON FUNCTION public.student_phone_registered(text, uuid) TO anon, authenticated;

-- Public closing report (/report/:token): the student's name, only for a live token.
CREATE OR REPLACE FUNCTION public.student_name_for_report(_token text)
RETURNS TABLE(first_name text, last_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.first_name, s.last_name
  FROM public.closing_report_tokens t JOIN public.students s ON s.id = t.student_id
  WHERE t.token = _token AND t.expires_at > now()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.student_name_for_report(text) TO anon, authenticated;

-- Shared profile page (/student/share/:token) now also needs the student's card.
DROP FUNCTION IF EXISTS public.student_account_by_share_token(text);
CREATE FUNCTION public.student_account_by_share_token(_token text)
RETURNS TABLE(id uuid, linked_student_id uuid, first_name text, last_name text, school_name text, grade text, batch_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.linked_student_id, s.first_name, s.last_name, s.school_name, s.grade, s.batch_id
  FROM public.student_accounts a LEFT JOIN public.students s ON s.id = a.linked_student_id
  WHERE _token IS NOT NULL AND a.share_token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.student_account_by_share_token(text) TO anon, authenticated;
