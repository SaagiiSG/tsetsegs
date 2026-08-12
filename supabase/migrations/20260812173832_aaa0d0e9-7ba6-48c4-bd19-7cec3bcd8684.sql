CREATE OR REPLACE FUNCTION public.live_session_find_participant(p_session_id uuid, p_phone text)
RETURNS TABLE (id uuid, player_name text, total_points integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.player_name, p.total_points
  FROM public.live_session_participants p
  WHERE p.session_id = p_session_id
    AND p.phone_number = p_phone
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.live_session_find_participant(uuid, text) TO anon, authenticated, service_role;

REVOKE SELECT (phone_number) ON public.live_session_participants FROM anon;