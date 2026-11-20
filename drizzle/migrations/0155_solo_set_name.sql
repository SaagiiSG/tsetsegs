-- Solo students set their own name (Saagii, 20 Nov 2026): email sign-up no longer asks for one, so onboarding's first
-- step does. The board name is solo_join's (0126): first name + last initial ("Saran Ochir Sergelen" -> "Saran S."),
-- so strangers never see a full name; the full name stays in solo_students. Returns the board name. Safe to run twice.
SET lock_timeout = '3s';
CREATE OR REPLACE FUNCTION public.solo_set_name(_name text) RETURNS text
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
        -- Any whitespace: tabs, newlines, the non-breaking space and the other Unicode spaces.
        ws text := '[\s  -​ 　﻿]'; edges text := '^' || ws || '+|' || ws || '+$';
        -- Trimmed, and every run of spaces inside made one.
        full_name text := left(regexp_replace(regexp_replace(coalesce(_name, ''), edges, '', 'g'), ws || '+', ' ', 'g'), 80); w text[]; board text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  IF full_name = '' THEN RAISE EXCEPTION 'Enter your name'; END IF;
  w := regexp_split_to_array(full_name, ws || '+');
  board := left(w[1] || CASE WHEN array_length(w, 1) >= 2 THEN ' ' || upper(left(w[array_length(w, 1)], 1)) || '.' ELSE '' END, 100);
  UPDATE public.tenant_students SET name = board WHERE institution_id = public.solo_institution_id() AND user_id = uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'No solo account'; END IF;
  UPDATE public.solo_students SET name = full_name WHERE user_id = uid;
  RETURN board;
END $$;
REVOKE ALL ON FUNCTION public.solo_set_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.solo_set_name(text) TO authenticated;
