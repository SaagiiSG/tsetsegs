CREATE OR REPLACE FUNCTION public.student_self_block(p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid := public.request_student_id();
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  UPDATE public.student_accounts
  SET is_blocked = true, blocked_reason = left(coalesce(p_reason, 'Security violation'), 300), blocked_at = now()
  WHERE id = me;
  UPDATE public.student_sessions SET is_active = false WHERE student_account_id = me;
END $$;
GRANT EXECUTE ON FUNCTION public.student_self_block(text) TO anon, authenticated;