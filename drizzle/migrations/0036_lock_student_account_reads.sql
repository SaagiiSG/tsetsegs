
-- Step 1 of 2: lookups the new app code uses. Safe to apply before publishing.
-- ============ Narrow lookups for the signed-out pages ============
-- Sign-in and registration: one account by exact phone. The app sends up to 3 spellings.
CREATE OR REPLACE FUNCTION public.student_account_for_login(_phones text[])
RETURNS TABLE(id uuid, phone_number text, is_blocked boolean, blocked_reason text, password_hash text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.phone_number, a.is_blocked, a.blocked_reason,
         CASE WHEN a.password_hash IS NULL THEN NULL ELSE 'set' END
  FROM public.student_accounts a
  WHERE a.phone_number = ANY(_phones) AND cardinality(_phones) <= 3
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.student_account_for_login(text[]) TO anon, authenticated;

-- Shared profile page (/student/share/:token)
CREATE OR REPLACE FUNCTION public.student_account_by_share_token(_token text)
RETURNS TABLE(id uuid, linked_student_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.linked_student_id
  FROM public.student_accounts a
  WHERE _token IS NOT NULL AND a.share_token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.student_account_by_share_token(text) TO anon, authenticated;

-- Public closing report (/report/:token)
CREATE OR REPLACE FUNCTION public.student_account_id_for_student(_student_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id FROM public.student_accounts a WHERE a.linked_student_id = _student_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.student_account_id_for_student(uuid) TO anon, authenticated;
