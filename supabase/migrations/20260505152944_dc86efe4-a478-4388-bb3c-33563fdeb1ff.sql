CREATE OR REPLACE FUNCTION public.ngee_check_in_by_code(p_session_id uuid, p_code text)
 RETURNS TABLE(id uuid, first_name text, last_name text, seat_number integer, already_checked boolean, checked_in_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
  v_first text;
  v_last text;
  v_seat integer;
  v_attended boolean;
  v_checked_at timestamptz;
  v_was_checked boolean;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'teacher'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT b.id, b.first_name, b.last_name, b.seat_number, b.attended, b.checked_in_at
    INTO v_id, v_first, v_last, v_seat, v_attended, v_checked_at
    FROM public.ngee_bookings b
    WHERE b.session_id = p_session_id
      AND upper(b.check_in_code) = upper(p_code)
      AND b.cancelled_at IS NULL
    LIMIT 1;

  IF v_id IS NULL THEN RAISE EXCEPTION 'Code not found'; END IF;

  v_was_checked := v_attended;

  IF NOT v_was_checked THEN
    UPDATE public.ngee_bookings
       SET attended = true,
           checked_in_at = now(),
           checked_in_by = COALESCE(get_current_teacher_username(), 'admin')
     WHERE ngee_bookings.id = v_id
     RETURNING ngee_bookings.checked_in_at INTO v_checked_at;
  END IF;

  RETURN QUERY SELECT v_id, v_first, v_last, v_seat, v_was_checked, v_checked_at;
END;
$function$;