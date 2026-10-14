CREATE TABLE public.tenant_sat_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institution_id uuid NOT NULL REFERENCES public.institution_customers(id), student_id uuid NOT NULL REFERENCES public.tenant_students(id), started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, status text NOT NULL DEFAULT 'in_progress', current_module integer NOT NULL DEFAULT 0, module_started_at timestamptz NOT NULL DEFAULT now(), break_until timestamptz, answers jsonb NOT NULL DEFAULT '{}', paper jsonb NOT NULL DEFAULT '[]', rw_score integer, math_score integer);
GRANT SELECT(id,institution_id,student_id,started_at,completed_at,status,current_module,module_started_at,break_until,answers,rw_score,math_score) ON public.tenant_sat_attempts TO authenticated;
GRANT ALL ON public.tenant_sat_attempts TO service_role;
ALTER TABLE public.tenant_sat_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students read own SAT attempts" ON public.tenant_sat_attempts FOR SELECT TO authenticated USING (student_id=public.tenant_my_student_id(institution_id));
CREATE POLICY "Center staff read SAT results" ON public.tenant_sat_attempts FOR SELECT TO authenticated USING (public.tenant_has_role(institution_id,'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX tenant_sat_student_idx ON public.tenant_sat_attempts(student_id,started_at DESC);
CREATE TABLE public.tenant_rank_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), institution_id uuid NOT NULL REFERENCES public.institution_customers(id), sprint_id uuid NOT NULL REFERENCES public.tenant_sprints(id), student_id uuid NOT NULL REFERENCES public.tenant_students(id), tier text NOT NULL DEFAULT 'unranked', next_tier text NOT NULL DEFAULT 'unranked', final_position integer NOT NULL, points bigint NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(sprint_id,student_id));
GRANT SELECT ON public.tenant_rank_history TO authenticated;
GRANT ALL ON public.tenant_rank_history TO service_role;
ALTER TABLE public.tenant_rank_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read center rank history" ON public.tenant_rank_history FOR SELECT TO authenticated USING (public.tenant_my_student_id(institution_id) IS NOT NULL OR public.tenant_has_role(institution_id,'teacher') OR public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.tenant_student_board(_institution uuid,_sprint uuid DEFAULT NULL) RETURNS TABLE(student_id uuid,name text,class_name text,points bigint,answered bigint,standing bigint,tier text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE sp public.tenant_sprints;
BEGIN
IF NOT (public.tenant_my_student_id(_institution) IS NOT NULL OR public.tenant_has_role(_institution,'teacher') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF _sprint IS NOT NULL THEN SELECT * INTO sp FROM public.tenant_sprints WHERE id=_sprint AND institution_id=_institution; IF sp.id IS NULL THEN RAISE EXCEPTION 'Unknown sprint'; END IF; END IF;
RETURN QUERY WITH scores AS (SELECT s.id,s.name,c.name class_name,count(a.id) FILTER(WHERE a.is_correct)*10 points,count(a.id) answered,COALESCE((SELECT h.next_tier FROM public.tenant_rank_history h JOIN public.tenant_sprints hs ON hs.id=h.sprint_id WHERE h.student_id=s.id AND (_sprint IS NULL OR hs.ends_on<sp.starts_on) ORDER BY hs.ends_on DESC,h.created_at DESC LIMIT 1),'unranked') tier FROM public.tenant_students s LEFT JOIN public.tenant_classes c ON c.id=s.class_id LEFT JOIN public.tenant_attempts a ON a.student_id=s.id AND a.institution_id=_institution AND (_sprint IS NULL OR (a.created_at>=sp.starts_on::timestamptz AND a.created_at<(sp.ends_on+1)::timestamptz)) WHERE s.institution_id=_institution AND s.active GROUP BY s.id,s.name,c.name) SELECT sc.id,sc.name,sc.class_name,sc.points,sc.answered,row_number() OVER(ORDER BY sc.points DESC,sc.answered DESC,sc.name,sc.id),sc.tier FROM scores sc ORDER BY sc.points DESC,sc.answered DESC,sc.name,sc.id;
END $$;
REVOKE ALL ON FUNCTION public.tenant_student_board(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.tenant_student_board(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.tenant_snapshot_ranks() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tiers text[]:=ARRAY['unranked','bronze','silver','gold','platinum','diamond','ruby']; r record; idx integer; cutoff integer;
BEGIN
IF NEW.status='finished' AND OLD.status IS DISTINCT FROM 'finished' THEN
FOR r IN SELECT b.*,row_number() OVER(PARTITION BY b.tier ORDER BY b.points DESC,b.answered DESC,b.name,b.student_id) tier_position FROM public.tenant_student_board(NEW.institution_id,NEW.id) b LOOP
idx:=COALESCE(array_position(tiers,r.tier),1); cutoff:=CASE r.tier WHEN 'unranked' THEN 20 WHEN 'bronze' THEN 20 WHEN 'silver' THEN 15 WHEN 'gold' THEN 10 WHEN 'platinum' THEN 5 ELSE 1 END;
INSERT INTO public.tenant_rank_history(institution_id,sprint_id,student_id,tier,next_tier,final_position,points) VALUES(NEW.institution_id,NEW.id,r.student_id,r.tier,CASE WHEN r.points=0 THEN tiers[GREATEST(1,idx-1)] WHEN r.tier='ruby' AND r.tier_position=1 THEN 'ruby' WHEN r.tier_position<=cutoff THEN tiers[LEAST(7,idx+1)] ELSE tiers[GREATEST(1,idx-1)] END,r.standing,r.points) ON CONFLICT(sprint_id,student_id) DO NOTHING;
END LOOP; END IF; RETURN NEW;
END $$;
CREATE TRIGGER tenant_sprint_rank_snapshot AFTER UPDATE OF status ON public.tenant_sprints FOR EACH ROW EXECUTE FUNCTION public.tenant_snapshot_ranks();