-- Live demo, part 1 (Saagii, 30 Oct): demo visitors get a throwaway sample center and the real center portals run
-- against it. A demo center reads only a small slice of the International bank, built around one real practice test
-- (Saagii, 30 Oct), plus a few concept videos; and a few things that reach outside the app refuse demo users.
-- Real centers behave exactly as before: every demo check is false for them.
-- Demo checks live inside shared rules and functions; a later CREATE OR REPLACE drops them silently, so each added
-- line carries "Demo check (live-demo plan, 30 Oct): keep this line when rewriting."
SET lock_timeout = '3s';

-- 1. The flag, the slice, and who counts as demo.
ALTER TABLE public.institution_customers ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Question and video ids a demo center may read. Filled once below; only the service role writes it.
CREATE TABLE public.demo_slice (item_id uuid PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('question','video')));
REVOKE ALL ON public.demo_slice FROM anon, authenticated;
GRANT ALL ON public.demo_slice TO service_role;
ALTER TABLE public.demo_slice ENABLE ROW LEVEL SECURITY;
-- The read rules in section 3 look the slice up as the reader, and RLS applies inside them: with no read rule here
-- they would see no slice (demo users would get nothing) or, without SELECT, fail for real centers too.
-- It holds only ids, no question content.
GRANT SELECT ON public.demo_slice TO authenticated;
CREATE POLICY "Signed-in accounts read the demo slice ids" ON public.demo_slice FOR SELECT TO authenticated USING (true);

-- Demo logins are the made-up @demo.flowersos.co emails the demo function creates. Only the email counts: membership
-- can be written by a demo admin (any user_id on their copy's students or staff), the email can't, so a real account
-- written into a copy keeps its own access. Never NULL: the read rules below use NOT is_demo_user().
CREATE FUNCTION public.is_demo_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) LIKE '%@demo.flowersos.co';
$$;
REVOKE ALL ON FUNCTION public.is_demo_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_user() TO authenticated;

