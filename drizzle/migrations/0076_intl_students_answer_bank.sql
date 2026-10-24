-- International students practise from intl_questions, but their answers, speed items, review queue
-- and progress rows had foreign keys to the Mongolian `questions` bank only, so saving an intDB
-- question failed, and the practice page's category lookup failed because intl_questions had no
-- foreign key to question_categories.
--
-- Each answer row now carries a bank tag in two columns: mn_bank ('mn' or NULL) and intl_bank
-- ('intl' or NULL), exactly one of them set. A composite foreign key is skipped when one of its
-- columns is NULL, so a row is checked against exactly one bank:
--   (question_id, mn_bank)   -> questions(id, bank)       keeps the old constraint name, so every
--                                                         `questions(...)` embed works as before
--   (question_id, intl_bank) -> intl_questions(id, bank)
-- The tag is set by a trigger from the row owner's cohort, never by the browser. Mongolian students'
-- rows are always ('mn', NULL), exactly what the old foreign key allowed. An intl student's row is
-- tagged intl when the question exists in intl_questions, otherwise it stays mn as before.
-- Safe to run twice. Apply at Ulaanbaatar night: it briefly locks these tables.
-- 0077 validates the constraints added here as NOT VALID; apply it separately, after this one.
SET lock_timeout = '3s';

-- ============ 1. Category lookup for intDB questions ============
DO $$
DECLARE n int;
BEGIN
  -- Category ids that point at no category at all (the sync and admin forms only write real ones).
  UPDATE public.intl_questions iq SET category_id = NULL
  WHERE category_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.question_categories c WHERE c.id = iq.category_id);
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'intl_questions: % dangling category ids cleared', n;
END $$;
ALTER TABLE public.intl_questions
  DROP CONSTRAINT IF EXISTS intl_questions_category_id_fkey,
  ADD CONSTRAINT intl_questions_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES public.question_categories(id) ON DELETE SET NULL;

-- ============ 2. Each bank names itself (constant defaults: no table rewrite) ============
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS bank text NOT NULL DEFAULT 'mn' CONSTRAINT questions_bank_check CHECK (bank = 'mn');
ALTER TABLE public.intl_questions
  ADD COLUMN IF NOT EXISTS bank text NOT NULL DEFAULT 'intl' CONSTRAINT intl_questions_bank_check CHECK (bank = 'intl');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_id_bank_key') THEN
    ALTER TABLE public.questions ADD CONSTRAINT questions_id_bank_key UNIQUE (id, bank);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'intl_questions_id_bank_key') THEN
    ALTER TABLE public.intl_questions ADD CONSTRAINT intl_questions_id_bank_key UNIQUE (id, bank);
  END IF;
END $$;

