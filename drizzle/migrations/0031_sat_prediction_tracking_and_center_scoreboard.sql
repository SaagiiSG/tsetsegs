-- ===== Main portal: daily prediction snapshots =====
CREATE TABLE public.sat_prediction_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Ulaanbaatar')::date,
  sim_score int,
  predicted_low int,
  predicted_high int,
  method text NOT NULL DEFAULT 'current',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_account_id, snapshot_date)
);
GRANT SELECT ON public.sat_prediction_snapshots TO authenticated, anon;
GRANT ALL ON public.sat_prediction_snapshots TO service_role;
ALTER TABLE public.sat_prediction_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or staff read predictions" ON public.sat_prediction_snapshots FOR SELECT
  USING (student_account_id = public.request_student_id() OR public.is_platform_staff());

CREATE OR REPLACE FUNCTION public.save_sat_prediction(p_sim int, p_low int, p_high int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sid uuid := public.request_student_id();
BEGIN
  IF sid IS NULL THEN RETURN; END IF;
  IF p_sim IS NOT NULL AND (p_sim < 200 OR p_sim > 800) THEN RETURN; END IF;
  INSERT INTO public.sat_prediction_snapshots(student_account_id, sim_score, predicted_low, predicted_high)
  VALUES (sid, p_sim, nullif(greatest(0, least(800, coalesce(p_low,0))),0), nullif(greatest(0, least(800, coalesce(p_high,0))),0))
  ON CONFLICT (student_account_id, snapshot_date) DO UPDATE
    SET sim_score = EXCLUDED.sim_score, predicted_low = EXCLUDED.predicted_low, predicted_high = EXCLUDED.predicted_high;
END $$;
GRANT EXECUTE ON FUNCTION public.save_sat_prediction(int,int,int) TO anon, authenticated;

-- ===== Center portal: real SAT + prediction snapshots =====
ALTER TABLE public.tenant_students
  ADD COLUMN IF NOT EXISTS real_sat_math int,
  ADD COLUMN IF NOT EXISTS real_sat_total int,
  ADD COLUMN IF NOT EXISTS real_sat_date date;

CREATE TABLE public.tenant_sat_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.tenant_students(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  sim_score int,
  method text NOT NULL DEFAULT 'current',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, snapshot_date)
);
GRANT SELECT ON public.tenant_sat_predictions TO authenticated;
GRANT ALL ON public.tenant_sat_predictions TO service_role;
ALTER TABLE public.tenant_sat_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own, center staff or admin read" ON public.tenant_sat_predictions FOR SELECT TO authenticated
  USING (student_id = public.tenant_my_student_id(institution_id) OR public.tenant_has_role(institution_id,'teacher') OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.tenant_save_sat_prediction(_institution uuid, p_sim int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE sid uuid := public.tenant_my_student_id(_institution);
BEGIN
  IF sid IS NULL OR p_sim IS NULL OR p_sim < 200 OR p_sim > 800 THEN RETURN; END IF;
  INSERT INTO public.tenant_sat_predictions(institution_id, student_id, sim_score) VALUES (_institution, sid, p_sim)
  ON CONFLICT (student_id, snapshot_date) DO UPDATE SET sim_score = EXCLUDED.sim_score;
END $$;
GRANT EXECUTE ON FUNCTION public.tenant_save_sat_prediction(uuid,int) TO authenticated;

-- ===== Accuracy report: last saved prediction before the real SAT =====
CREATE OR REPLACE FUNCTION public.sat_prediction_accuracy()
RETURNS TABLE(portal text, student_ref uuid, real_math int, real_date date, predicted int, predicted_on date, miss int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
  SELECT 'main', a.id, a.sat_math_score, a.sat_score_date, s.sim_score, s.snapshot_date, s.sim_score - a.sat_math_score
  FROM public.student_accounts a
  JOIN LATERAL (SELECT * FROM public.sat_prediction_snapshots p WHERE p.student_account_id = a.id
     AND p.sim_score IS NOT NULL AND (a.sat_score_date IS NULL OR p.snapshot_date <= a.sat_score_date)
     ORDER BY p.snapshot_date DESC LIMIT 1) s ON true
  WHERE a.sat_math_score IS NOT NULL
  UNION ALL
  SELECT 'center', t.id, t.real_sat_math, t.real_sat_date, s.sim_score, s.snapshot_date, s.sim_score - t.real_sat_math
  FROM public.tenant_students t
  JOIN LATERAL (SELECT * FROM public.tenant_sat_predictions p WHERE p.student_id = t.id
     AND p.sim_score IS NOT NULL AND (t.real_sat_date IS NULL OR p.snapshot_date <= t.real_sat_date)
     ORDER BY p.snapshot_date DESC LIMIT 1) s ON true
  WHERE t.real_sat_math IS NOT NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.sat_prediction_accuracy() TO authenticated;

-- ===== Center scoreboard lock: server grading, repeat answers pay 0 =====
ALTER TABLE public.tenant_attempts
  ADD COLUMN IF NOT EXISTS answer text,
  ADD COLUMN IF NOT EXISTS points int;

CREATE OR REPLACE FUNCTION public.guard_tenant_attempt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE q record; prior int; solved boolean;
BEGIN
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
DROP TRIGGER IF EXISTS trg_guard_tenant_attempt ON public.tenant_attempts;
CREATE TRIGGER trg_guard_tenant_attempt BEFORE INSERT ON public.tenant_attempts
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_attempt();

CREATE OR REPLACE FUNCTION public.guard_tenant_speed_run()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n int; k int; win int;
BEGIN
  NEW.created_at := now();
  win := greatest(30, least(1800, coalesce(NEW.total_time_seconds, NEW.duration_seconds, 600))) + 60;
  NEW.duration_seconds := least(1800, greatest(0, coalesce(NEW.duration_seconds, 0)));
  NEW.total_time_seconds := least(1800, greatest(0, coalesce(NEW.total_time_seconds, 0)));
  -- Speed answers are graded individually; the run can only claim what was graded in its window.
  SELECT count(*), count(*) FILTER (WHERE is_correct AND points > 0) INTO n, k FROM public.tenant_attempts
    WHERE student_id = NEW.student_id AND created_at >= now() - make_interval(secs => win);
  NEW.total := greatest(1, least(coalesce(NEW.total, 0), n));
  NEW.correct := greatest(0, least(coalesce(NEW.correct, 0), k, NEW.total));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_tenant_speed_run ON public.tenant_speed_runs;
CREATE TRIGGER trg_guard_tenant_speed_run BEFORE INSERT ON public.tenant_speed_runs
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_speed_run();

-- Board: practice points are server-decided (legacy rows keep 10 per correct)
CREATE OR REPLACE FUNCTION public.tenant_student_board(_institution uuid, _sprint uuid DEFAULT NULL::uuid, _since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(student_id uuid, name text, class_name text, points bigint, answered bigint, standing bigint, tier text, practice_points bigint, speed_points bigint)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE sp public.tenant_sprints; _from timestamptz; _to timestamptz;
BEGIN
IF NOT (public.tenant_my_student_id(_institution) IS NOT NULL OR public.tenant_has_role(_institution,'teacher') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Not allowed'; END IF;
IF _sprint IS NOT NULL THEN
  SELECT * INTO sp FROM public.tenant_sprints WHERE id=_sprint AND institution_id=_institution;
  IF sp.id IS NULL THEN RAISE EXCEPTION 'Unknown sprint'; END IF;
  _from := sp.starts_on::timestamptz; _to := (sp.ends_on+1)::timestamptz;
ELSE _from := COALESCE(_since, '-infinity'::timestamptz); _to := 'infinity'::timestamptz; END IF;
RETURN QUERY WITH pr AS (
  SELECT a.student_id sid, COALESCE(sum(COALESCE(a.points, CASE WHEN a.is_correct THEN 10 ELSE 0 END)),0) pts, count(*) n FROM public.tenant_attempts a
  WHERE a.institution_id=_institution AND a.created_at>=_from AND a.created_at<_to GROUP BY a.student_id
), sr AS (
  SELECT r.student_id sid, COALESCE(sum(r.correct),0)*10 pts, COALESCE(sum(r.total),0) n FROM public.tenant_speed_runs r
  WHERE r.institution_id=_institution AND r.created_at>=_from AND r.created_at<_to GROUP BY r.student_id
), scores AS (
  SELECT s.id, s.name, c.name class_name, COALESCE(pr.pts,0)::bigint ppts, COALESCE(sr.pts,0)::bigint spts,
    (COALESCE(pr.n,0)+COALESCE(sr.n,0))::bigint answered,
    COALESCE((SELECT h.next_tier FROM public.tenant_rank_history h JOIN public.tenant_sprints hs ON hs.id=h.sprint_id WHERE h.student_id=s.id AND (_sprint IS NULL OR hs.ends_on<sp.starts_on) ORDER BY hs.ends_on DESC,h.created_at DESC LIMIT 1),'unranked') tier
  FROM public.tenant_students s LEFT JOIN public.tenant_classes c ON c.id=s.class_id
  LEFT JOIN pr ON pr.sid=s.id LEFT JOIN sr ON sr.sid=s.id
  WHERE s.institution_id=_institution AND s.active
)
SELECT sc.id, sc.name, sc.class_name, sc.ppts+sc.spts, sc.answered,
  row_number() OVER (ORDER BY sc.ppts+sc.spts DESC, sc.answered DESC, sc.name, sc.id), sc.tier, sc.ppts, sc.spts
FROM scores sc ORDER BY sc.ppts+sc.spts DESC, sc.answered DESC, sc.name, sc.id;
END $function$;