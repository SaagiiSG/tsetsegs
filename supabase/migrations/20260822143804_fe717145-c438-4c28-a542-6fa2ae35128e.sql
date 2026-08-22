CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_questions_text_trgm ON public.questions USING gin (question_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_questions_qid_trgm ON public.questions USING gin (question_id gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_questions(
  p_query text,
  p_scope text DEFAULT 'student',
  p_subject text DEFAULT 'all',
  p_set text DEFAULT 'all',
  p_difficulty text DEFAULT 'all',
  p_category uuid DEFAULT NULL,
  p_limit int DEFAULT 60,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  question_id text,
  question_text text,
  question_image_url text,
  difficulty_level text,
  question_type text,
  subject text,
  question_set text,
  category_name text,
  is_active boolean,
  hide_from_practice boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text := lower(coalesce(p_scope, 'student'));
  v_q text := trim(coalesce(p_query, ''));
  v_pattern text;
BEGIN
  IF length(v_q) < 2 THEN
    RETURN;
  END IF;

  IF v_scope = 'admin' AND NOT public.has_role(auth.uid(), 'admin') THEN
    v_scope := 'teacher';
  END IF;

  IF v_scope = 'teacher' AND auth.uid() IS NULL THEN
    v_scope := 'student';
  END IF;

  v_pattern := '%' || v_q || '%';

  RETURN QUERY
  WITH matched AS (
    SELECT q.id, q.question_id, q.question_text, q.question_image_url,
           q.difficulty_level, q.question_type, q.subject, q.question_set,
           c.name AS category_name, q.is_active, q.hide_from_practice
    FROM public.questions q
    LEFT JOIN public.question_categories c ON c.id = q.category_id
    WHERE (
        q.question_text ILIKE v_pattern
        OR q.question_id ILIKE v_pattern
        OR coalesce(q.original_cb_id, '') ILIKE v_pattern
        OR coalesce(q.multiple_choice_options::text, '') ILIKE v_pattern
      )
      AND (v_scope = 'admin' OR q.is_active = true)
      AND (v_scope = 'admin' OR q.question_id NOT ILIKE 'BBK%')
      AND (v_scope <> 'student' OR q.hide_from_practice = false)
      AND (
        p_subject = 'all'
        OR (p_subject = 'math' AND coalesce(q.subject, 'math') = 'math')
        OR (p_subject = 'english' AND q.subject = 'english')
      )
      AND (
        p_set = 'all'
        OR (p_set = '68' AND q.question_set = '68')
        OR (p_set = 'cb' AND q.question_set = 'CollegeBoard')
        OR (p_set = '150_hard' AND q.question_set = 'SATMathTraining800')
        OR (p_set = 'anp' AND q.question_set = 'ANP120Aug3')
        OR (p_set = 'bbk' AND q.question_id ILIKE 'BBK%')
        OR (p_set = 'ext' AND q.question_id ILIKE 'EXT%')
        OR (p_set = 'english' AND q.subject = 'english')
      )
      AND (p_difficulty = 'all' OR q.difficulty_level = p_difficulty)
      AND (p_category IS NULL OR q.category_id = p_category)
  ), counted AS (
    SELECT count(*) AS n FROM matched
  )
  SELECT m.id, m.question_id, m.question_text, m.question_image_url,
         m.difficulty_level, m.question_type, m.subject, m.question_set,
         m.category_name, m.is_active, m.hide_from_practice, counted.n
  FROM matched m CROSS JOIN counted
  ORDER BY m.question_id
  LIMIT greatest(1, least(coalesce(p_limit, 60), 100))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_questions(text, text, text, text, text, uuid, int, int) TO anon, authenticated, service_role;