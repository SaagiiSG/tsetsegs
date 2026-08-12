CREATE OR REPLACE FUNCTION public.proctor_finalize_session(p_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  IF p_session_id IS NULL THEN RETURN 0; END IF;

  UPDATE public.proctor_sessions
     SET status = 'finished',
         finished_at = COALESCE(finished_at, now())
   WHERE id = p_session_id;

  FOR r IN
    SELECT pp.id, pp.answers, pp.focus_violations
      FROM public.proctor_participants pp
     WHERE pp.session_id = p_session_id
       AND pp.submitted_at IS NULL
       AND pp.oath_accepted_at IS NOT NULL
  LOOP
    PERFORM * FROM public.proctor_submit(
      r.id,
      COALESCE(r.answers, '{}'::jsonb),
      COALESCE(r.focus_violations, 0)
    );
    v_count := v_count + 1;
  END LOOP;

  -- Results are automatic: unlock the full per-question breakdown unless the
  -- proctor already picked a review mode for this session.
  UPDATE public.proctor_sessions
     SET review_mode = 'explanations'
   WHERE id = p_session_id
     AND COALESCE(review_mode, 'off') = 'off';

  RETURN v_count;
END;
$function$;