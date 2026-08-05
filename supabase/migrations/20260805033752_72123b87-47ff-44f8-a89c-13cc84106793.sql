CREATE OR REPLACE FUNCTION public.class_test_join(p_join_code text, p_phone text)
 RETURNS TABLE(participant_id uuid, test_id uuid, display_name text, submitted_at timestamp with time zone, title text, question_ids jsonb, duration_seconds integer, starts_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  s record;
  digits text;
  acc_id uuid;
  p record;
  v_name text;
BEGIN
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(digits) > 8 THEN digits := right(digits, 8); END IF;
  IF length(digits) <> 8 THEN
    RAISE EXCEPTION 'Please enter a valid 8-digit phone number';
  END IF;

  SELECT ct.* INTO t FROM public.class_tests ct
   WHERE upper(ct.join_code) = upper(coalesce(p_join_code, ''))
     AND ct.status IN ('scheduled', 'active')
   LIMIT 1;
  IF t.id IS NULL THEN
    RAISE EXCEPTION 'This exam is not open';
  END IF;

  SELECT st.* INTO s FROM public.students st
   WHERE st.batch_id = t.batch_id
     AND right(regexp_replace(st.phone, '[^0-9]', '', 'g'), 8) = digits
   LIMIT 1;
  IF s.id IS NULL THEN
    RAISE EXCEPTION 'This number is not in this class';
  END IF;

  v_name := btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''));
  IF v_name = '' THEN v_name := digits; END IF;

  SELECT sa.id INTO acc_id FROM public.student_accounts sa
   WHERE sa.linked_student_id = s.id
      OR right(regexp_replace(sa.phone_number, '[^0-9]', '', 'g'), 8) = digits
   ORDER BY (sa.linked_student_id = s.id) DESC
   LIMIT 1;

  SELECT ctp.* INTO p FROM public.class_test_participants ctp
   WHERE ctp.test_id = t.id
     AND (ctp.phone = digits OR (acc_id IS NOT NULL AND ctp.student_account_id = acc_id))
   LIMIT 1;

  IF p.id IS NULL THEN
    INSERT INTO public.class_test_participants(test_id, student_account_id, linked_student_id, phone, display_name)
    VALUES (t.id, acc_id, s.id, digits, v_name)
    RETURNING * INTO p;
  END IF;

  RETURN QUERY SELECT p.id, t.id, p.display_name, p.submitted_at,
                      t.title, t.question_ids, t.duration_seconds, t.starts_at, t.status;
END;
$function$;