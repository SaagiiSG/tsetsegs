CREATE OR REPLACE FUNCTION public.proctor_finalize_me(p_participant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session uuid;
  v_status text;
BEGIN
  IF p_participant_id IS NULL THEN RETURN false; END IF;

  SELECT ps.id, ps.status
    INTO v_session, v_status
  FROM public.proctor_participants pp
  JOIN public.proctor_sessions ps ON ps.id = pp.session_id
  WHERE pp.id = p_participant_id;

  IF v_session IS NULL OR v_status <> 'finished' THEN RETURN false; END IF;

  PERFORM public.proctor_finalize_session(v_session);
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.proctor_finalize_me(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.proctor_finalize_me(uuid) TO anon, authenticated, service_role;