CREATE FUNCTION public.is_demo_center(_institution uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.institution_customers WHERE id = _institution AND is_demo);
$$;
REVOKE ALL ON FUNCTION public.is_demo_center(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_center(uuid) TO authenticated, service_role;

-- Only demo logins (and the build's placeholder ids, which have no login) may sit in a demo center. A real account
-- there isn't a demo user, so it would read the whole bank and every test through the copy; this refuses it whoever
-- writes it (a demo admin via the 0002/0067 rules, a join, or the service role).
CREATE FUNCTION public.demo_guard_login() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND public.is_demo_center(NEW.institution_id) AND EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = NEW.user_id AND lower(coalesce(u.email, '')) NOT LIKE '%@demo.flowersos.co') THEN
    RAISE EXCEPTION 'Turned off in the demo.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.demo_guard_login() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER demo_guard_login BEFORE INSERT OR UPDATE OF user_id, institution_id ON public.tenant_students
  FOR EACH ROW EXECUTE FUNCTION public.demo_guard_login();
CREATE TRIGGER demo_guard_login BEFORE INSERT OR UPDATE OF user_id, institution_id ON public.tenant_members
  FOR EACH ROW EXECUTE FUNCTION public.demo_guard_login();

-- 2. Fill the slice once (about 55 questions and 5 videos; spec section 3).
DO $$
DECLARE test uuid; n integer;
BEGIN
  -- The test: a published Math test that tenant_eligible_tests (0106) offers (every Math question has an active
  -- International copy), preferring the one whose copies have the most explanations.
  SELECT t.id INTO test
  FROM public.bluebook_tests t
  JOIN public.bluebook_modules m ON m.test_id = t.id AND m.section = 'math'
  JOIN public.bluebook_module_questions mq ON mq.module_id = m.id
  LEFT JOIN public.questions q ON q.id = mq.question_id
  LEFT JOIN public.intl_questions i ON i.question_id = q.question_id AND i.is_active
  WHERE t.is_published AND t.section_type = 'math'
  GROUP BY t.id
  HAVING bool_and(i.id IS NOT NULL)
  ORDER BY count(*) FILTER (WHERE coalesce(i.rationale, '') <> '') DESC, t.test_year DESC NULLS LAST, t.test_month DESC NULLS LAST, t.name
  LIMIT 1;
  IF test IS NULL THEN RAISE EXCEPTION '0108: no published Math test has International copies of every question'; END IF;

  -- Every active copy, duplicates included, so tenant_test_paper's paper stays inside the slice.
  INSERT INTO public.demo_slice (item_id, kind)
  SELECT DISTINCT i.id, 'question'
  FROM public.bluebook_modules m
  JOIN public.bluebook_module_questions mq ON mq.module_id = m.id
  JOIN public.questions q ON q.id = mq.question_id
  JOIN public.intl_questions i ON i.question_id = q.question_id AND i.is_active
  WHERE m.test_id = test AND m.section = 'math';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n < 30 THEN RAISE EXCEPTION '0108: the chosen test % has only % Math questions', test, n; END IF;

  -- Teacher-written Desmos solutions: the edge Saagii sells.
  INSERT INTO public.demo_slice (item_id, kind)
  SELECT id, 'question' FROM public.intl_questions
  WHERE is_active AND ext_variant AND NOT hide_from_practice AND lower(subject) = 'math' AND rationale ILIKE '%desmos%'
    AND id NOT IN (SELECT item_id FROM public.demo_slice)
  ORDER BY created_at DESC, id LIMIT 12;

  -- A taste of English. These explanations are College Board's, not the teachers'.
  INSERT INTO public.demo_slice (item_id, kind)
  SELECT id, 'question' FROM public.intl_questions
  WHERE is_active AND lower(subject) <> 'math' AND coalesce(rationale, '') <> ''
  ORDER BY created_at DESC, id LIMIT 5;

  INSERT INTO public.demo_slice (item_id, kind)
  SELECT id, 'video' FROM public.concept_videos WHERE is_published ORDER BY order_index, id LIMIT 5;

  RAISE NOTICE '0108: demo slice is test % (% questions), % questions and % videos in all', test, n,
    (SELECT count(*) FROM public.demo_slice WHERE kind = 'question'), (SELECT count(*) FROM public.demo_slice WHERE kind = 'video');
END $$;

-- 3. Read rules (same names as 0088): demo users read only the slice; everyone else as before.
DROP POLICY IF EXISTS "Staff and centers view active intl questions" ON public.intl_questions;
CREATE POLICY "Staff and centers view active intl questions" ON public.intl_questions FOR SELECT TO authenticated
  USING (is_active AND (SELECT public.is_staff_or_center_member())
    AND ((SELECT NOT public.is_demo_user()) OR id IN (SELECT item_id FROM public.demo_slice WHERE kind = 'question'))); -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.

DROP POLICY IF EXISTS "Staff and centers view published concept videos" ON public.concept_videos;
CREATE POLICY "Staff and centers view published concept videos" ON public.concept_videos FOR SELECT TO authenticated
  USING (is_published AND (SELECT public.is_staff_or_center_member())
    AND ((SELECT NOT public.is_demo_user()) OR id IN (SELECT item_id FROM public.demo_slice WHERE kind = 'video'))); -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.

-- Uploaded files are stored as 'storage:<object name>' in concept_videos.video_url (src/lib/conceptVideos.ts).
DROP POLICY IF EXISTS "Staff and centers read concept videos" ON storage.objects;
CREATE POLICY "Staff and centers read concept videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'concept-videos' AND (SELECT public.is_staff_or_center_member())
    AND ((SELECT NOT public.is_demo_user()) OR name IN (SELECT substr(v.video_url, 9) FROM public.concept_videos v JOIN public.demo_slice d ON d.item_id = v.id AND d.kind = 'video' WHERE v.video_url LIKE 'storage:%'))); -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.

