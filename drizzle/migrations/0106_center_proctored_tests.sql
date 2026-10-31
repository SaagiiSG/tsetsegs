-- Center proctored tests (Saagii, 30 Oct): a teacher runs a practice test for a class like the main site's proctor
-- (join code, unlock code, oath, start for everyone, review mode, force end). A proctored sitting is an ordinary
-- tenant_test_attempts row with a session_id. Students get no paper until the session is active and they've taken the
-- oath, and no keys while review is off. A student may still self-start the same test; the two never collide.

CREATE TABLE public.tenant_proctor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id),
  class_id uuid NOT NULL REFERENCES public.tenant_classes(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.bluebook_tests(id),
  title text NOT NULL,
  join_code text NOT NULL UNIQUE,
  unlock_code text NOT NULL,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','active','finished')),
  review_mode text NOT NULL DEFAULT 'off' CHECK (review_mode IN ('off','correctness','explanations')),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
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

-- As 0091; the open attempt is the self-started one.
CREATE OR REPLACE FUNCTION public.tenant_practice_tests(_institution uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'test_month',t.test_month,'test_year',t.test_year,'modules',s.modules,'questions',s.questions,'minutes',s.minutes,
'last_score',(SELECT a.math_score FROM public.tenant_test_attempts a WHERE a.student_id=sid AND a.test_id=t.id AND a.status='completed' ORDER BY a.completed_at DESC LIMIT 1),
'open_attempt',(SELECT a.id FROM public.tenant_test_attempts a WHERE a.student_id=sid AND a.test_id=t.id AND a.status='in_progress' AND a.session_id IS NULL LIMIT 1))
ORDER BY t.test_year DESC NULLS LAST,t.test_month DESC NULLS LAST,t.name)
FROM public.bluebook_tests t CROSS JOIN LATERAL (SELECT count(*) modules,sum(mm.n) questions,sum(mm.mins) minutes,bool_and(mm.all_intl) all_intl FROM (SELECT m.time_limit_minutes mins,count(*) n,bool_and(i.id IS NOT NULL) all_intl FROM public.bluebook_modules m JOIN public.bluebook_module_questions mq ON mq.module_id=m.id LEFT JOIN public.questions q ON q.id=mq.question_id LEFT JOIN public.intl_questions i ON i.question_id=q.question_id AND i.is_active WHERE m.test_id=t.id AND m.section='math' GROUP BY m.id,m.time_limit_minutes) mm) s
WHERE t.is_published AND t.section_type='math' AND s.modules>0 AND s.all_intl),'[]'::jsonb);
END $$;

-- As 0091; resumes only a self-started attempt.
CREATE OR REPLACE FUNCTION public.tenant_test_start(_institution uuid,_test uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; aid uuid; p jsonb;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(sid::text));
SELECT id INTO aid FROM public.tenant_test_attempts WHERE student_id=sid AND test_id=_test AND status='in_progress' AND session_id IS NULL; IF aid IS NOT NULL THEN RETURN aid; END IF;
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.tenant_practice_tests(_institution)) e(v) WHERE e.v->>'id'=_test::text) THEN RAISE EXCEPTION 'This test is not available'; END IF;
SELECT jsonb_agg(jsonb_build_object('number',m.module_number,'minutes',m.time_limit_minutes,'questions',
(SELECT jsonb_agg(to_jsonb(i) ORDER BY mq.order_index,mq.id) FROM public.bluebook_module_questions mq JOIN public.questions q ON q.id=mq.question_id CROSS JOIN LATERAL (SELECT x.id,x.question_id,x.question_text,x.passage_text,x.question_image_url,x.question_image_url_2,x.multiple_choice_options,x.choice_images,x.answer,x.alternate_answers FROM public.intl_questions x WHERE x.question_id=q.question_id AND x.is_active) i WHERE mq.module_id=m.id))
ORDER BY m.module_number) INTO p
FROM public.bluebook_modules m WHERE m.test_id=_test AND m.section='math' AND EXISTS(SELECT 1 FROM public.bluebook_module_questions y WHERE y.module_id=m.id);
INSERT INTO public.tenant_test_attempts(institution_id,student_id,test_id,test_name,paper) SELECT _institution,sid,t.id,t.name,p FROM public.bluebook_tests t WHERE t.id=_test RETURNING id INTO aid; RETURN aid;
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
-- once finished, review mode decides: off = no keys, correctness = a correct flag per question, explanations = as 0091.
CREATE OR REPLACE FUNCTION public.tenant_test_state(_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; s public.tenant_proctor_sessions; p jsonb:='[]'; m jsonb; qs jsonb;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt;
IF a.id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
SELECT * INTO s FROM public.tenant_proctor_sessions WHERE id=a.session_id;
IF s.id IS NULL OR a.status='completed' OR (s.status IN ('active','finished') AND a.oath_accepted_at IS NOT NULL) THEN
FOR m IN SELECT value FROM jsonb_array_elements(a.paper) LOOP
SELECT jsonb_agg(CASE WHEN a.status='completed' AND (s.id IS NULL OR s.review_mode='explanations') THEN e.value||jsonb_build_object('rationale',(SELECT x.rationale FROM public.intl_questions x WHERE x.id=(e.value->>'id')::uuid))
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

NOTIFY pgrst, 'reload schema';
