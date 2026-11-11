-- Solo portal, part 2 (Saagii, 10 Nov 2026): the free tier. A free solo user (is_free_solo_user(), 0122) reads only
-- solo_free_slice: 30 Math questions from the CB set, 100 English questions, 1 practice test (and that test's
-- questions, so it can run) and the first lesson of every video topic unit; and gets 10 speed runs per rolling 24
-- hours. The demo-slice pattern (0108): each rule below is its latest definition with one added line, and everyone
-- else reads exactly as before, because that line is true for anyone who isn't a free solo user. Assumes 0122.
-- Free solo checks live inside shared rules and functions; a later CREATE OR REPLACE drops them silently, so each added
-- line carries "Free solo check (solo plan, 10 Nov): keep this line when rewriting." Keep the demo lines too.
-- Safe to run twice: the slice is emptied and refilled by the same rules.
SET lock_timeout = '3s';

-- 1. The slice. Only the service role writes it; signed-in accounts read the ids, because the read rules below look it
-- up as the reader (same reason as demo_slice, 0108). It holds only ids, no content.
CREATE TABLE IF NOT EXISTS public.solo_free_slice (item_id uuid PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('question','test','video')));
REVOKE ALL ON public.solo_free_slice FROM anon, authenticated;
GRANT ALL ON public.solo_free_slice TO service_role;
ALTER TABLE public.solo_free_slice ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.solo_free_slice TO authenticated;
DROP POLICY IF EXISTS "Signed-in accounts read the solo free slice ids" ON public.solo_free_slice;
CREATE POLICY "Signed-in accounts read the solo free slice ids" ON public.solo_free_slice FOR SELECT TO authenticated USING (true);