-- ============ 3. Answer tables point at one bank per row ============
-- Same name and ON DELETE CASCADE as the old single-column keys. NOT VALID: existing rows already
-- passed the old key and default to 'mn', so nothing is scanned under the lock (0076 validates later).
ALTER TABLE public.student_attempts
  ADD COLUMN IF NOT EXISTS mn_bank text DEFAULT 'mn',
  ADD COLUMN IF NOT EXISTS intl_bank text,
  DROP CONSTRAINT IF EXISTS student_attempts_one_bank,
  ADD CONSTRAINT student_attempts_one_bank CHECK (num_nonnulls(mn_bank, intl_bank) = 1) NOT VALID,
  DROP CONSTRAINT IF EXISTS student_attempts_question_id_fkey,
  ADD CONSTRAINT student_attempts_question_id_fkey FOREIGN KEY (question_id, mn_bank)
    REFERENCES public.questions(id, bank) ON DELETE CASCADE NOT VALID,
  DROP CONSTRAINT IF EXISTS student_attempts_intl_question_id_fkey,
  ADD CONSTRAINT student_attempts_intl_question_id_fkey FOREIGN KEY (question_id, intl_bank)
    REFERENCES public.intl_questions(id, bank) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.speed_session_items
  ADD COLUMN IF NOT EXISTS mn_bank text DEFAULT 'mn',
  ADD COLUMN IF NOT EXISTS intl_bank text,
  DROP CONSTRAINT IF EXISTS speed_session_items_one_bank,
  ADD CONSTRAINT speed_session_items_one_bank CHECK (num_nonnulls(mn_bank, intl_bank) = 1) NOT VALID,
  DROP CONSTRAINT IF EXISTS speed_session_items_question_id_fkey,
  ADD CONSTRAINT speed_session_items_question_id_fkey FOREIGN KEY (question_id, mn_bank)
    REFERENCES public.questions(id, bank) ON DELETE CASCADE NOT VALID,
  DROP CONSTRAINT IF EXISTS speed_session_items_intl_question_id_fkey,
  ADD CONSTRAINT speed_session_items_intl_question_id_fkey FOREIGN KEY (question_id, intl_bank)
    REFERENCES public.intl_questions(id, bank) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.student_review_queue
  ADD COLUMN IF NOT EXISTS mn_bank text DEFAULT 'mn',
  ADD COLUMN IF NOT EXISTS intl_bank text,
  DROP CONSTRAINT IF EXISTS student_review_queue_one_bank,
  ADD CONSTRAINT student_review_queue_one_bank CHECK (num_nonnulls(mn_bank, intl_bank) = 1) NOT VALID,
  DROP CONSTRAINT IF EXISTS student_review_queue_question_id_fkey,
  ADD CONSTRAINT student_review_queue_question_id_fkey FOREIGN KEY (question_id, mn_bank)
    REFERENCES public.questions(id, bank) ON DELETE CASCADE NOT VALID,
  DROP CONSTRAINT IF EXISTS student_review_queue_intl_question_id_fkey,
  ADD CONSTRAINT student_review_queue_intl_question_id_fkey FOREIGN KEY (question_id, intl_bank)
    REFERENCES public.intl_questions(id, bank) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.student_progress
  ADD COLUMN IF NOT EXISTS mn_bank text DEFAULT 'mn',
  ADD COLUMN IF NOT EXISTS intl_bank text,
  DROP CONSTRAINT IF EXISTS student_progress_one_bank,
  ADD CONSTRAINT student_progress_one_bank CHECK (num_nonnulls(mn_bank, intl_bank) = 1) NOT VALID,
  DROP CONSTRAINT IF EXISTS student_progress_question_id_fkey,
  ADD CONSTRAINT student_progress_question_id_fkey FOREIGN KEY (question_id, mn_bank)
    REFERENCES public.questions(id, bank) ON DELETE CASCADE NOT VALID,
  DROP CONSTRAINT IF EXISTS student_progress_intl_question_id_fkey,
  ADD CONSTRAINT student_progress_intl_question_id_fkey FOREIGN KEY (question_id, intl_bank)
    REFERENCES public.intl_questions(id, bank) ON DELETE CASCADE NOT VALID;

-- Two links to questions would make every `questions(...)` embed ambiguous for Mongolian students.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['student_attempts', 'speed_session_items', 'student_review_queue', 'student_progress'] LOOP
    IF (SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND conrelid = ('public.' || t)::regclass
          AND confrelid = 'public.questions'::regclass) <> 1
    OR (SELECT count(*) FROM pg_constraint WHERE contype = 'f' AND conrelid = ('public.' || t)::regclass
          AND confrelid = 'public.intl_questions'::regclass) <> 1 THEN
      RAISE EXCEPTION '%: expected exactly one foreign key to each question bank', t;
    END IF;
  END LOOP;
END $$;

-- ============ 4. The server tags each row from its owner's cohort ============
CREATE OR REPLACE FUNCTION public.set_answer_bank()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE owner uuid; intl boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'speed_session_items' THEN
    SELECT s.student_account_id INTO owner FROM public.speed_sessions s WHERE s.id = NEW.session_id;
  ELSE
    owner := NEW.student_account_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.student_accounts WHERE id = owner AND cohort = 'intl') THEN
    intl := EXISTS (SELECT 1 FROM public.intl_questions WHERE id = NEW.question_id);
  END IF;
  NEW.mn_bank := CASE WHEN intl THEN NULL ELSE 'mn' END;
  NEW.intl_bank := CASE WHEN intl THEN 'intl' END;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.set_answer_bank() FROM PUBLIC, anon, authenticated;

-- Named a_ so it runs before guard_student_attempt (BEFORE triggers fire in name order).
DROP TRIGGER IF EXISTS a_set_answer_bank ON public.student_attempts;
CREATE TRIGGER a_set_answer_bank BEFORE INSERT OR UPDATE OF question_id, student_account_id, mn_bank, intl_bank
  ON public.student_attempts FOR EACH ROW EXECUTE FUNCTION public.set_answer_bank();
