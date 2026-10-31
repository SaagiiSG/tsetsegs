-- Center proctored tests (Saagii, 30 Oct): a teacher runs a practice test for a class like the main site's proctor
-- (join code, unlock code, oath, start for everyone, review mode, force end). A proctored sitting is an ordinary
-- tenant_test_attempts row with a session_id. Students get no paper until the session is active and they've taken the
-- oath, and no keys while review is off. A student may still self-start the same test; the two never collide.

CREATE TABLE public.tenant_proctor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id),
  class_id uuid REFERENCES public.tenant_classes(id) ON DELETE SET NULL, -- sessions outlive their class, so their attempts keep the gates
  test_id uuid NOT NULL REFERENCES public.bluebook_tests(id),
  title text NOT NULL,
  join_code text NOT NULL,
  unlock_code text NOT NULL,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','active','finished')),
  review_mode text NOT NULL DEFAULT 'off' CHECK (review_mode IN ('off','correctness','explanations')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Students type the join code in any case, so it's unique (and looked up) in upper case.
CREATE UNIQUE INDEX tenant_proctor_sessions_join_code_idx ON public.tenant_proctor_sessions(upper(join_code));
-- Every write but review_mode goes through the proctor RPCs; the unlock code is readable to staff only.
REVOKE ALL ON public.tenant_proctor_sessions FROM anon, authenticated;
GRANT SELECT, UPDATE(review_mode) ON public.tenant_proctor_sessions TO authenticated;
GRANT ALL ON public.tenant_proctor_sessions TO service_role;
ALTER TABLE public.tenant_proctor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Center staff read proctor sessions" ON public.tenant_proctor_sessions FOR SELECT TO authenticated USING (public.tenant_has_role(institution_id,'teacher'));
CREATE POLICY "Center staff set review mode" ON public.tenant_proctor_sessions FOR UPDATE TO authenticated USING (public.tenant_has_role(institution_id,'teacher')) WITH CHECK (public.tenant_has_role(institution_id,'teacher'));
CREATE POLICY "Platform admins manage proctor sessions" ON public.tenant_proctor_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.tenant_test_attempts ADD COLUMN session_id uuid REFERENCES public.tenant_proctor_sessions(id) ON DELETE SET NULL, ADD COLUMN code_verified_at timestamptz, ADD COLUMN oath_accepted_at timestamptz, ADD COLUMN focus_violations integer NOT NULL DEFAULT 0;
GRANT SELECT(session_id,code_verified_at,oath_accepted_at,focus_violations) ON public.tenant_test_attempts TO authenticated;
-- One open self-started attempt per test, and one attempt per student per session; the two don't block each other.
DROP INDEX public.tenant_test_open_idx;
CREATE UNIQUE INDEX tenant_test_open_idx ON public.tenant_test_attempts(student_id,test_id) WHERE status='in_progress' AND session_id IS NULL;
CREATE UNIQUE INDEX tenant_test_session_student_idx ON public.tenant_test_attempts(session_id,student_id) WHERE session_id IS NOT NULL;

-- 0091's one rule for which tests a center offers (published Math tests; their Math modules that have questions, every
-- question with an active International copy), shared by the students' list, the staff's proctor list and their checks.
CREATE OR REPLACE FUNCTION public.tenant_eligible_tests() RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'test_month',t.test_month,'test_year',t.test_year,'modules',s.modules,'questions',s.questions,'minutes',s.minutes)
ORDER BY t.test_year DESC NULLS LAST,t.test_month DESC NULLS LAST,t.name),'[]'::jsonb)
FROM public.bluebook_tests t CROSS JOIN LATERAL (SELECT count(*) modules,sum(mm.n) questions,sum(mm.mins) minutes,bool_and(mm.all_intl) all_intl FROM (SELECT m.time_limit_minutes mins,count(*) n,bool_and(i.id IS NOT NULL) all_intl FROM public.bluebook_modules m JOIN public.bluebook_module_questions mq ON mq.module_id=m.id LEFT JOIN public.questions q ON q.id=mq.question_id LEFT JOIN public.intl_questions i ON i.question_id=q.question_id AND i.is_active WHERE m.test_id=t.id AND m.section='math' GROUP BY m.id,m.time_limit_minutes) mm) s
WHERE t.is_published AND t.section_type='math' AND s.modules>0 AND s.all_intl $$;

