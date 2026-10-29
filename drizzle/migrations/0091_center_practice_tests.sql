-- Center practice tests use the Tsetsegs tests (bluebook_tests), but read only the International copies (Saagii, 28 Oct):
-- each test question is matched to intl_questions by question_id, and a test is offered only when every question has an
-- active copy. Center tests are Math only: Math tests (section_type 'math'), Math modules only. The functions read
-- questions only for that mapping; nothing from the Tsetsegs bank is returned. Graded on the server.
-- Keys are kept out of the attempt until it's finished: paper isn't readable and state strips them. (The intl rows
-- themselves stay readable to center members under 0088, as center practice needs; that's out of scope here.)

CREATE TABLE public.tenant_test_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institution_id uuid NOT NULL REFERENCES public.institution_customers(id), student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE, test_id uuid REFERENCES public.bluebook_tests(id) ON DELETE SET NULL, test_name text NOT NULL, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, status text NOT NULL DEFAULT 'in_progress', current_module integer NOT NULL DEFAULT 0, module_started_at timestamptz NOT NULL DEFAULT now(), answers jsonb NOT NULL DEFAULT '{}', paper jsonb NOT NULL DEFAULT '[]', math_correct integer, math_total integer, math_score integer);
CREATE UNIQUE INDEX tenant_test_open_idx ON public.tenant_test_attempts(student_id,test_id) WHERE status='in_progress';
CREATE INDEX tenant_test_student_idx ON public.tenant_test_attempts(student_id,started_at DESC);
-- Supabase's default grants would let students read paper (the answer keys), so columns are granted one by one (as 0015).
REVOKE ALL ON public.tenant_test_attempts FROM anon,authenticated;
GRANT SELECT(id,institution_id,student_id,test_id,test_name,started_at,completed_at,status,current_module,module_started_at,answers,math_correct,math_total,math_score) ON public.tenant_test_attempts TO authenticated;
GRANT ALL ON public.tenant_test_attempts TO service_role;
ALTER TABLE public.tenant_test_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own test attempts" ON public.tenant_test_attempts FOR SELECT TO authenticated USING (student_id=public.tenant_my_student_id(institution_id) OR (SELECT public.has_role(auth.uid(),'admin')));

-- The one rule for which tests a center sees (published Math tests; their Math modules that have questions, every question
-- with an active International copy). tenant_test_start checks against this same list.
CREATE OR REPLACE FUNCTION public.tenant_practice_tests(_institution uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'test_month',t.test_month,'test_year',t.test_year,'modules',s.modules,'questions',s.questions,'minutes',s.minutes,
'last_score',(SELECT a.math_score FROM public.tenant_test_attempts a WHERE a.student_id=sid AND a.test_id=t.id AND a.status='completed' ORDER BY a.completed_at DESC LIMIT 1),
'open_attempt',(SELECT a.id FROM public.tenant_test_attempts a WHERE a.student_id=sid AND a.test_id=t.id AND a.status='in_progress' LIMIT 1))
ORDER BY t.test_year DESC NULLS LAST,t.test_month DESC NULLS LAST,t.name)
FROM public.bluebook_tests t CROSS JOIN LATERAL (SELECT count(*) modules,sum(mm.n) questions,sum(mm.mins) minutes,bool_and(mm.all_intl) all_intl FROM (SELECT m.time_limit_minutes mins,count(*) n,bool_and(i.id IS NOT NULL) all_intl FROM public.bluebook_modules m JOIN public.bluebook_module_questions mq ON mq.module_id=m.id LEFT JOIN public.questions q ON q.id=mq.question_id LEFT JOIN public.intl_questions i ON i.question_id=q.question_id AND i.is_active WHERE m.test_id=t.id AND m.section='math' GROUP BY m.id,m.time_limit_minutes) mm) s
WHERE t.is_published AND t.section_type='math' AND s.modules>0 AND s.all_intl),'[]'::jsonb);
END $$;

