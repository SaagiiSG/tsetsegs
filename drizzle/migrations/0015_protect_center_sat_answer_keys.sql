REVOKE ALL ON public.tenant_sat_attempts FROM anon,authenticated;
GRANT SELECT(id,institution_id,student_id,started_at,completed_at,status,current_module,module_started_at,break_until,answers,rw_score,math_score) ON public.tenant_sat_attempts TO authenticated;
REVOKE ALL ON public.tenant_rank_history FROM anon;
REVOKE INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.tenant_rank_history FROM authenticated;