-- 2. Fill it. Picks are by md5(id) order, so a rerun on the same bank picks the same rows. A domain with too few
-- questions gives what it has and the NOTICE says so; a domain with none stops the migration (its name matches no
-- live category), before any rule below changes.
DO $$
DECLARE k record; n integer; msg text := ''; test uuid; copies integer; visible integer;
BEGIN
  DELETE FROM public.solo_free_slice;

  -- Questions, as the center practice pages count them: Math is subject NULL or 'math' (any case) in the CB set, which
  -- is every Math set but 68 and 150 (src/portal/practiceSets.ts); a domain is the question_categories name, in any case
  -- (as sync-external-questions looks them up). The Math domains are the sync's; the live bank calls the data one
  -- 'Data Analysis and Problem Solving', and centerReviewModel.ts's 'Problem-Solving and Data Analysis' counts too.
  -- The English ones are ENGLISH (src/portal/CenterSpeedLobby.tsx).
  FOR k IN SELECT * FROM (VALUES
    ('math', 'Algebra', NULL, 8), ('math', 'Advanced Math', NULL, 8),
    ('math', 'Data Analysis and Problem Solving', 'Problem-Solving and Data Analysis', 7), ('math', 'Geometry and Trigonometry', NULL, 7),
    ('english', 'Information and Ideas', NULL, 25), ('english', 'Craft and Structure', NULL, 25), ('english', 'Expression of Ideas', NULL, 25),
    ('english', 'Standard English Conventions', NULL, 25)
  ) v(subject, domain, alias, quota) LOOP
    INSERT INTO public.solo_free_slice (item_id, kind)
    SELECT q.id, 'question' FROM public.intl_questions q JOIN public.question_categories c ON c.id = q.category_id
    WHERE q.is_active AND NOT q.hide_from_practice AND lower(c.name) IN (lower(k.domain), lower(k.alias)) AND lower(coalesce(q.subject, 'math')) = k.subject
      AND (k.subject = 'english' OR q.question_set IS NULL OR q.question_set NOT IN ('68', 'SATMathTraining800'))
    ORDER BY md5(q.id::text), q.id
    LIMIT k.quota;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
      RAISE EXCEPTION '0123: no % questions in the % domain; check the question_categories names', k.subject, k.domain;
    END IF;
    msg := msg || format('%s %s %s/%s%s; ', k.subject, k.domain, n, k.quota, CASE WHEN n < k.quota THEN ' (SHORT: only ' || n || ' exist)' ELSE '' END);
  END LOOP;

  -- The test: the first one tenant_eligible_tests() lists. It takes no center and the migration has no caller, so this
  -- is the list every real center (the solo center included) sees.
  test := (public.tenant_eligible_tests() -> 0 ->> 'id')::uuid;
  IF test IS NULL THEN
    msg := msg || 'test: NONE (no eligible test, free users get no practice test); ';
  ELSE
    INSERT INTO public.solo_free_slice (item_id, kind) VALUES (test, 'test');
    SELECT count(*), count(*) FILTER (WHERE NOT i.hide_from_practice) INTO copies, visible FROM public.bluebook_modules m
    JOIN public.bluebook_module_questions mq ON mq.module_id = m.id JOIN public.questions q ON q.id = mq.question_id
    JOIN public.intl_questions i ON i.question_id = q.question_id AND i.is_active
    WHERE m.test_id = test AND m.section = 'math';
    msg := msg || format('test %s (%s question copies readable, %s of them not hidden from practice); ', test, copies, visible);
  END IF;

  -- Videos: the first lesson of each unit topicUnits (src/portal/videoTopics.ts:50) builds from the published videos.
  -- English is a domain in ENGLISH_AREAS, one unit per trimmed module (or the domain when there is none); Math is one
  -- unit per TOPICS name, matched on the trimmed module; any other Math video is the one "More videos" unit (NULL here).
  -- Trimmed means 0122's whitespace class (NBSP and the other Unicode spaces), as JS trim() does.
  -- First means lowest order_index (id breaks ties).
  INSERT INTO public.solo_free_slice (item_id, kind)
  SELECT DISTINCT ON (u.english, u.unit) u.id, 'video' FROM (
    SELECT v.id, v.order_index, e.english,
      CASE WHEN e.english THEN coalesce(nullif(e.m, ''), v.domain)
           WHEN e.m = ANY (ARRAY['Exponents & Radicals', 'Expressions', 'Manipulating & Solving Equations', 'Other Types of Equation Questions',
             'Functions', 'Lines & Linear Relationships', 'Interpreting Linear Equations & Models', 'Percent', 'Exponential vs. Linear Growth',
             'Rates, Conversions, & Ratios', 'Word Problems', 'Quadratic Equations', 'Systems of Equations', 'Inequalities', 'Function Transformations',
             'Quadratic Functions', 'Angles', 'Triangles', 'Circles', 'Radians', 'Trigonometry', 'Area, Perimeter, & Volume', 'Reading Data',
             'Probability', 'Statistics I', 'Statistics II']) THEN e.m END AS unit
    FROM public.concept_videos v
    CROSS JOIN LATERAL (SELECT regexp_replace(coalesce(v.module, ''), '^[\s\u00a0\u2000-\u200b\u202f\u3000\ufeff]+|[\s\u00a0\u2000-\u200b\u202f\u3000\ufeff]+$', '', 'g') AS m,
      v.domain IN ('Information & Ideas', 'Craft & Structure', 'Expression of Ideas', 'Standard English Conventions') AS english) e
    WHERE v.is_published
  ) u
  ORDER BY u.english, u.unit, u.order_index, u.id;
  GET DIAGNOSTICS n = ROW_COUNT;

  RAISE NOTICE '0123: solo free slice: %videos: % (one per topic unit)', msg, n;
END $$;

-- 3. The free test's questions, for the read rule below: every active International copy of its Math questions, the
-- same rows tenant_test_paper (0106) puts on the paper. Definer: the reader can't read questions or the bluebook tables.
CREATE OR REPLACE FUNCTION public.solo_free_test_questions() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id FROM public.solo_free_slice f
  JOIN public.bluebook_modules m ON m.test_id = f.item_id AND m.section = 'math'
  JOIN public.bluebook_module_questions mq ON mq.module_id = m.id
  JOIN public.questions q ON q.id = mq.question_id
  JOIN public.intl_questions i ON i.question_id = q.question_id AND i.is_active
  WHERE f.kind = 'test'
$$;
REVOKE ALL ON FUNCTION public.solo_free_test_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solo_free_test_questions() TO authenticated;

