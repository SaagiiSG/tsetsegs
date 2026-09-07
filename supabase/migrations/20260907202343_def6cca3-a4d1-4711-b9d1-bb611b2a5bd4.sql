ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS sat_math_score integer,
  ADD COLUMN IF NOT EXISTS sat_english_score integer,
  ADD COLUMN IF NOT EXISTS sat_total_score integer,
  ADD COLUMN IF NOT EXISTS sat_score_date date;

ALTER TABLE public.student_accounts
  ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE public.student_accounts
  ADD CONSTRAINT sat_math_score_range CHECK (sat_math_score IS NULL OR (sat_math_score >= 200 AND sat_math_score <= 800)),
  ADD CONSTRAINT sat_english_score_range CHECK (sat_english_score IS NULL OR (sat_english_score >= 200 AND sat_english_score <= 800)),
  ADD CONSTRAINT sat_total_score_range CHECK (sat_total_score IS NULL OR (sat_total_score >= 400 AND sat_total_score <= 1600));

CREATE OR REPLACE FUNCTION public.update_student_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_student_accounts_updated_at ON public.student_accounts;
CREATE TRIGGER trg_student_accounts_updated_at
  BEFORE UPDATE ON public.student_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_accounts_updated_at();

DROP FUNCTION IF EXISTS public.all_time_leaderboard(text, integer);

CREATE OR REPLACE FUNCTION public.all_time_leaderboard(p_window text DEFAULT 'all'::text, p_limit integer DEFAULT 100)
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
  LEFT JOIN public.students s ON s.id = sa.linked_student_id
  LEFT JOIN tiers ti ON ti.sid = t.sid
  ORDER BY t.pts DESC
  LIMIT p_limit;
$function$;