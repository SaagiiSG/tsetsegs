CREATE OR REPLACE FUNCTION public.fill_value(p_text text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text;
  num text;
  den text;
BEGIN
  IF p_text IS NULL THEN RETURN NULL; END IF;
  t := replace(replace(btrim(p_text), ',', ''), ' ', '');
  IF t = '' THEN RETURN NULL; END IF;

  IF position('/' in t) > 0 THEN
    num := split_part(t, '/', 1);
    den := split_part(t, '/', 2);
    IF num !~ '^[+-]?(\d+(\.\d+)?|\.\d+)$' OR den !~ '^[+-]?(\d+(\.\d+)?|\.\d+)$' THEN
      RETURN NULL;
    END IF;
    IF den::numeric = 0 THEN RETURN NULL; END IF;
    RETURN num::numeric / den::numeric;
  END IF;

  IF t !~ '^[+-]?(\d+(\.\d+)?|\.\d+)$' THEN RETURN NULL; END IF;
  RETURN t::numeric;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fill_answer_matches(p_submitted text, p_expected text, p_alternates text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cand text;
  s_txt text;
  c_txt text;
  s_num numeric;
  c_num numeric;
  s_raw text;
  c_raw text;
  s_limit integer;
  s_digits integer;
  places integer;
  factor numeric;
BEGIN
  IF p_submitted IS NULL OR btrim(p_submitted) = '' THEN
    RETURN false;
  END IF;

  s_txt := upper(regexp_replace(btrim(p_submitted), '\s+', '', 'g'));
  s_raw := replace(s_txt, ',', '');
  s_num := public.fill_value(p_submitted);
  s_limit := CASE WHEN left(s_raw, 1) = '-' THEN 6 ELSE 5 END;
  s_digits := length(regexp_replace(s_raw, '[^0-9]', '', 'g'));

  FOREACH cand IN ARRAY (ARRAY[COALESCE(p_expected, '')] || COALESCE(p_alternates, ARRAY[]::text[])) LOOP
    IF cand IS NULL OR btrim(cand) = '' THEN
      CONTINUE;
    END IF;

    c_txt := upper(regexp_replace(btrim(cand), '\s+', '', 'g'));
    IF s_txt = c_txt THEN
      RETURN true;
    END IF;

    c_raw := replace(c_txt, ',', '');
    c_num := public.fill_value(cand);

    IF s_num IS NULL OR c_num IS NULL THEN
      CONTINUE;
    END IF;

    -- exact value equality (covers fraction <-> decimal exact forms)
    IF s_num = c_num THEN
      RETURN true;
    END IF;

    -- Auto-generated variants: SAT answer box allows 5 chars (6 with a minus sign).
    -- Accept the student's value when it is the expected value rounded OR truncated
    -- to the precision they were able to fit, provided they used at least 3 digits.
    IF length(s_raw) <= s_limit AND s_digits >= 3 AND position('/' in s_raw) = 0 THEN
      places := COALESCE(length(split_part(s_raw, '.', 2)), 0);
      factor := power(10::numeric, places);
      IF round(c_num, places) = s_num OR trunc(c_num * factor) / factor = s_num THEN
        RETURN true;
      END IF;
    END IF;

    -- Reverse direction: the stored key itself is a rounded/truncated decimal while
    -- the student entered the exact fraction (or a longer decimal).
    IF position('/' in c_raw) = 0
       AND length(c_raw) <= (CASE WHEN left(c_raw, 1) = '-' THEN 6 ELSE 5 END)
       AND length(regexp_replace(c_raw, '[^0-9]', '', 'g')) >= 3 THEN
      places := COALESCE(length(split_part(c_raw, '.', 2)), 0);
      factor := power(10::numeric, places);
      IF round(s_num, places) = c_num OR trunc(s_num * factor) / factor = c_num THEN
        RETURN true;
      END IF;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;