CREATE OR REPLACE FUNCTION public.all_time_leaderboard(p_window text DEFAULT 'all', p_limit integer DEFAULT 100)
RETURNS TABLE(
  student_account_id uuid,
  username text,
  total_points bigint,
  highest_tier text,
  ruby_weeks integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
         COALESCE(ti.ruby_weeks, 0)
  FROM totals t
  JOIN public.student_accounts sa ON sa.id = t.sid AND sa.is_ghost = false
  LEFT JOIN public.students s ON s.id = sa.linked_student_id
  LEFT JOIN tiers ti ON ti.sid = t.sid
  ORDER BY t.pts DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.all_time_leaderboard(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.all_time_leaderboard(text, integer) TO anon, authenticated, service_role;