-- 4. Read rules: 0108's, plus the free solo line.
DROP POLICY IF EXISTS "Staff and centers view active intl questions" ON public.intl_questions;
CREATE POLICY "Staff and centers view active intl questions" ON public.intl_questions FOR SELECT TO authenticated
  USING (is_active AND (SELECT public.is_staff_or_center_member())
    AND ((SELECT NOT public.is_demo_user()) OR id IN (SELECT item_id FROM public.demo_slice WHERE kind = 'question')) -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
    AND ((SELECT NOT public.is_free_solo_user()) OR id IN (SELECT item_id FROM public.solo_free_slice WHERE kind = 'question') OR id IN (SELECT public.solo_free_test_questions()))); -- Free solo check (solo plan, 10 Nov): keep this line when rewriting.

DROP POLICY IF EXISTS "Staff and centers view published concept videos" ON public.concept_videos;
CREATE POLICY "Staff and centers view published concept videos" ON public.concept_videos FOR SELECT TO authenticated
  USING (is_published AND (SELECT public.is_staff_or_center_member())
    AND ((SELECT NOT public.is_demo_user()) OR id IN (SELECT item_id FROM public.demo_slice WHERE kind = 'video')) -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
    AND ((SELECT NOT public.is_free_solo_user()) OR id IN (SELECT item_id FROM public.solo_free_slice WHERE kind = 'video'))); -- Free solo check (solo plan, 10 Nov): keep this line when rewriting.

-- The file of a free video. The lookup reads concept_videos under the rule above, so an unpublished one doesn't count.
DROP POLICY IF EXISTS "Staff and centers read concept videos" ON storage.objects;
CREATE POLICY "Staff and centers read concept videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'concept-videos' AND (SELECT public.is_staff_or_center_member())
    AND ((SELECT NOT public.is_demo_user()) OR name IN (SELECT substr(v.video_url, 9) FROM public.concept_videos v JOIN public.demo_slice d ON d.item_id = v.id AND d.kind = 'video' WHERE v.video_url LIKE 'storage:%')) -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
    AND ((SELECT NOT public.is_free_solo_user()) OR name IN (SELECT substr(v.video_url, 9) FROM public.concept_videos v JOIN public.solo_free_slice f ON f.item_id = v.id AND f.kind = 'video' WHERE v.video_url LIKE 'storage:%'))); -- Free solo check (solo plan, 10 Nov): keep this line when rewriting.

-- concept-video-url's check (0108), the same rule as the bucket read above for one file.
CREATE OR REPLACE FUNCTION public.can_read_concept_video(_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff_or_center_member() AND ((SELECT NOT public.is_demo_user()) OR EXISTS (
    SELECT 1 FROM public.concept_videos v JOIN public.demo_slice d ON d.item_id = v.id AND d.kind = 'video'
    WHERE v.video_url = 'storage:' || _path)) -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
  AND ((SELECT NOT public.is_free_solo_user()) OR EXISTS (
    SELECT 1 FROM public.concept_videos v JOIN public.solo_free_slice f ON f.item_id = v.id AND f.kind = 'video'
    WHERE v.is_published AND v.video_url = 'storage:' || _path)); -- Free solo check (solo plan, 10 Nov): keep this line when rewriting.
$$;
REVOKE ALL ON FUNCTION public.can_read_concept_video(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_concept_video(text) TO authenticated;

-- 5. Which tests a center gets (0108's tenant_eligible_tests): a free solo user gets only the free test, so
-- tenant_practice_tests lists only it and tenant_test_start refuses the rest. Everyone else: exactly 0108.
CREATE OR REPLACE FUNCTION public.tenant_eligible_tests() RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'test_month',t.test_month,'test_year',t.test_year,'modules',s.modules,'questions',s.questions,'minutes',s.minutes)
ORDER BY t.test_year DESC NULLS LAST,t.test_month DESC NULLS LAST,t.name),'[]'::jsonb)
FROM public.bluebook_tests t CROSS JOIN LATERAL (SELECT count(*) modules,sum(mm.n) questions,sum(mm.mins) minutes,bool_and(mm.all_intl) all_intl FROM (SELECT m.time_limit_minutes mins,count(*) n,bool_and(i.id IS NOT NULL
AND ((SELECT NOT public.is_demo_user()) OR i.id IN (SELECT item_id FROM public.demo_slice WHERE kind='question')) -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
) all_intl FROM public.bluebook_modules m JOIN public.bluebook_module_questions mq ON mq.module_id=m.id LEFT JOIN public.questions q ON q.id=mq.question_id LEFT JOIN public.intl_questions i ON i.question_id=q.question_id AND i.is_active WHERE m.test_id=t.id AND m.section='math' GROUP BY m.id,m.time_limit_minutes) mm) s
WHERE t.is_published AND t.section_type='math' AND s.modules>0 AND s.all_intl
AND ((SELECT NOT public.is_free_solo_user()) OR t.id IN (SELECT item_id FROM public.solo_free_slice WHERE kind='test')) -- Free solo check (solo plan, 10 Nov): keep this line when rewriting.
$$;
REVOKE ALL ON FUNCTION public.tenant_eligible_tests() FROM PUBLIC,anon,authenticated;

