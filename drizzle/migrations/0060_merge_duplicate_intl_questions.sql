-- 14 external questions were imported into intDB twice, under different local codes: the sync
-- matched on original_cb_id, which the external bank had changed (sync-external-questions now
-- matches on ext_question_id first). For each external question with more than one active
-- flagged copy, keep the newest copy (the one the sync keeps updating), move students' portal
-- answers onto it, and switch the older copies off. Nothing is deleted: deleting a question
-- would also delete its tenant_attempts. Safe to run twice.
DO $$
DECLARE d record; n int; moved int := 0; switched int := 0;
BEGIN
  FOR d IN
    SELECT q.id AS old_id, q.question_id AS old_code, k.id AS keep_id, k.question_id AS keep_code
    FROM public.intl_questions q
    CROSS JOIN LATERAL (
      SELECT k.id, k.question_id FROM public.intl_questions k
      WHERE k.ext_question_id = q.ext_question_id AND k.ext_variant AND k.is_active
      ORDER BY k.created_at DESC, k.question_id DESC
      LIMIT 1
    ) k
    WHERE q.ext_variant AND q.is_active AND q.ext_question_id IS NOT NULL AND k.id <> q.id
  LOOP
    UPDATE public.tenant_attempts SET question_id = d.keep_id WHERE question_id = d.old_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    moved := moved + n;
    UPDATE public.intl_questions SET is_active = false WHERE id = d.old_id;
    switched := switched + 1;
    RAISE NOTICE '% switched off, % answers moved to %', d.old_code, n, d.keep_code;
  END LOOP;
  RAISE NOTICE 'Switched off % duplicate copies, moved % portal answers', switched, moved;
END $$;
