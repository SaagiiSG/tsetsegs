CREATE OR REPLACE FUNCTION public.pick_hardest_questions(p_question_set text DEFAULT '68'::text, p_limit integer DEFAULT 22, p_min_attempts integer DEFAULT 1)
 RETURNS TABLE(question_id uuid, attempts bigint, accuracy numeric, avg_seconds numeric, difficulty_score numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH stats AS (
    SELECT q.id AS qid,
           count(sa.id) AS attempts,
           avg(CASE WHEN sa.is_correct THEN 1.0 ELSE 0.0 END) AS accuracy,
           avg(COALESCE(sa.time_spent_seconds, 0)) AS avg_seconds
    FROM public.questions q
    JOIN public.student_attempts sa ON sa.question_id = q.id
    WHERE q.question_set = p_question_set
      AND q.is_active = true
      AND q.hide_from_practice = false
    GROUP BY q.id
    HAVING count(sa.id) >= GREATEST(COALESCE(p_min_attempts, 1), 1)
  ), ranked AS (
    SELECT s.qid,
           s.attempts,
           round(s.accuracy::numeric, 4) AS accuracy,
           round(s.avg_seconds::numeric, 1) AS avg_seconds,
           round((1 - s.accuracy)::numeric, 4) AS difficulty_score,
           0 AS tier
    FROM stats s
    ORDER BY s.accuracy ASC, s.attempts DESC
    LIMIT p_limit
  ), filler AS (
    SELECT q.id AS qid, 0::bigint AS attempts, 0::numeric AS accuracy,
           0::numeric AS avg_seconds, 0::numeric AS difficulty_score, 1 AS tier
    FROM public.questions q
    WHERE q.question_set = p_question_set
      AND q.is_active = true
      AND q.hide_from_practice = false
      AND q.id NOT IN (SELECT qid FROM ranked)
    ORDER BY random()
    LIMIT GREATEST(p_limit - (SELECT count(*) FROM ranked), 0)
  )
  SELECT qid, attempts, accuracy, avg_seconds, difficulty_score
  FROM (SELECT * FROM ranked UNION ALL SELECT * FROM filler) u
  ORDER BY tier ASC, accuracy ASC, attempts DESC
  LIMIT p_limit;
$function$;