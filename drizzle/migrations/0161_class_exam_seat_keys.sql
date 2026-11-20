-- Security scan, 20 Nov 2026 (Saagii): the phone class exam (/exam/:code) gave a student's seat to anyone who typed
-- their phone number, and every later call (paper, backup, submit, review) trusted the seat id alone. A classmate who
-- knew your number could read and rewrite your answers, and anyone could submit, read the answer key, then submit again.
-- 1. The first phone to join a seat binds it with a random key only that phone keeps, and every call checks it. A seat
--    nobody has bound yet stays open (phase 1), so pages cached before this keep working until a new page binds it.
-- 2. Submit counts once. The one second try is the phone's own paper replacing the teacher's end-of-test sweep, as before.
-- 3. The answer key opens only after the teacher ends the test and this paper can no longer change.
-- 4. Teachers can release a seat for a student who switched phones.
-- 5. Join codes are made on the server, and wrong numbers and codes are rate-limited per network and per test.
-- Old signatures are dropped because PostgREST can't choose between overloads; the new last argument defaults to NULL,
-- so old cached pages still match. Safe to run twice.
SET lock_timeout = '3s';

-- ============ Seat keys ============
-- Only the definer functions below read or write these: no policies, no grants.
CREATE TABLE IF NOT EXISTS public.class_test_seat_keys (
  participant_id uuid PRIMARY KEY REFERENCES public.class_test_participants(id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  bound_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.class_test_seat_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.class_test_seat_keys FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.class_test_join_failures (
  ip text NOT NULL,
  test_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS class_test_join_failures_ip_idx ON public.class_test_join_failures (ip, created_at);
CREATE INDEX IF NOT EXISTS class_test_join_failures_test_idx ON public.class_test_join_failures (test_id, created_at);
ALTER TABLE public.class_test_join_failures ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.class_test_join_failures FROM anon, authenticated;

-- Set when the teacher's end-of-test sweep graded this paper from its backup, cleared when the phone's own answers
-- replace it. Not a secret, so it can sit on this (Realtime) table.
ALTER TABLE public.class_test_participants ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

-- No key row: nobody has bound the seat yet, so it stays open (phase 1).
CREATE OR REPLACE FUNCTION public.class_test_seat_ok(p_participant uuid, p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.class_test_seat_keys k WHERE k.participant_id = p_participant
    AND k.key_hash <> encode(sha256(convert_to(coalesce(p_key, ''), 'UTF8')), 'hex'));
$$;
REVOKE ALL ON FUNCTION public.class_test_seat_ok(uuid, text) FROM PUBLIC, anon, authenticated;

-- ============ Join ============
-- Body from 20260805033752, plus the key and the guess limits.
DROP FUNCTION IF EXISTS public.class_test_join(text, text);
CREATE OR REPLACE FUNCTION public.class_test_join(p_join_code text, p_phone text, p_device_key text DEFAULT NULL)
 RETURNS TABLE(participant_id uuid, test_id uuid, display_name text, submitted_at timestamp with time zone, title text, question_ids jsonb, duration_seconds integer, starts_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t public.class_tests%ROWTYPE;
  s public.students%ROWTYPE;
  p public.class_test_participants%ROWTYPE;
  digits text;
  acc_id uuid;
  v_name text;
  v_hash text;
  v_bound text;
  v_headers json := nullif(current_setting('request.headers', true), '')::json;
  v_ip text;
BEGIN
  digits := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  IF length(digits) > 8 THEN digits := right(digits, 8); END IF;
  IF length(digits) <> 8 THEN
    RAISE EXCEPTION 'Please enter a valid 8-digit phone number';
  END IF;
  -- Phones send 64 hex characters; anything short counts as no key.
  IF length(p_device_key) >= 32 THEN
    v_hash := encode(sha256(convert_to(p_device_key, 'UTF8')), 'hex');
  END IF;

  SELECT ct.* INTO t FROM public.class_tests ct
   WHERE upper(ct.join_code) = upper(coalesce(p_join_code, ''))
   LIMIT 1;

  IF t.status IN ('scheduled', 'active') THEN
    SELECT st.* INTO s FROM public.students st
     WHERE st.batch_id = t.batch_id
       AND right(regexp_replace(st.phone, '[^0-9]', '', 'g'), 8) = digits
     LIMIT 1;
  END IF;

  IF s.id IS NOT NULL THEN
    SELECT sa.id INTO acc_id FROM public.student_accounts sa
     WHERE sa.linked_student_id = s.id
        OR right(regexp_replace(sa.phone_number, '[^0-9]', '', 'g'), 8) = digits
     ORDER BY (sa.linked_student_id = s.id) DESC
     LIMIT 1;

    SELECT ctp.* INTO p FROM public.class_test_participants ctp
     WHERE ctp.test_id = t.id
       AND (ctp.phone = digits OR (acc_id IS NOT NULL AND ctp.student_account_id = acc_id))
     LIMIT 1;

    SELECT k.key_hash INTO v_bound FROM public.class_test_seat_keys k WHERE k.participant_id = p.id;
  END IF;

  -- The phone holding the seat's key comes straight back (a refresh mid-exam). Anyone else may be guessing a
  -- classmate's number, so a network or a test with too many misses is refused for a while. Only misses count,
  -- because a whole class joins from one school IP.
  IF v_bound IS NULL OR v_bound IS DISTINCT FROM v_hash THEN
    v_ip := coalesce(nullif(v_headers->>'cf-connecting-ip', ''),
                     nullif(btrim(split_part(v_headers->>'x-forwarded-for', ',', 1)), ''), 'unknown');
    IF (SELECT count(*) FROM public.class_test_join_failures f
         WHERE f.ip = v_ip AND f.created_at > now() - interval '10 minutes') >= 30
       OR (SELECT count(*) FROM public.class_test_join_failures f
         WHERE f.test_id = t.id AND f.created_at > now() - interval '1 hour') >= 1000 THEN
      RAISE EXCEPTION 'Too many wrong tries. Wait a few minutes and try again.';
    END IF;

    IF t.id IS NOT NULL AND t.status NOT IN ('scheduled', 'active') THEN
      RAISE EXCEPTION 'This exam is not open';
    END IF;

    -- An unknown code or a number not in this class. Returns nothing rather than an error, which would undo the log.
    IF s.id IS NULL THEN
      DELETE FROM public.class_test_join_failures WHERE created_at < now() - interval '1 hour';
      INSERT INTO public.class_test_join_failures (ip, test_id) VALUES (v_ip, t.id);
      RETURN;
    END IF;

    IF v_bound IS NOT NULL THEN
      RAISE EXCEPTION 'This exam is open on another phone. Ask your teacher.';
    END IF;
  END IF;

  v_name := btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, ''));
  IF v_name = '' THEN v_name := digits; END IF;

  IF p.id IS NULL THEN
    INSERT INTO public.class_test_participants(test_id, student_account_id, linked_student_id, phone, display_name)
    VALUES (t.id, acc_id, s.id, digits, v_name)
    RETURNING * INTO p;
  END IF;

  IF v_bound IS NULL AND v_hash IS NOT NULL THEN
    INSERT INTO public.class_test_seat_keys (participant_id, key_hash) VALUES (p.id, v_hash)
    ON CONFLICT ON CONSTRAINT class_test_seat_keys_pkey DO NOTHING;
    -- Another phone bound it a moment ago.
    IF NOT FOUND THEN
      RAISE EXCEPTION 'This exam is open on another phone. Ask your teacher.';
    END IF;
  END IF;

  RETURN QUERY SELECT p.id, t.id, p.display_name, p.submitted_at,
                      t.title, t.question_ids, t.duration_seconds, t.starts_at, t.status;
END;
$function$;

-- ============ Paper, backup, review ============
-- Bodies from 0075 and 20260806031320, plus the seat check. A wrong key gets nothing back.
DROP FUNCTION IF EXISTS public.class_test_paper(uuid);
CREATE OR REPLACE FUNCTION public.class_test_paper(p_participant_id uuid, p_device_key text DEFAULT NULL)
RETURNS TABLE (id uuid, question_text text, question_image_url text, question_image_url_2 text, figure_svg text,
  figure_description text, multiple_choice_options jsonb, choice_images jsonb, question_type text, passage_text text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.question_text, q.question_image_url, q.question_image_url_2, q.figure_svg, q.figure_description,
         q.multiple_choice_options, q.choice_images, q.question_type, q.passage_text
  FROM public.class_test_participants p
  JOIN public.class_tests t ON t.id = p.test_id AND t.status IN ('active', 'finished')
  JOIN public.questions q ON q.id IN (SELECT jsonb_array_elements_text(t.question_ids)::uuid)
  WHERE p.id = p_participant_id AND public.class_test_seat_ok(p.id, p_device_key)
$$;

DROP FUNCTION IF EXISTS public.class_test_load_draft(uuid);
CREATE OR REPLACE FUNCTION public.class_test_load_draft(p_participant_id uuid, p_device_key text DEFAULT NULL)
RETURNS TABLE(answers jsonb, flags jsonb, times jsonb, saved_at timestamptz, submitted_at timestamptz, focus_violations integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.draft_answers, p.draft_flags, p.draft_times, p.draft_saved_at, p.submitted_at, COALESCE(p.focus_violations, 0)
  FROM public.class_test_participants p
  WHERE p.id = p_participant_id AND public.class_test_seat_ok(p.id, p_device_key);
$$;

DROP FUNCTION IF EXISTS public.class_test_save_draft(uuid, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION public.class_test_save_draft(
  p_participant_id uuid,
  p_answers jsonb,
  p_flags jsonb DEFAULT '{}'::jsonb,
  p_times jsonb DEFAULT '{}'::jsonb,
  p_violations integer DEFAULT 0,
  p_device_key text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  IF NOT public.class_test_seat_ok(p_participant_id, p_device_key) THEN
    RAISE EXCEPTION 'This exam is open on another phone. Ask your teacher.';
  END IF;
  UPDATE public.class_test_participants p
     SET draft_answers = COALESCE(p_answers, '{}'::jsonb),
         draft_flags = COALESCE(p_flags, '{}'::jsonb),
         draft_times = COALESCE(p_times, '{}'::jsonb),
         draft_saved_at = now(),
         focus_violations = GREATEST(COALESCE(p.focus_violations, 0), COALESCE(p_violations, 0))
   WHERE p.id = p_participant_id
     AND p.submitted_at IS NULL
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

-- The key opens once the teacher has ended the test and this paper can no longer change: submitted, and past the
-- sweep's one replace window in class_test_submit. Before that, a student could read the key and still resubmit.
DROP FUNCTION IF EXISTS public.class_test_my_review(uuid);
CREATE OR REPLACE FUNCTION public.class_test_my_review(p_participant_id uuid, p_device_key text DEFAULT NULL)
RETURNS TABLE (question_id uuid, selected_answer text, answer text, alternate_answers text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, a.selected_answer, q.answer, q.alternate_answers
  FROM public.class_test_participants p
  JOIN public.class_tests t ON t.id = p.test_id
  JOIN public.questions q ON q.id IN (SELECT jsonb_array_elements_text(t.question_ids)::uuid)
  LEFT JOIN public.class_test_answers a ON a.participant_id = p.id AND a.question_id = q.id
  WHERE p.id = p_participant_id AND public.class_test_seat_ok(p.id, p_device_key)
    AND t.status = 'finished' AND p.submitted_at IS NOT NULL
    AND (p.finalized_at IS NULL OR p.finalized_at <= now() - interval '3 minutes')
$$;

-- ============ Grading and submit ============
-- Today's class_test_submit body (20260806063527) unchanged, now internal: the public submit and the teacher's sweep
-- both grade through it.
CREATE OR REPLACE FUNCTION public.class_test_grade(p_participant_id uuid, p_answers jsonb, p_flags jsonb DEFAULT '{}'::jsonb, p_times jsonb DEFAULT '{}'::jsonb, p_violations integer DEFAULT 0)
 RETURNS TABLE(correct_count integer, answered_count integer, submitted_at timestamp with time zone, results jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_test_id uuid;
  v_submitted timestamptz;
  v_correct integer := 0;
  v_answered integer := 0;
  v_results jsonb := '{}'::jsonb;
BEGIN
  SELECT p.test_id, p.submitted_at INTO v_test_id, v_submitted
  FROM public.class_test_participants p WHERE p.id = p_participant_id;

  IF v_test_id IS NULL THEN
    RAISE EXCEPTION 'participant not found';
  END IF;

  WITH given AS (
    SELECT (kv.key)::uuid AS question_id, kv.value AS selected
    FROM jsonb_each_text(COALESCE(p_answers, '{}'::jsonb)) kv
    WHERE kv.value IS NOT NULL AND btrim(kv.value) <> ''
  ), graded AS (
    SELECT g.question_id,
           g.selected,
           CASE
             WHEN COALESCE(q.question_type, '') LIKE '%fill%' THEN
               public.fill_answer_matches(g.selected, q.answer, q.alternate_answers)
             ELSE upper(btrim(g.selected)) = upper(btrim(COALESCE(q.answer, '')))
           END AS is_correct
    FROM given g
    JOIN public.questions q ON q.id = g.question_id
  ), ins AS (
    INSERT INTO public.class_test_answers (test_id, participant_id, question_id, selected_answer, is_correct, time_ms, flagged)
    SELECT v_test_id, p_participant_id, gr.question_id, gr.selected, gr.is_correct,
           GREATEST(0, COALESCE((COALESCE(p_times, '{}'::jsonb) ->> gr.question_id::text)::numeric, 0))::integer,
           COALESCE((COALESCE(p_flags, '{}'::jsonb) ->> gr.question_id::text)::boolean, false)
    FROM graded gr
    ON CONFLICT (participant_id, question_id) DO UPDATE
      SET selected_answer = EXCLUDED.selected_answer,
          is_correct = EXCLUDED.is_correct,
          time_ms = EXCLUDED.time_ms,
          flagged = EXCLUDED.flagged
    RETURNING 1
  )
  SELECT COUNT(*) FILTER (WHERE gr.is_correct)::integer,
         COUNT(*)::integer,
         COALESCE(jsonb_object_agg(gr.question_id::text, gr.is_correct), '{}'::jsonb)
    INTO v_correct, v_answered, v_results
  FROM graded gr, (SELECT COUNT(*) FROM ins) AS forced;

  UPDATE public.class_test_participants p
     SET submitted_at = COALESCE(p.submitted_at, now()),
         correct_count = v_correct,
         answered_count = v_answered,
         total_time_ms = GREATEST(0, COALESCE((
           SELECT SUM(GREATEST(0, COALESCE(v::numeric, 0)))
           FROM jsonb_each_text(COALESCE(p_times, '{}'::jsonb)) AS t(k, v)
         ), 0))::bigint,
         focus_violations = GREATEST(COALESCE(p.focus_violations, 0), COALESCE(p_violations, 0)),
         draft_answers = COALESCE(p_answers, '{}'::jsonb),
         draft_flags = COALESCE(p_flags, '{}'::jsonb),
         draft_times = COALESCE(p_times, '{}'::jsonb),
         draft_saved_at = now()
   WHERE p.id = p_participant_id
  RETURNING p.submitted_at INTO v_submitted;

  RETURN QUERY SELECT v_correct, v_answered, v_submitted, v_results;
END;
$function$;
REVOKE ALL ON FUNCTION public.class_test_grade(uuid, jsonb, jsonb, jsonb, integer) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.class_test_submit(uuid, jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION public.class_test_submit(p_participant_id uuid, p_answers jsonb, p_flags jsonb DEFAULT '{}'::jsonb,
  p_times jsonb DEFAULT '{}'::jsonb, p_violations integer DEFAULT 0, p_device_key text DEFAULT NULL)
 RETURNS TABLE(correct_count integer, answered_count integer, submitted_at timestamp with time zone, results jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p public.class_test_participants%ROWTYPE;
BEGIN
  IF NOT public.class_test_seat_ok(p_participant_id, p_device_key) THEN
    RAISE EXCEPTION 'This exam is open on another phone. Ask your teacher.';
  END IF;
  -- Locked, so a double tap and the retry loop can't both count as the first submit.
  SELECT x.* INTO p FROM public.class_test_participants x WHERE x.id = p_participant_id FOR UPDATE;

  -- One submit per seat, or a student could submit, see the score and try again. The one exception: the teacher's
  -- sweep graded this paper from its last backup (up to 30 s old) moments ago, and the phone's own answers, sent as it
  -- sees the test end, replace that once.
  IF p.submitted_at IS NULL OR p.finalized_at > now() - interval '3 minutes' THEN
    UPDATE public.class_test_participants x SET finalized_at = NULL
     WHERE x.id = p_participant_id AND x.finalized_at IS NOT NULL;
    SELECT g.correct_count, g.answered_count, g.submitted_at INTO p.correct_count, p.answered_count, p.submitted_at
      FROM public.class_test_grade(p_participant_id, p_answers, p_flags, p_times, p_violations) g;
  END IF;

  -- No per-question marks: they would give the key away before the test ends (the review has them after).
  RETURN QUERY SELECT p.correct_count, p.answered_count, p.submitted_at, '{}'::jsonb;
END;
$function$;

-- Body from 0068, grading through class_test_grade and marking each paper it graded.
CREATE OR REPLACE FUNCTION public.class_test_finalize(p_test_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
BEGIN
  IF NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'Only teachers can finalize a class test';
  END IF;

  FOR r IN
    SELECT p.id, p.draft_answers, p.draft_flags, p.draft_times, p.focus_violations
    FROM public.class_test_participants p
    WHERE p.test_id = p_test_id
      AND p.submitted_at IS NULL
      AND p.draft_answers IS NOT NULL
      AND p.draft_answers <> '{}'::jsonb
  LOOP
    PERFORM public.class_test_grade(
      r.id, r.draft_answers, COALESCE(r.draft_flags, '{}'::jsonb),
      COALESCE(r.draft_times, '{}'::jsonb), COALESCE(r.focus_violations, 0)
    );
    UPDATE public.class_test_participants SET finalized_at = now() WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- ============ Teacher: release a seat ============
-- For a student who switched phones: the next phone to join with their number binds the seat.
CREATE OR REPLACE FUNCTION public.class_test_release_seat(p_participant uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'Only teachers can release a seat';
  END IF;
  DELETE FROM public.class_test_seat_keys WHERE participant_id = p_participant;
END;
$$;

-- ============ Join codes ============
-- Made from the server's random bytes (0106's generator: 6 characters, no look-alikes), not Math.random() in the
-- teacher's browser. Never reused: class_tests_join_code_key is unique across all tests.
CREATE OR REPLACE FUNCTION public.class_tests_set_join_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  LOOP
    NEW.join_code := public.tenant_proctor_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.class_tests WHERE join_code = NEW.join_code);
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.class_tests_set_join_code() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS class_tests_set_join_code ON public.class_tests;
CREATE TRIGGER class_tests_set_join_code BEFORE INSERT ON public.class_tests
  FOR EACH ROW EXECUTE FUNCTION public.class_tests_set_join_code();

REVOKE ALL ON FUNCTION public.class_test_join(text, text, text), public.class_test_paper(uuid, text),
  public.class_test_load_draft(uuid, text), public.class_test_save_draft(uuid, jsonb, jsonb, jsonb, integer, text),
  public.class_test_my_review(uuid, text), public.class_test_submit(uuid, jsonb, jsonb, jsonb, integer, text),
  public.class_test_release_seat(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.class_test_join(text, text, text), public.class_test_paper(uuid, text),
  public.class_test_load_draft(uuid, text), public.class_test_save_draft(uuid, jsonb, jsonb, jsonb, integer, text),
  public.class_test_my_review(uuid, text), public.class_test_submit(uuid, jsonb, jsonb, jsonb, integer, text)
  TO anon, authenticated;
REVOKE ALL ON FUNCTION public.class_test_release_seat(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.class_test_release_seat(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
