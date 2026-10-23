-- Center Speed mode paid the same graded answers to every run row. A run now claims only answers graded
-- after this student's previous run, and per-student / per-question locks make simultaneous requests take turns.

CREATE OR REPLACE FUNCTION public.guard_tenant_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE q record; prior int; solved boolean;
BEGIN
  -- Duplicate requests wait here, then see each other's row in `prior`, so first-time points are paid once.
  PERFORM pg_advisory_xact_lock(hashtext(NEW.student_id::text || NEW.question_id::text));
  SELECT answer, alternate_answers INTO q FROM public.intl_questions WHERE id = NEW.question_id;
  NEW.is_correct := FOUND AND q.answer IS NOT NULL AND NEW.answer IS NOT NULL AND (
    upper(btrim(NEW.answer)) = upper(btrim(q.answer)) OR public.fill_answer_matches(NEW.answer, q.answer, q.alternate_answers));
  NEW.created_at := now();
  NEW.time_spent_seconds := CASE WHEN NEW.time_spent_seconds IS NULL THEN NULL ELSE greatest(1, least(3600, NEW.time_spent_seconds)) END;
  SELECT count(*), coalesce(bool_or(is_correct), false) INTO prior, solved FROM public.tenant_attempts
    WHERE student_id = NEW.student_id AND question_id = NEW.question_id;
  NEW.points := CASE WHEN NOT NEW.is_correct OR solved THEN 0
                     WHEN prior = 0 THEN 10 WHEN prior = 1 THEN 5 WHEN prior = 2 THEN 2 ELSE 0 END;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_tenant_speed_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int; k int; win int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.student_id::text));
  NEW.created_at := now();
  win := greatest(30, least(1800, coalesce(NEW.total_time_seconds, NEW.duration_seconds, 600))) + 60;
  NEW.duration_seconds := least(1800, greatest(0, coalesce(NEW.duration_seconds, 0)));
  NEW.total_time_seconds := least(1800, greatest(0, coalesce(NEW.total_time_seconds, 0)));
  -- Speed answers are graded individually; the run can only claim what was graded in its window.
  -- Each run owns the answers between the previous run and its own start, so no answer is claimed twice.
  SELECT count(*), count(*) FILTER (WHERE is_correct AND points > 0) INTO n, k FROM public.tenant_attempts
    WHERE student_id = NEW.student_id AND created_at >= now() - make_interval(secs => win)
      AND created_at <= NEW.created_at
      AND created_at > coalesce((SELECT max(r.created_at) FROM public.tenant_speed_runs r WHERE r.student_id = NEW.student_id), '-infinity');
  NEW.total := greatest(1, least(coalesce(NEW.total, 0), n));
  NEW.correct := greatest(0, least(coalesce(NEW.correct, 0), k, NEW.total));
  RETURN NEW;
END $$;

DO $$ BEGIN RAISE NOTICE '0064 applied: center speed runs pay each answer once'; END $$;