-- 0091's paper: the test's Math modules that have questions (as the list counts them) in module_number order, questions in
-- order_index order. Self-started and proctored attempts both take it.
CREATE OR REPLACE FUNCTION public.tenant_test_paper(_test uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
SELECT jsonb_agg(jsonb_build_object('number',m.module_number,'minutes',m.time_limit_minutes,'questions',
(SELECT jsonb_agg(to_jsonb(i) ORDER BY mq.order_index,mq.id) FROM public.bluebook_module_questions mq JOIN public.questions q ON q.id=mq.question_id CROSS JOIN LATERAL (SELECT x.id,x.question_id,x.question_text,x.passage_text,x.question_image_url,x.question_image_url_2,x.multiple_choice_options,x.choice_images,x.answer,x.alternate_answers FROM public.intl_questions x WHERE x.question_id=q.question_id AND x.is_active) i WHERE mq.module_id=m.id))
ORDER BY m.module_number)
FROM public.bluebook_modules m WHERE m.test_id=_test AND m.section='math' AND EXISTS(SELECT 1 FROM public.bluebook_module_questions y WHERE y.module_id=m.id) $$;
REVOKE ALL ON FUNCTION public.tenant_eligible_tests(),public.tenant_test_paper(uuid) FROM PUBLIC,anon,authenticated;

-- As 0091; the open attempt is the self-started one.
CREATE OR REPLACE FUNCTION public.tenant_practice_tests(_institution uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
RETURN COALESCE((SELECT jsonb_agg(e.v||jsonb_build_object(
'last_score',(SELECT a.math_score FROM public.tenant_test_attempts a WHERE a.student_id=sid AND a.test_id=(e.v->>'id')::uuid AND a.status='completed' ORDER BY a.completed_at DESC LIMIT 1),
'open_attempt',(SELECT a.id FROM public.tenant_test_attempts a WHERE a.student_id=sid AND a.test_id=(e.v->>'id')::uuid AND a.status='in_progress' AND a.session_id IS NULL LIMIT 1))
ORDER BY e.o) FROM jsonb_array_elements(public.tenant_eligible_tests()) WITH ORDINALITY e(v,o)),'[]'::jsonb);
END $$;

-- As 0091; resumes only a self-started attempt.
CREATE OR REPLACE FUNCTION public.tenant_test_start(_institution uuid,_test uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; aid uuid;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(sid::text));
SELECT id INTO aid FROM public.tenant_test_attempts WHERE student_id=sid AND test_id=_test AND status='in_progress' AND session_id IS NULL; IF aid IS NOT NULL THEN RETURN aid; END IF;
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.tenant_practice_tests(_institution)) e(v) WHERE e.v->>'id'=_test::text) THEN RAISE EXCEPTION 'This test is not available'; END IF;
INSERT INTO public.tenant_test_attempts(institution_id,student_id,test_id,test_name,paper) SELECT _institution,sid,t.id,t.name,public.tenant_test_paper(t.id) FROM public.bluebook_tests t WHERE t.id=_test RETURNING id INTO aid; RETURN aid;
END $$;

