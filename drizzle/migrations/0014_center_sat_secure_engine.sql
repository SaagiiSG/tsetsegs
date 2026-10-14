CREATE OR REPLACE FUNCTION public.tenant_sat_start(_institution uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; aid uuid; paper jsonb:='[]'; module integer; qs jsonb; needed integer;
BEGIN
sid:=public.tenant_my_student_id(_institution); IF sid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
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
CREATE OR REPLACE FUNCTION public.tenant_sat_state(_attempt uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_sat_attempts; p jsonb:='[]'; m jsonb; qs jsonb;
BEGIN
SELECT * INTO a FROM public.tenant_sat_attempts WHERE id=_attempt;
IF a.id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
FOR m IN SELECT value FROM jsonb_array_elements(a.paper) LOOP
SELECT jsonb_agg(CASE WHEN a.status='completed' THEN value ELSE value-'answer'-'alternate_answers'-'rationale' END) INTO qs FROM jsonb_array_elements(m->'questions');
p:=p||jsonb_build_array(jsonb_set(m,'{questions}',qs)); END LOOP;
RETURN to_jsonb(a)-'paper'||jsonb_build_object('paper',p);
END $$;
CREATE OR REPLACE FUNCTION public.tenant_sat_save(_attempt uuid,_answers jsonb,_advance boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.tenant_sat_attempts; merged jsonb; q jsonb; m jsonb; rw integer:=0; math integer:=0; totalrw integer:=0; totalmath integer:=0; correct boolean;
BEGIN
SELECT * INTO a FROM public.tenant_sat_attempts WHERE id=_attempt FOR UPDATE;
IF a.id IS NULL OR a.student_id IS DISTINCT FROM public.tenant_my_student_id(a.institution_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF a.status<>'in_progress' THEN RETURN; END IF;
IF a.break_until IS NOT NULL AND a.break_until>now() THEN RAISE EXCEPTION 'The break is not finished'; END IF;
IF jsonb_typeof(_answers)<>'object' THEN RAISE EXCEPTION 'Invalid answers'; END IF;
merged:=a.answers;
IF now()<=a.module_started_at+make_interval(mins=>(a.paper->a.current_module->>'minutes')::integer)+interval '5 seconds' THEN
FOR q IN SELECT value FROM jsonb_array_elements(a.paper->a.current_module->'questions') LOOP
IF _answers ? (q->>'id') THEN merged:=jsonb_set(merged,ARRAY[q->>'id'],_answers->(q->>'id')); END IF;
END LOOP; END IF;
IF NOT _advance THEN UPDATE public.tenant_sat_attempts SET answers=merged WHERE id=a.id; RETURN; END IF;
IF a.current_module<3 THEN UPDATE public.tenant_sat_attempts SET answers=merged,current_module=current_module+1,module_started_at=CASE WHEN current_module=1 THEN now()+interval '10 minutes' ELSE now() END,break_until=CASE WHEN current_module=1 THEN now()+interval '10 minutes' ELSE NULL END WHERE id=a.id; RETURN; END IF;
FOR m IN SELECT value FROM jsonb_array_elements(a.paper) LOOP
FOR q IN SELECT value FROM jsonb_array_elements(m->'questions') LOOP
correct:=public.fill_answer_matches(merged->(q->>'id')->>'value',q->>'answer',ARRAY(SELECT jsonb_array_elements_text(COALESCE(NULLIF(q->'alternate_answers','null'::jsonb),'[]'::jsonb))));
IF m->>'section'='math' THEN totalmath:=totalmath+1; IF correct THEN math:=math+1; END IF; ELSE totalrw:=totalrw+1; IF correct THEN rw:=rw+1; END IF; END IF; END LOOP; END LOOP;
UPDATE public.tenant_sat_attempts SET answers=merged,status='completed',completed_at=now(),rw_score=(round((200+rw::numeric/totalrw*600)/10)*10)::integer,math_score=(round((200+math::numeric/totalmath*600)/10)*10)::integer WHERE id=a.id;
END $$;
REVOKE ALL ON FUNCTION public.tenant_sat_start(uuid),public.tenant_sat_state(uuid),public.tenant_sat_save(uuid,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tenant_sat_start(uuid),public.tenant_sat_state(uuid),public.tenant_sat_save(uuid,jsonb,boolean) TO authenticated;