-- 6. The SAT simulation (0108's tenant_sat_start) draws from the whole bank, so a free solo user can't start one either
-- (the feature is off, but the function can be called).
CREATE OR REPLACE FUNCTION public.tenant_sat_start(_institution uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; aid uuid; paper jsonb:='[]'; module integer; qs jsonb; needed integer;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF public.is_demo_center(_institution) THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
IF public.is_free_solo_user() THEN RAISE EXCEPTION 'The SAT simulation isn''t on the free plan.'; END IF; -- Free solo check (solo plan, 10 Nov): keep this line when rewriting.
PERFORM pg_advisory_xact_lock(hashtext(sid::text));
SELECT id INTO aid FROM public.tenant_sat_attempts WHERE student_id=sid AND status='in_progress' ORDER BY started_at DESC LIMIT 1; IF aid IS NOT NULL THEN RETURN aid; END IF;
FOR module IN 0..3 LOOP
needed:=CASE WHEN module<2 THEN 27 ELSE 22 END;
SELECT jsonb_agg(to_jsonb(q)) INTO qs FROM (SELECT id,question_id,question_text,passage_text,question_image_url,question_image_url_2,multiple_choice_options,choice_images,answer,alternate_answers,rationale FROM public.intl_questions WHERE is_active AND NOT hide_from_practice AND lower(subject)=CASE WHEN module<2 THEN 'english' ELSE 'math' END AND id::text NOT IN (SELECT e->>'id' FROM jsonb_array_elements(paper) m CROSS JOIN LATERAL jsonb_array_elements(m->'questions') e) ORDER BY random() LIMIT needed) q;
IF COALESCE(jsonb_array_length(qs),0)<needed THEN RAISE EXCEPTION 'Not enough published international questions for a full SAT'; END IF;
paper:=paper||jsonb_build_array(jsonb_build_object('section',CASE WHEN module<2 THEN 'reading_writing' ELSE 'math' END,'minutes',CASE WHEN module<2 THEN 32 ELSE 35 END,'questions',qs));
END LOOP;
INSERT INTO public.tenant_sat_attempts(institution_id,student_id,paper) VALUES(_institution,sid,paper) RETURNING id INTO aid; RETURN aid;
END $$;
REVOKE ALL ON FUNCTION public.tenant_sat_start(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tenant_sat_start(uuid) TO authenticated;

-- 7. Speed runs (0064's guard_tenant_speed_run): a free solo user gets 10 per rolling 24 hours. Counted after the
-- per-student lock, so two tabs can't both start the 10th.
CREATE OR REPLACE FUNCTION public.guard_tenant_speed_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int; k int; win int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(NEW.student_id::text));
  IF public.is_free_solo_user() AND (SELECT count(*) FROM public.tenant_speed_runs r
      WHERE r.student_id = NEW.student_id AND r.created_at > now() - interval '24 hours') >= 10 THEN -- Free solo check (solo plan, 10 Nov): keep this line when rewriting.
    RAISE EXCEPTION 'Free plan: 10 speed sessions a day' USING ERRCODE = 'P0001';
  END IF;
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

-- For the lobby: runs left in the last 24 hours, the same count as the guard; NULL for anyone not on the free plan.
CREATE OR REPLACE FUNCTION public.solo_speed_runs_left() RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.is_free_solo_user() THEN greatest(0, 10 - (
    SELECT count(*) FROM public.tenant_speed_runs r JOIN public.tenant_students s ON s.id = r.student_id
    WHERE s.institution_id = public.solo_institution_id() AND s.user_id = auth.uid() AND r.created_at > now() - interval '24 hours'))::int END
$$;
REVOKE ALL ON FUNCTION public.solo_speed_runs_left() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solo_speed_runs_left() TO authenticated;

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE '0123 applied: solo free tier'; END $$;
