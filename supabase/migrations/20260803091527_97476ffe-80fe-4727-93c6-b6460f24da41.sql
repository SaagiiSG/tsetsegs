-- 1. Hide BBK questions from student practice
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS hide_from_practice boolean NOT NULL DEFAULT false;

UPDATE public.questions SET hide_from_practice = true WHERE question_id LIKE 'BBK%';

CREATE INDEX IF NOT EXISTS idx_questions_hide_from_practice ON public.questions(hide_from_practice);

CREATE OR REPLACE FUNCTION public.pick_hardest_questions(p_question_set text DEFAULT '68'::text, p_limit integer DEFAULT 22, p_min_attempts integer DEFAULT 5)
 RETURNS TABLE(question_id uuid, attempts bigint, accuracy numeric, avg_seconds numeric, difficulty_score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH stats AS (
    SELECT q.id AS qid,
           count(sa.id) AS attempts,
           avg(CASE WHEN sa.is_correct THEN 1.0 ELSE 0.0 END) AS accuracy,
           avg(COALESCE(sa.time_spent_seconds, 0)) AS avg_seconds
    FROM public.questions q
    JOIN public.student_attempts sa ON sa.question_id = q.id
    WHERE q.question_set = p_question_set
      AND q.is_active = true
      AND q.hide_from_practice = false
    GROUP BY q.id
    HAVING count(sa.id) >= p_min_attempts
  ), bounds AS (
    SELECT min(avg_seconds) AS min_t, max(avg_seconds) AS max_t FROM stats
  )
  SELECT s.qid,
         s.attempts,
         round(s.accuracy::numeric, 4),
         round(s.avg_seconds::numeric, 1),
         round((0.6 * (1 - s.accuracy) + 0.4 * (CASE WHEN b.max_t > b.min_t THEN (s.avg_seconds - b.min_t) / (b.max_t - b.min_t) ELSE 0 END))::numeric, 4) AS difficulty_score
  FROM stats s CROSS JOIN bounds b
  ORDER BY difficulty_score DESC
  LIMIT p_limit;
$function$;

-- 2. QR join support on class tests
ALTER TABLE public.class_tests
  ADD COLUMN IF NOT EXISTS join_code text;

UPDATE public.class_tests
  SET join_code = upper(substring(replace(id::text, '-', '') from 1 for 6))
  WHERE join_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS class_tests_join_code_key ON public.class_tests(join_code);

ALTER TABLE public.class_test_participants
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS linked_student_id uuid;

-- 3. Anonymous join, validated against class enrollment
CREATE OR REPLACE FUNCTION public.class_test_join(p_join_code text, p_phone text)
RETURNS TABLE(
  participant_id uuid,
  test_id uuid,
  display_name text,
  submitted_at timestamp with time zone,
  title text,
  question_ids jsonb,
  duration_seconds integer,
  starts_at timestamp with time zone,
  status text
)
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

  SELECT * INTO t FROM public.class_tests
   WHERE upper(join_code) = upper(coalesce(p_join_code, ''))
     AND status IN ('scheduled', 'active')
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

  SELECT * INTO p FROM public.class_test_participants
   WHERE class_test_participants.test_id = t.id
     AND (phone = digits OR (acc_id IS NOT NULL AND student_account_id = acc_id))
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

REVOKE ALL ON FUNCTION public.class_test_join(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_test_join(text, text) TO anon, authenticated, service_role;

-- participants may now be created without a student account (QR joiners)
ALTER TABLE public.class_test_participants ALTER COLUMN student_account_id DROP NOT NULL;