-- 4. Question details without content, for any active International question: a demo center's sample history points
-- at questions outside the slice, and topic mastery, the daily rings and the SAT simulation need their topic and
-- difficulty. Never text, answers or explanations.
CREATE FUNCTION public.intl_question_meta(_ids uuid[])
RETURNS TABLE(id uuid, subject text, skill text, category_id uuid, difficulty_level text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF cardinality(_ids) > 2000 THEN RAISE EXCEPTION 'Ask for at most 2,000 questions at a time.'; END IF;
  IF NOT public.is_staff_or_center_member() THEN RETURN; END IF;
  RETURN QUERY SELECT q.id, q.subject, q.skill, q.category_id, q.difficulty_level
    FROM public.intl_questions q WHERE q.is_active AND q.id = ANY(_ids);
END $$;
REVOKE ALL ON FUNCTION public.intl_question_meta(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.intl_question_meta(uuid[]) TO authenticated;

-- For concept-video-url (signs with the service role), called with the caller's own token: the same rule as the bucket
-- read above, for one file. Staff (previewing unpublished uploads) and real centers keep any path, as before.
CREATE FUNCTION public.can_read_concept_video(_path text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff_or_center_member() AND ((SELECT NOT public.is_demo_user()) OR EXISTS (
    SELECT 1 FROM public.concept_videos v JOIN public.demo_slice d ON d.item_id = v.id AND d.kind = 'video'
    WHERE v.video_url = 'storage:' || _path));
$$;
REVOKE ALL ON FUNCTION public.can_read_concept_video(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_concept_video(text) TO authenticated;

-- 5. Which tests a center gets: 0106's tenant_eligible_tests, the one list behind tenant_practice_tests (so tenant_test_start),
-- tenant_proctor_tests, tenant_proctor_create and tenant_proctor_join. For a demo user a test counts only if every active
-- International copy of every Math question is in the slice (fails closed), so no paper, practice or proctored, leaves it.
-- It takes no center, so it asks who is calling: those four let into a demo center only its own staff and students,
-- and demo_guard_login keeps those to demo logins. Real centers and Tsetsegs staff: exactly 0106.
CREATE OR REPLACE FUNCTION public.tenant_eligible_tests() RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'test_month',t.test_month,'test_year',t.test_year,'modules',s.modules,'questions',s.questions,'minutes',s.minutes)
ORDER BY t.test_year DESC NULLS LAST,t.test_month DESC NULLS LAST,t.name),'[]'::jsonb)
FROM public.bluebook_tests t CROSS JOIN LATERAL (SELECT count(*) modules,sum(mm.n) questions,sum(mm.mins) minutes,bool_and(mm.all_intl) all_intl FROM (SELECT m.time_limit_minutes mins,count(*) n,bool_and(i.id IS NOT NULL
AND ((SELECT NOT public.is_demo_user()) OR i.id IN (SELECT item_id FROM public.demo_slice WHERE kind='question')) -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
) all_intl FROM public.bluebook_modules m JOIN public.bluebook_module_questions mq ON mq.module_id=m.id LEFT JOIN public.questions q ON q.id=mq.question_id LEFT JOIN public.intl_questions i ON i.question_id=q.question_id AND i.is_active WHERE m.test_id=t.id AND m.section='math' GROUP BY m.id,m.time_limit_minutes) mm) s
WHERE t.is_published AND t.section_type='math' AND s.modules>0 AND s.all_intl $$;
REVOKE ALL ON FUNCTION public.tenant_eligible_tests() FROM PUBLIC,anon,authenticated;

-- 6. SAT simulation (0014) draws from the whole bank, so a demo center can't start one (the feature is off anyway).
CREATE OR REPLACE FUNCTION public.tenant_sat_start(_institution uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; aid uuid; paper jsonb:='[]'; module integer; qs jsonb; needed integer;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF public.is_demo_center(_institution) THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
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

-- 7. Contact FlowersOS (0081) emails the owner: turned off in the demo.
CREATE OR REPLACE FUNCTION public.submit_support_request(_institution uuid, _subject text, _message text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.tenant_members; new_id uuid;
BEGIN
  IF public.is_demo_user() THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first.'; END IF;
  SELECT * INTO m FROM public.tenant_members WHERE institution_id = _institution AND user_id = auth.uid() AND active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only center staff can contact FlowersOS. Please ask your center.'; END IF;
  _subject := trim(coalesce(_subject, '')); _message := trim(coalesce(_message, ''));
  IF length(_subject) NOT BETWEEN 3 AND 150 OR length(_message) NOT BETWEEN 10 AND 4000 THEN
    RAISE EXCEPTION 'Add a subject (3 to 150 characters) and a message (10 to 4000 characters).';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('support_request:' || auth.uid()));
  IF (SELECT count(*) FROM public.support_requests WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 5 THEN
    RAISE EXCEPTION 'You have sent 5 requests in the last hour. Please try again later.';
  END IF;
  INSERT INTO public.support_requests (institution_id, user_id, role, name, email, subject, message)
  VALUES (_institution, auth.uid(), m.role, m.display_name, m.email, _subject, _message) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.submit_support_request(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_support_request(uuid, text, text) TO authenticated;

-- 8. Main admin activity (0018): demo centers are not real customers.
CREATE OR REPLACE FUNCTION public.admin_customer_activity()
 RETURNS TABLE(institution_id uuid, students bigint, attempts_7d bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT c.id,
    (SELECT count(*) FROM public.tenant_students s WHERE s.institution_id = c.id AND s.active),
    (SELECT count(*) FROM public.tenant_attempts a WHERE a.institution_id = c.id AND a.created_at > now() - interval '7 days')
  FROM public.institution_customers c
  WHERE NOT c.is_demo; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_customer_activity() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_activity() TO authenticated;

-- 10. Question search (Saagii, 30 Oct: "remove the search questions from the demo sites"): demo users get nothing.
-- It reads the Tsetsegs bank for any caller; fixing that for real centers is the center-admin session's job.
CREATE OR REPLACE FUNCTION public.search_questions(
  p_query text,
  p_scope text DEFAULT 'student',
  p_subject text DEFAULT 'all',
  p_set text DEFAULT 'all',
  p_difficulty text DEFAULT 'all',
  p_category uuid DEFAULT NULL,
  p_limit int DEFAULT 60,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  question_id text,
  question_text text,
  question_image_url text,
  difficulty_level text,
  question_type text,
  subject text,
  question_set text,
  category_name text,
  is_active boolean,
  hide_from_practice boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text := lower(coalesce(p_scope, 'student'));
  v_q text := trim(coalesce(p_query, ''));
  v_pattern text;
BEGIN
  IF public.is_demo_user() THEN RETURN; END IF; -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
  IF length(v_q) < 2 THEN
    RETURN;
  END IF;

  IF v_scope = 'admin' AND NOT public.has_role(auth.uid(), 'admin') THEN
    v_scope := 'teacher';
  END IF;

  IF v_scope = 'teacher' AND auth.uid() IS NULL THEN
    v_scope := 'student';
  END IF;

  v_pattern := '%' || v_q || '%';

  RETURN QUERY
  WITH matched AS (
    SELECT q.id, q.question_id, q.question_text, q.question_image_url,
           q.difficulty_level, q.question_type, q.subject, q.question_set,
           c.name AS category_name, q.is_active, q.hide_from_practice
    FROM public.questions q
    LEFT JOIN public.question_categories c ON c.id = q.category_id
    WHERE (
        q.question_text ILIKE v_pattern
        OR q.question_id ILIKE v_pattern
        OR coalesce(q.original_cb_id, '') ILIKE v_pattern
        OR coalesce(q.multiple_choice_options::text, '') ILIKE v_pattern
      )
      AND (v_scope = 'admin' OR q.is_active = true)
      AND (v_scope = 'admin' OR q.question_id NOT ILIKE 'BBK%')
      AND (v_scope <> 'student' OR q.hide_from_practice = false)
      AND (
        p_subject = 'all'
        OR (p_subject = 'math' AND coalesce(q.subject, 'math') = 'math')
        OR (p_subject = 'english' AND q.subject = 'english')
      )
      AND (
        p_set = 'all'
        OR (p_set = '68' AND q.question_set = '68')
        OR (p_set = 'cb' AND q.question_set = 'CollegeBoard')
        OR (p_set = '150_hard' AND q.question_set = 'SATMathTraining800')
        OR (p_set = 'anp' AND q.question_set = 'ANP120Aug3')
        OR (p_set = 'bbk' AND q.question_id ILIKE 'BBK%')
        OR (p_set = 'ext' AND q.question_id ILIKE 'EXT%')
        OR (p_set = 'english' AND q.subject = 'english')
      )
      AND (p_difficulty = 'all' OR q.difficulty_level = p_difficulty)
      AND (p_category IS NULL OR q.category_id = p_category)
  ), counted AS (
    SELECT count(*) AS n FROM matched
  )
  SELECT m.id, m.question_id, m.question_text, m.question_image_url,
         m.difficulty_level, m.question_type, m.subject, m.question_set,
         m.category_name, m.is_active, m.hide_from_practice, counted.n
  FROM matched m CROSS JOIN counted
  ORDER BY m.question_id
  LIMIT greatest(1, least(coalesce(p_limit, 60), 100))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_questions(text, text, text, text, text, uuid, int, int) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
