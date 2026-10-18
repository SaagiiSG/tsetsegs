CREATE OR REPLACE FUNCTION public.student_badge_earned(p_student uuid, p_badge uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE b record; req jsonb; t text; target int; v int; ok boolean; s_start timestamptz; s_end timestamptz; mon int;
  total_q int; done_q int;
BEGIN
  IF public.student_badge_earned_core(p_student, p_badge) THEN RETURN true; END IF;
  SELECT id, name, requirements INTO b FROM public.badges WHERE id = p_badge;
  IF NOT FOUND THEN RETURN false; END IF;
  req := CASE WHEN jsonb_typeof(b.requirements) = 'array' THEN b.requirements->0 ELSE b.requirements END;
  t := req->>'type';
  target := coalesce((req->>'target')::int, 0);

  IF t = 'module_under_time' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.bluebook_attempts a
      JOIN public.bluebook_answers ans ON ans.attempt_id = a.id
      JOIN public.bluebook_modules m ON m.id = ans.module_id AND m.module_number = 1
      WHERE a.student_account_id = p_student AND a.status = 'completed'
      GROUP BY a.id, m.id
      HAVING bool_and(coalesce(ans.is_correct, false))
         AND count(DISTINCT ans.question_id) >= greatest(1, (SELECT count(*) FROM public.bluebook_module_questions q WHERE q.module_id = m.id))
         AND sum(coalesce(ans.time_spent_seconds, 0)) < target * 60);

  ELSIF t = 'perfect_test_under_time' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.bluebook_attempts a
      JOIN public.bluebook_answers ans ON ans.attempt_id = a.id
      WHERE a.student_account_id = p_student AND a.status = 'completed'
      GROUP BY a.id, a.test_id
      HAVING bool_and(coalesce(ans.is_correct, false))
         AND count(DISTINCT ans.question_id) >= greatest(1, (SELECT count(*) FROM public.bluebook_module_questions q
              JOIN public.bluebook_modules mm ON mm.id = q.module_id WHERE mm.test_id = a.test_id))
         AND sum(coalesce(ans.time_spent_seconds, 0)) < target * 60);

  ELSIF t = 'top_1_weeks' THEN
    SELECT coalesce(max(n), 0) INTO v FROM (
      SELECT count(*) n FROM (
        SELECT is_top_1, sum(CASE WHEN coalesce(is_top_1, false) THEN 0 ELSE 1 END) OVER (ORDER BY created_at) grp
        FROM public.student_sprint_rankings WHERE student_account_id = p_student) r
      WHERE coalesce(is_top_1, false) GROUP BY grp) z;
    RETURN target > 0 AND v >= target;

  ELSIF t IN ('seasonal_improvement', 'seasonal_tests') THEN
    SELECT start_date::timestamptz, end_date::timestamptz INTO s_start, s_end
    FROM public.seasonal_events WHERE badge_id IN (p_badge::text, lower(replace(b.name, ' ', '-'))) ORDER BY start_date DESC LIMIT 1;
    IF s_start IS NULL THEN
      mon := CASE WHEN b.name ILIKE 'august%' THEN 8 WHEN b.name ILIKE 'october%' THEN 10 ELSE NULL END;
      IF mon IS NULL THEN RETURN false; END IF;
      IF t = 'seasonal_tests' THEN
        RETURN EXISTS (SELECT 1 FROM public.bluebook_attempts
          WHERE student_account_id = p_student AND status = 'completed'
            AND extract(month FROM completed_at AT TIME ZONE 'Asia/Ulaanbaatar') = mon
          GROUP BY extract(year FROM completed_at AT TIME ZONE 'Asia/Ulaanbaatar') HAVING count(*) >= target);
      ELSE
        RETURN EXISTS (SELECT 1 FROM (
          SELECT extract(year FROM completed_at AT TIME ZONE 'Asia/Ulaanbaatar') y, total_score,
                 row_number() OVER (PARTITION BY extract(year FROM completed_at AT TIME ZONE 'Asia/Ulaanbaatar') ORDER BY completed_at) rn_first,
                 row_number() OVER (PARTITION BY extract(year FROM completed_at AT TIME ZONE 'Asia/Ulaanbaatar') ORDER BY completed_at DESC) rn_last
          FROM public.bluebook_attempts
          WHERE student_account_id = p_student AND status = 'completed' AND total_score IS NOT NULL
            AND extract(month FROM completed_at AT TIME ZONE 'Asia/Ulaanbaatar') = mon) x
          GROUP BY y HAVING count(*) >= 2
            AND max(total_score) FILTER (WHERE rn_last = 1) - max(total_score) FILTER (WHERE rn_first = 1) >= target);
      END IF;
    END IF;
    s_end := s_end + interval '1 day';
    IF t = 'seasonal_tests' THEN
      SELECT count(*) INTO v FROM public.bluebook_attempts
      WHERE student_account_id = p_student AND status = 'completed' AND completed_at >= s_start AND completed_at < s_end;
      RETURN v >= target;
    ELSE
      SELECT (array_agg(total_score ORDER BY completed_at DESC))[1] - (array_agg(total_score ORDER BY completed_at))[1], count(*)
      INTO v, done_q FROM public.bluebook_attempts
      WHERE student_account_id = p_student AND status = 'completed' AND total_score IS NOT NULL
        AND completed_at >= s_start AND completed_at < s_end;
      RETURN done_q >= 2 AND coalesce(v, 0) >= target;
    END IF;

  ELSIF t IN ('penguin', 'glacier_penguin') THEN
    SELECT count(*) INTO total_q FROM public.questions WHERE question_set = '68' AND is_active IS NOT FALSE;
    SELECT count(DISTINCT sa.question_id) INTO done_q FROM public.student_attempts sa
      JOIN public.questions q ON q.id = sa.question_id AND q.question_set = '68' AND q.is_active IS NOT FALSE
      WHERE sa.student_account_id = p_student AND sa.is_correct;
    IF total_q = 0 OR done_q < total_q THEN RETURN false; END IF;
    SELECT count(*) INTO total_q FROM public.questions WHERE question_set = 'CollegeBoard' AND is_active IS NOT FALSE;
    SELECT count(DISTINCT sa.question_id) INTO done_q FROM public.student_attempts sa
      JOIN public.questions q ON q.id = sa.question_id AND q.question_set = 'CollegeBoard' AND q.is_active IS NOT FALSE
      WHERE sa.student_account_id = p_student AND sa.is_correct;
    IF total_q = 0 OR done_q < total_q THEN RETURN false; END IF;
    SELECT avg(total_score) INTO v FROM public.bluebook_attempts
      WHERE student_account_id = p_student AND status = 'completed' AND total_score IS NOT NULL;
    IF coalesce(v, 0) < 750 THEN RETURN false; END IF;
    SELECT count(*) INTO total_q FROM public.vocabulary_words WHERE is_active IS NOT FALSE;
    SELECT count(*) INTO done_q FROM public.student_vocabulary_progress p
      JOIN public.vocabulary_words w ON w.id = p.word_id AND w.is_active IS NOT FALSE
      WHERE p.student_account_id = p_student AND p.confidence_level >= 3;
    IF total_q = 0 OR done_q < total_q THEN RETURN false; END IF;
    IF t = 'penguin' THEN RETURN true; END IF;
    SELECT count(*) INTO total_q FROM public.questions WHERE lower(subject) = 'english' AND is_active IS NOT FALSE;
    SELECT count(DISTINCT sa.question_id) INTO done_q FROM public.student_attempts sa
      JOIN public.questions q ON q.id = sa.question_id AND lower(q.subject) = 'english' AND q.is_active IS NOT FALSE
      WHERE sa.student_account_id = p_student AND sa.is_correct;
    RETURN total_q > 0 AND done_q >= total_q;
  END IF;

  RETURN false;
END $function$;