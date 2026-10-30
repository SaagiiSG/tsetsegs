-- Center students see every International variant in practice, with or without an explanation (Saagii, 30 Oct: the
-- variants are all uploaded, 1,426 of them, and center students should see all of them regardless of explanations).
-- 494 active variants were still marked hidden from practice. Bluebook copies (BBK, not variants) stay hidden.
-- Undo: flowersos/undo-0101.sql (kept outside the repo).
UPDATE public.intl_questions SET hide_from_practice = false WHERE ext_variant AND is_active AND hide_from_practice;