-- Grades from the stored answers (0091's loop and score). Internal: tenant_test_save and the proctor's force end call it.
CREATE OR REPLACE FUNCTION public.tenant_test_grade(_attempt uuid) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; q jsonb; good integer:=0; total integer:=0;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt FOR UPDATE;
IF a.id IS NULL OR a.status='completed' THEN RETURN; END IF;
FOR q IN SELECT e.v FROM jsonb_array_elements(a.paper) m(v) CROSS JOIN LATERAL jsonb_array_elements(m.v->'questions') e(v) LOOP
total:=total+1;
IF public.fill_answer_matches(a.answers->(q->>'id')->>'value',q->>'answer',ARRAY(SELECT jsonb_array_elements_text(COALESCE(NULLIF(q->'alternate_answers','null'::jsonb),'[]'::jsonb)))) THEN good:=good+1; END IF;
END LOOP;
UPDATE public.tenant_test_attempts SET status='completed',completed_at=now(),math_correct=good,math_total=total,math_score=(round((200+good::numeric/total*600)/10)*10)::integer WHERE id=a.id;
END $$;
REVOKE ALL ON FUNCTION public.tenant_test_grade(uuid) FROM PUBLIC,anon,authenticated;

-- As 0091, plus the session. A proctored student gets no paper until the session is active and they've taken the oath;
-- once finished, review mode decides: off = no paper (score only, as main's proctor_review), correctness = a correct flag per question, explanations = as 0091.
CREATE OR REPLACE FUNCTION public.tenant_test_state(_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; s public.tenant_proctor_sessions; p jsonb:='[]'; m jsonb; qs jsonb;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt;
IF a.id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=a.session_id;
IF a.session_id IS NULL OR (a.status='completed' AND s.review_mode<>'off') OR (a.status<>'completed' AND s.status IN ('active','finished') AND a.oath_accepted_at IS NOT NULL) THEN
FOR m IN SELECT value FROM jsonb_array_elements(a.paper) LOOP
SELECT jsonb_agg(CASE WHEN a.status='completed' AND (a.session_id IS NULL OR s.review_mode='explanations') THEN e.value||jsonb_build_object('rationale',(SELECT x.rationale FROM public.intl_questions x WHERE x.id=(e.value->>'id')::uuid))
WHEN a.status='completed' AND s.review_mode='correctness' THEN e.value-'answer'-'alternate_answers'-'rationale'||jsonb_build_object('correct',public.fill_answer_matches(a.answers->(e.value->>'id')->>'value',e.value->>'answer',ARRAY(SELECT jsonb_array_elements_text(COALESCE(NULLIF(e.value->'alternate_answers','null'::jsonb),'[]'::jsonb)))))
ELSE e.value-'answer'-'alternate_answers'-'rationale' END ORDER BY e.ord) INTO qs FROM jsonb_array_elements(m->'questions') WITH ORDINALITY e(value,ord);
p:=p||jsonb_build_array(jsonb_set(m,'{questions}',qs)); END LOOP;
END IF;
RETURN to_jsonb(a)-'paper'||jsonb_build_object('paper',p,'session',CASE WHEN s.id IS NOT NULL THEN jsonb_build_object('status',s.status,'review_mode',s.review_mode,'title',s.title) END);
END $$;

-- As 0091, but a proctored attempt saves nothing until its session is active and the oath is taken, and grading is tenant_test_grade.
CREATE OR REPLACE FUNCTION public.tenant_test_save(_attempt uuid,_answers jsonb,_advance boolean DEFAULT false,_module integer DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; merged jsonb; q jsonb;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt FOR UPDATE;
IF a.id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF a.status<>'in_progress' OR (_module IS NOT NULL AND _module<>a.current_module) THEN RETURN; END IF;
IF a.session_id IS NOT NULL AND (a.oath_accepted_at IS NULL OR NOT EXISTS(SELECT 1 FROM public.tenant_proctor_sessions s WHERE s.id=a.session_id AND s.status='active')) THEN RETURN; END IF;
IF jsonb_typeof(_answers)<>'object' THEN RAISE EXCEPTION 'Invalid answers'; END IF;
merged:=a.answers;
IF now()<=a.module_started_at+make_interval(mins=>(a.paper->a.current_module->>'minutes')::integer)+interval '5 seconds' THEN
FOR q IN SELECT value FROM jsonb_array_elements(a.paper->a.current_module->'questions') LOOP
IF _answers ? (q->>'id') THEN merged:=jsonb_set(merged,ARRAY[q->>'id'],_answers->(q->>'id')); END IF;
END LOOP; END IF;
IF NOT _advance THEN UPDATE public.tenant_test_attempts SET answers=merged WHERE id=a.id; RETURN; END IF;
IF a.current_module<jsonb_array_length(a.paper)-1 THEN UPDATE public.tenant_test_attempts SET answers=merged,current_module=current_module+1,module_started_at=now() WHERE id=a.id; RETURN; END IF;
UPDATE public.tenant_test_attempts SET answers=merged WHERE id=a.id;
PERFORM public.tenant_test_grade(a.id);
END $$;

-- ---- Part 2: the proctor RPCs. Staff run their center's sessions; a student acts only on their own attempt.
-- Locks are always taken session row first, then attempts, so a force end can't interleave with a join, unlock or oath.

-- A 6-character code from main's alphabet (no I, O, 0 or 1); 256 is a multiple of 32, so every character is equally likely.
CREATE OR REPLACE FUNCTION public.tenant_proctor_code() RETURNS text LANGUAGE sql VOLATILE SET search_path=public AS $$
SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',get_byte(b,i)%32+1,1),'') FROM extensions.gen_random_bytes(6) b, generate_series(0,5) i $$;
REVOKE ALL ON FUNCTION public.tenant_proctor_code() FROM PUBLIC,anon,authenticated;

-- Staff: the eligible tests for the start dialog (tenant_practice_tests is for students only).
CREATE OR REPLACE FUNCTION public.tenant_proctor_tests(_institution uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT public.tenant_has_role(_institution,'teacher') THEN RAISE EXCEPTION 'Not allowed'; END IF;
RETURN public.tenant_eligible_tests();
END $$;

-- Staff: a lobby for one class of their center and one eligible test, titled with the test's name. Retries a taken join code.
CREATE OR REPLACE FUNCTION public.tenant_proctor_create(_institution uuid,_class uuid,_test uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
IF NOT public.tenant_has_role(_institution,'teacher') THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.tenant_classes c WHERE c.id=_class AND c.institution_id=_institution) THEN RAISE EXCEPTION 'That class isn''t in this center'; END IF;
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.tenant_eligible_tests()) e(v) WHERE e.v->>'id'=_test::text) THEN RAISE EXCEPTION 'This test is not available'; END IF;
FOR i IN 1..10 LOOP
BEGIN
INSERT INTO public.tenant_proctor_sessions(institution_id,class_id,test_id,title,join_code,unlock_code) SELECT _institution,_class,t.id,t.name,public.tenant_proctor_code(),public.tenant_proctor_code() FROM public.bluebook_tests t WHERE t.id=_test RETURNING id INTO sid;
RETURN sid;
EXCEPTION WHEN unique_violation THEN NULL;
END;
END LOOP;
RAISE EXCEPTION 'Couldn''t make a join code, try again';
END $$;

-- Staff: a new unlock code. Students who already unlocked stay unlocked; the rest need the new one.
CREATE OR REPLACE FUNCTION public.tenant_proctor_rotate_unlock(_session uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.tenant_proctor_sessions; c text:=public.tenant_proctor_code();
BEGIN
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=_session FOR UPDATE;
IF s.id IS NULL OR NOT public.tenant_has_role(s.institution_id,'teacher') THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF s.status='finished' THEN RAISE EXCEPTION 'This session has ended'; END IF;
UPDATE public.tenant_proctor_sessions SET unlock_code=c WHERE id=s.id;
RETURN c;
END $$;

-- Staff: start for everyone. Module 1 runs from the room's start, for those already in and (through join) late joiners.
CREATE OR REPLACE FUNCTION public.tenant_proctor_start(_session uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.tenant_proctor_sessions;
BEGIN
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=_session FOR UPDATE;
IF s.id IS NULL OR NOT public.tenant_has_role(s.institution_id,'teacher') THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF s.status<>'lobby' THEN RAISE EXCEPTION 'This session has already started'; END IF;
UPDATE public.tenant_proctor_sessions SET status='active',started_at=now() WHERE id=s.id;
UPDATE public.tenant_test_attempts SET module_started_at=now() WHERE session_id=s.id;
END $$;

-- Staff: force end. Grades every attempt that took the oath from its saved answers, deletes those that never did (they
-- never saw the paper), and turns review off into explanations as main does. Ended from the lobby, nobody saw the paper,
-- so every attempt goes. Safe to repeat: it grades anyone still open, and leaves alone a review mode picked after the end.
CREATE OR REPLACE FUNCTION public.tenant_proctor_finalize(_session uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.tenant_proctor_sessions; x uuid;
BEGIN
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=_session FOR UPDATE;
IF s.id IS NULL OR NOT public.tenant_has_role(s.institution_id,'teacher') THEN RAISE EXCEPTION 'Not allowed'; END IF;
UPDATE public.tenant_proctor_sessions SET status='finished',finished_at=COALESCE(finished_at,now()),review_mode=CASE WHEN s.status<>'finished' AND review_mode='off' THEN 'explanations' ELSE review_mode END WHERE id=s.id;
DELETE FROM public.tenant_test_attempts WHERE session_id=s.id AND (oath_accepted_at IS NULL OR s.started_at IS NULL);
FOR x IN SELECT id FROM public.tenant_test_attempts WHERE session_id=s.id AND status='in_progress' AND oath_accepted_at IS NOT NULL LOOP PERFORM public.tenant_test_grade(x); END LOOP;
END $$;

-- Student: join by code, in any case, if they're on the session's class list and it hasn't ended. Joining again (refresh,
-- second tab, or after the end to see results) returns the same attempt and clock. The paper is taken as tenant_test_start
-- takes it; a late joiner's Module 1 runs from the room's start.
CREATE OR REPLACE FUNCTION public.tenant_proctor_join(_institution uuid,_join_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; s public.tenant_proctor_sessions; aid uuid;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(sid::text));
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE upper(join_code)=upper(btrim(_join_code)) AND institution_id=_institution FOR SHARE;
SELECT id INTO aid FROM public.tenant_test_attempts WHERE session_id=s.id AND student_id=sid; IF aid IS NOT NULL THEN RETURN aid; END IF;
IF s.id IS NULL OR s.status='finished' THEN RAISE EXCEPTION 'This code isn''t open'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.tenant_students st WHERE st.id=sid AND st.class_id=s.class_id) THEN RAISE EXCEPTION 'You''re not on this class''s list'; END IF;
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.tenant_eligible_tests()) e(v) WHERE e.v->>'id'=s.test_id::text) THEN RAISE EXCEPTION 'This test is not available'; END IF;
INSERT INTO public.tenant_test_attempts(institution_id,student_id,test_id,test_name,paper,session_id,module_started_at) SELECT _institution,sid,t.id,t.name,public.tenant_test_paper(t.id),s.id,COALESCE(s.started_at,now()) FROM public.bluebook_tests t WHERE t.id=s.test_id RETURNING id INTO aid;
RETURN aid;
END $$;

-- Student: the unlock code read out in the room, in any case. False on a wrong code, so they can try again.
CREATE OR REPLACE FUNCTION public.tenant_proctor_unlock(_attempt uuid,_code text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; s public.tenant_proctor_sessions;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt;
IF a.id IS NULL OR a.session_id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=a.session_id FOR SHARE;
IF s.id IS NULL OR s.status='finished' THEN RAISE EXCEPTION 'This session has ended'; END IF;
IF upper(btrim(_code)) IS DISTINCT FROM upper(s.unlock_code) THEN RETURN false; END IF;
UPDATE public.tenant_test_attempts SET code_verified_at=COALESCE(code_verified_at,now()) WHERE id=a.id;
RETURN true;
END $$;

-- Student: the oath, once unlocked.
CREATE OR REPLACE FUNCTION public.tenant_proctor_oath(_attempt uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; s public.tenant_proctor_sessions;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt;
IF a.id IS NULL OR a.session_id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=a.session_id FOR SHARE;
IF s.id IS NULL OR s.status='finished' THEN RAISE EXCEPTION 'This session has ended'; END IF;
IF a.code_verified_at IS NULL THEN RAISE EXCEPTION 'Enter the unlock code first'; END IF;
UPDATE public.tenant_test_attempts SET oath_accepted_at=COALESCE(oath_accepted_at,now()) WHERE id=a.id;
END $$;

-- Student: the waiting room's view of their session and attempt. Never the unlock code.
CREATE OR REPLACE FUNCTION public.tenant_proctor_state(_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; s public.tenant_proctor_sessions;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt;
IF a.id IS NULL OR a.session_id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=a.session_id;
RETURN jsonb_build_object('title',s.title,'status',s.status,'review_mode',s.review_mode,'started_at',s.started_at,'unlocked',a.code_verified_at IS NOT NULL,'oath',a.oath_accepted_at IS NOT NULL,'attempt_status',a.status,'current_module',a.current_module);
END $$;

-- Student: focus losses (blur, tab switch) as the runner counts them; the stored count only goes up.
CREATE OR REPLACE FUNCTION public.tenant_proctor_focus(_attempt uuid,_violations integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
UPDATE public.tenant_test_attempts SET focus_violations=GREATEST(focus_violations,_violations) WHERE id=_attempt AND session_id IS NOT NULL AND student_id=public.tenant_my_student_id(institution_id);
IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed'; END IF;
END $$;

REVOKE ALL ON FUNCTION public.tenant_proctor_tests(uuid),public.tenant_proctor_create(uuid,uuid,uuid),public.tenant_proctor_rotate_unlock(uuid),public.tenant_proctor_start(uuid),public.tenant_proctor_finalize(uuid),public.tenant_proctor_join(uuid,text),public.tenant_proctor_unlock(uuid,text),public.tenant_proctor_oath(uuid),public.tenant_proctor_state(uuid),public.tenant_proctor_focus(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tenant_proctor_tests(uuid),public.tenant_proctor_create(uuid,uuid,uuid),public.tenant_proctor_rotate_unlock(uuid),public.tenant_proctor_start(uuid),public.tenant_proctor_finalize(uuid),public.tenant_proctor_join(uuid,text),public.tenant_proctor_unlock(uuid,text),public.tenant_proctor_oath(uuid),public.tenant_proctor_state(uuid),public.tenant_proctor_focus(uuid,integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
