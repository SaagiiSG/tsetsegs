-- 1. Columns
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS is_international boolean NOT NULL DEFAULT false;
ALTER TABLE public.student_accounts ADD COLUMN IF NOT EXISTS cohort text NOT NULL DEFAULT 'mn';
ALTER TABLE public.sprints ADD COLUMN IF NOT EXISTS cohort text NOT NULL DEFAULT 'mn';

DO $$ BEGIN
  ALTER TABLE public.student_accounts ADD CONSTRAINT student_accounts_cohort_check CHECK (cohort IN ('mn','intl'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.sprints ADD CONSTRAINT sprints_cohort_check CHECK (cohort IN ('mn','intl'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_student_accounts_cohort ON public.student_accounts(cohort);
CREATE INDEX IF NOT EXISTS idx_sprints_cohort_active ON public.sprints(cohort, is_active);
CREATE INDEX IF NOT EXISTS idx_batches_is_international ON public.batches(is_international);

-- 2. Cohort resolver
CREATE OR REPLACE FUNCTION public.resolve_account_cohort(_linked_student_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1
    FROM public.students s
    JOIN public.batches b ON b.id = s.batch_id
    WHERE s.id = _linked_student_id AND b.is_international = true
  ) THEN 'intl' ELSE 'mn' END;
$$;

-- 3. Sync trigger on student_accounts
CREATE OR REPLACE FUNCTION public.sync_student_account_cohort()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.cohort := public.resolve_account_cohort(NEW.linked_student_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_account_cohort ON public.student_accounts;
CREATE TRIGGER trg_sync_student_account_cohort
BEFORE INSERT OR UPDATE OF linked_student_id ON public.student_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_student_account_cohort();

-- 4. Re-sync when a student changes batch
CREATE OR REPLACE FUNCTION public.resync_cohort_for_student()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_accounts sa
  SET cohort = public.resolve_account_cohort(sa.linked_student_id)
  WHERE sa.linked_student_id = NEW.id
    AND sa.cohort <> public.resolve_account_cohort(sa.linked_student_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resync_cohort_for_student ON public.students;
CREATE TRIGGER trg_resync_cohort_for_student
AFTER UPDATE OF batch_id ON public.students
FOR EACH ROW EXECUTE FUNCTION public.resync_cohort_for_student();

-- 5. Re-sync when a batch is toggled international
CREATE OR REPLACE FUNCTION public.resync_cohort_for_batch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_accounts sa
  SET cohort = CASE WHEN NEW.is_international THEN 'intl' ELSE 'mn' END
  FROM public.students s
  WHERE s.id = sa.linked_student_id
    AND s.batch_id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_resync_cohort_for_batch ON public.batches;
CREATE TRIGGER trg_resync_cohort_for_batch
AFTER UPDATE OF is_international ON public.batches
FOR EACH ROW EXECUTE FUNCTION public.resync_cohort_for_batch();

-- 6. Cohort-aware leaderboards
CREATE OR REPLACE FUNCTION public.all_time_leaderboard(p_window text DEFAULT 'all'::text, p_limit integer DEFAULT 100, p_cohort text DEFAULT 'mn'::text)
 RETURNS TABLE(student_account_id uuid, username text, total_points bigint, highest_tier text, ruby_weeks integer, sat_math_score integer, sat_english_score integer, sat_total_score integer, sat_score_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH cutoff AS (
    SELECT CASE
      WHEN p_window = 'last30' THEN now() - interval '30 days'
      ELSE '-infinity'::timestamptz
    END AS ts
  ), totals AS (
    SELECT pt.student_account_id AS sid, SUM(pt.points)::bigint AS pts
    FROM public.point_transactions pt, cutoff c
    WHERE pt.created_at >= c.ts
    GROUP BY pt.student_account_id
  ), tiers AS (
    SELECT r.student_account_id AS sid,
           MAX(array_position(ARRAY['bronze','silver','gold','platinum','diamond','ruby'], r.current_tier)) AS tier_idx,
           COUNT(*) FILTER (WHERE r.current_tier = 'ruby')::int AS ruby_weeks
    FROM public.student_sprint_rankings r
    GROUP BY r.student_account_id
  )
  SELECT sa.id,
         COALESCE(
           NULLIF(TRIM(COALESCE(s.first_name, '') || ' ' || COALESCE(LEFT(s.last_name, 1) || '.', '')), ''),
           RIGHT(sa.phone_number, 4),
           'Anonymous'
         ) AS username,
         t.pts,
         COALESCE((ARRAY['bronze','silver','gold','platinum','diamond','ruby'])[ti.tier_idx], 'unranked') AS highest_tier,
         COALESCE(ti.ruby_weeks, 0),
         sa.sat_math_score,
         sa.sat_english_score,
         sa.sat_total_score,
         sa.sat_score_date
  FROM totals t
  JOIN public.student_accounts sa ON sa.id = t.sid AND sa.is_ghost = false
       AND sa.cohort = COALESCE(NULLIF(p_cohort, ''), 'mn')
  LEFT JOIN public.students s ON s.id = sa.linked_student_id
  LEFT JOIN tiers ti ON ti.sid = t.sid
  ORDER BY t.pts DESC
  LIMIT p_limit;
$function$;

CREATE OR REPLACE FUNCTION public.flowers_challenge_leaderboard(p_challenge_key text, p_limit integer DEFAULT 20, p_cohort text DEFAULT 'mn'::text)
 RETURNS TABLE(student_account_id uuid, display_name text, correct_count integer, duration_ms bigint, goal_met boolean, submitted_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (f.student_account_id)
         f.student_account_id,
         COALESCE(NULLIF(btrim(coalesce(st.first_name,'') || ' ' || coalesce(st.last_name,'')), ''), 'Student') AS display_name,
         f.correct_count, f.duration_ms, f.goal_met, f.submitted_at
  FROM public.flowers_challenge_attempts f
  JOIN public.student_accounts sa ON sa.id = f.student_account_id AND sa.is_ghost = false
       AND sa.cohort = COALESCE(NULLIF(p_cohort, ''), 'mn')
  LEFT JOIN public.students st ON st.id = sa.linked_student_id
  WHERE f.challenge_key = p_challenge_key AND f.submitted_at IS NOT NULL
  ORDER BY f.student_account_id, f.correct_count DESC, f.duration_ms ASC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
$function$;