DROP TRIGGER IF EXISTS a_set_answer_bank ON public.speed_session_items;
CREATE TRIGGER a_set_answer_bank BEFORE INSERT OR UPDATE OF question_id, session_id, mn_bank, intl_bank
  ON public.speed_session_items FOR EACH ROW EXECUTE FUNCTION public.set_answer_bank();
DROP TRIGGER IF EXISTS a_set_answer_bank ON public.student_review_queue;
CREATE TRIGGER a_set_answer_bank BEFORE INSERT OR UPDATE OF question_id, student_account_id, mn_bank, intl_bank
  ON public.student_review_queue FOR EACH ROW EXECUTE FUNCTION public.set_answer_bank();
DROP TRIGGER IF EXISTS a_set_answer_bank ON public.student_progress;
CREATE TRIGGER a_set_answer_bank BEFORE INSERT OR UPDATE OF question_id, student_account_id, mn_bank, intl_bank
  ON public.student_progress FOR EACH ROW EXECUTE FUNCTION public.set_answer_bank();

-- ============ 5. Grade intDB answers against intDB keys ============
-- Copy of grade_student_answer (0024) reading intl_questions.
CREATE OR REPLACE FUNCTION public.grade_intl_student_answer(p_question uuid, p_answer text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q record;
BEGIN
  SELECT answer, alternate_answers INTO q FROM public.intl_questions WHERE id = p_question;
  IF NOT FOUND OR q.answer IS NULL OR p_answer IS NULL THEN RETURN false; END IF;
  RETURN upper(btrim(p_answer)) = upper(btrim(q.answer))
      OR public.fill_answer_matches(p_answer, q.answer, q.alternate_answers);
END $$;

-- 0024's guard; only the grading line changed.
CREATE OR REPLACE FUNCTION public.guard_student_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE me uuid;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    me := public.request_student_id();
    IF me IS NULL OR NEW.student_account_id IS DISTINCT FROM me THEN
      RAISE EXCEPTION 'Please sign in again' USING ERRCODE = '42501';
    END IF;
    NEW.is_correct := CASE WHEN NEW.intl_bank IS NULL
      THEN public.grade_student_answer(NEW.question_id, NEW.answer_submitted)
      ELSE public.grade_intl_student_answer(NEW.question_id, NEW.answer_submitted) END;
    NEW.attempted_at := now();
    NEW.time_spent_seconds := greatest(coalesce(NEW.time_spent_seconds, 0), 0);
  END IF;
  RETURN NEW;
END $$;

-- ============ 6. Existing intl students' rows move to the intDB copy of the same question ============
-- intl_questions began as a copy of questions (0005), so these ids exist in both banks.
UPDATE public.student_attempts a SET mn_bank = NULL, intl_bank = 'intl'
WHERE a.intl_bank IS NULL
  AND EXISTS (SELECT 1 FROM public.student_accounts s WHERE s.id = a.student_account_id AND s.cohort = 'intl')
  AND EXISTS (SELECT 1 FROM public.intl_questions q WHERE q.id = a.question_id);
UPDATE public.student_review_queue a SET mn_bank = NULL, intl_bank = 'intl'
WHERE a.intl_bank IS NULL
  AND EXISTS (SELECT 1 FROM public.student_accounts s WHERE s.id = a.student_account_id AND s.cohort = 'intl')
  AND EXISTS (SELECT 1 FROM public.intl_questions q WHERE q.id = a.question_id);
UPDATE public.student_progress a SET mn_bank = NULL, intl_bank = 'intl'
WHERE a.intl_bank IS NULL
  AND EXISTS (SELECT 1 FROM public.student_accounts s WHERE s.id = a.student_account_id AND s.cohort = 'intl')
  AND EXISTS (SELECT 1 FROM public.intl_questions q WHERE q.id = a.question_id);
UPDATE public.speed_session_items i SET mn_bank = NULL, intl_bank = 'intl'
WHERE i.intl_bank IS NULL
  AND EXISTS (SELECT 1 FROM public.speed_sessions ss JOIN public.student_accounts s ON s.id = ss.student_account_id
              WHERE ss.id = i.session_id AND s.cohort = 'intl')
  AND EXISTS (SELECT 1 FROM public.intl_questions q WHERE q.id = i.question_id);

NOTIFY pgrst, 'reload schema';
