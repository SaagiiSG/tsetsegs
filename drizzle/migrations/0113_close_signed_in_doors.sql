-- Security sweep (Saagii, 31 Oct): the live demo hands every visitor a real signed-in account, so "any signed-in user"
-- is now effectively public. This closes two of the doors that sweep found:
--   1. Demo accounts can't list the question-images bucket. The bucket stays public, so a known image URL still loads
--      (accepted for now); real signed-in users are unchanged.
--   2. The answer checkers grade_student_answer (0024) and grade_intl_student_answer (0077) told anyone whether an
--      answer was right. Nothing calls them over RPC; their one caller is 0077's guard_student_attempt trigger, which is
--      SECURITY INVOKER and runs as anon (students sign in with the student token), so EXECUTE can't be revoked without
--      breaking every student answer. Instead they now answer only from inside a trigger. Bodies are otherwise unchanged.
-- The live game answers and the open student sign-up are not in here; see the 4b report.
SET lock_timeout = '3s';

DROP POLICY IF EXISTS "Signed-in users view question images" ON storage.objects;
CREATE POLICY "Signed-in users view question images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'question-images'
    AND NOT (SELECT public.is_demo_user())); -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.

CREATE OR REPLACE FUNCTION public.grade_student_answer(p_question uuid, p_answer text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q record;
BEGIN
  IF pg_trigger_depth() = 0 THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF; -- only guard_student_attempt grades
  SELECT answer, alternate_answers INTO q FROM public.questions WHERE id = p_question;
  IF NOT FOUND OR q.answer IS NULL OR p_answer IS NULL THEN RETURN false; END IF;
  RETURN upper(btrim(p_answer)) = upper(btrim(q.answer))
      OR public.fill_answer_matches(p_answer, q.answer, q.alternate_answers);
END $$;

CREATE OR REPLACE FUNCTION public.grade_intl_student_answer(p_question uuid, p_answer text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE q record;
BEGIN
  IF pg_trigger_depth() = 0 THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF; -- only guard_student_attempt grades
  SELECT answer, alternate_answers INTO q FROM public.intl_questions WHERE id = p_question;
  IF NOT FOUND OR q.answer IS NULL OR p_answer IS NULL THEN RETURN false; END IF;
  RETURN upper(btrim(p_answer)) = upper(btrim(q.answer))
      OR public.fill_answer_matches(p_answer, q.answer, q.alternate_answers);
END $$;

NOTIFY pgrst, 'reload schema';