-- Paper: the test's Math modules that have questions (as the list counts them) in module_number order, questions in order_index order.
CREATE OR REPLACE FUNCTION public.tenant_test_start(_institution uuid,_test uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; aid uuid; p jsonb;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
PERFORM pg_advisory_xact_lock(hashtext(sid::text));
SELECT id INTO aid FROM public.tenant_test_attempts WHERE student_id=sid AND test_id=_test AND status='in_progress'; IF aid IS NOT NULL THEN RETURN aid; END IF;
IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.tenant_practice_tests(_institution)) e(v) WHERE e.v->>'id'=_test::text) THEN RAISE EXCEPTION 'This test is not available'; END IF;
SELECT jsonb_agg(jsonb_build_object('number',m.module_number,'minutes',m.time_limit_minutes,'questions',
(SELECT jsonb_agg(to_jsonb(i) ORDER BY mq.order_index,mq.id) FROM public.bluebook_module_questions mq JOIN public.questions q ON q.id=mq.question_id CROSS JOIN LATERAL (SELECT x.id,x.question_id,x.question_text,x.passage_text,x.question_image_url,x.question_image_url_2,x.multiple_choice_options,x.choice_images,x.answer,x.alternate_answers FROM public.intl_questions x WHERE x.question_id=q.question_id AND x.is_active) i WHERE mq.module_id=m.id))
ORDER BY m.module_number) INTO p
FROM public.bluebook_modules m WHERE m.test_id=_test AND m.section='math' AND EXISTS(SELECT 1 FROM public.bluebook_module_questions y WHERE y.module_id=m.id);
INSERT INTO public.tenant_test_attempts(institution_id,student_id,test_id,test_name,paper) SELECT _institution,sid,t.id,t.name,p FROM public.bluebook_tests t WHERE t.id=_test RETURNING id INTO aid; RETURN aid;
END $$;

-- Keys and rationale only after the test is finished; rationale is read live so later fixes show up in review.
CREATE OR REPLACE FUNCTION public.tenant_test_state(_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; p jsonb:='[]'; m jsonb; qs jsonb;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt;
IF a.id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
FOR m IN SELECT value FROM jsonb_array_elements(a.paper) LOOP
SELECT jsonb_agg(CASE WHEN a.status='completed' THEN e.value||jsonb_build_object('rationale',(SELECT x.rationale FROM public.intl_questions x WHERE x.id=(e.value->>'id')::uuid)) ELSE e.value-'answer'-'alternate_answers'-'rationale' END ORDER BY e.ord) INTO qs FROM jsonb_array_elements(m->'questions') WITH ORDINALITY e(value,ord);
p:=p||jsonb_build_array(jsonb_set(m,'{questions}',qs)); END LOOP;
RETURN to_jsonb(a)-'paper'||jsonb_build_object('paper',p);
END $$;

-- As tenant_sat_save (0014) without the break: late answers are dropped, but advancing and grading still happen.
-- _module is the module the caller is on; a stale call (double click, timer racing a click, retry) does nothing instead of skipping a module.
CREATE OR REPLACE FUNCTION public.tenant_test_save(_attempt uuid,_answers jsonb,_advance boolean DEFAULT false,_module integer DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_test_attempts; merged jsonb; q jsonb; good integer:=0; total integer:=0;
BEGIN
SELECT * INTO a FROM public.tenant_test_attempts WHERE id=_attempt FOR UPDATE;
IF a.id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF a.status<>'in_progress' OR (_module IS NOT NULL AND _module<>a.current_module) THEN RETURN; END IF;
IF jsonb_typeof(_answers)<>'object' THEN RAISE EXCEPTION 'Invalid answers'; END IF;
merged:=a.answers;
IF now()<=a.module_started_at+make_interval(mins=>(a.paper->a.current_module->>'minutes')::integer)+interval '5 seconds' THEN
FOR q IN SELECT value FROM jsonb_array_elements(a.paper->a.current_module->'questions') LOOP
IF _answers ? (q->>'id') THEN merged:=jsonb_set(merged,ARRAY[q->>'id'],_answers->(q->>'id')); END IF;
END LOOP; END IF;
IF NOT _advance THEN UPDATE public.tenant_test_attempts SET answers=merged WHERE id=a.id; RETURN; END IF;
IF a.current_module<jsonb_array_length(a.paper)-1 THEN UPDATE public.tenant_test_attempts SET answers=merged,current_module=current_module+1,module_started_at=now() WHERE id=a.id; RETURN; END IF;
FOR q IN SELECT e.v FROM jsonb_array_elements(a.paper) m(v) CROSS JOIN LATERAL jsonb_array_elements(m.v->'questions') e(v) LOOP
total:=total+1;
IF public.fill_answer_matches(merged->(q->>'id')->>'value',q->>'answer',ARRAY(SELECT jsonb_array_elements_text(COALESCE(NULLIF(q->'alternate_answers','null'::jsonb),'[]'::jsonb)))) THEN good:=good+1; END IF;
END LOOP;
UPDATE public.tenant_test_attempts SET answers=merged,status='completed',completed_at=now(),math_correct=good,math_total=total,math_score=(round((200+good::numeric/total*600)/10)*10)::integer WHERE id=a.id;
END $$;

REVOKE ALL ON FUNCTION public.tenant_practice_tests(uuid),public.tenant_test_start(uuid,uuid),public.tenant_test_state(uuid),public.tenant_test_save(uuid,jsonb,boolean,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tenant_practice_tests(uuid),public.tenant_test_start(uuid,uuid),public.tenant_test_state(uuid),public.tenant_test_save(uuid,jsonb,boolean,integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
