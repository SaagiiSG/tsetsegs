-- All English is free for every student (Saagii, 12 Nov 2026): a free solo user reads every active English question,
-- not only the 100 in solo_free_slice. Math stays limited to the slice's 30 CB questions and the free test's copies, so
-- the 68 and 150 sets stay closed to free users. Only the International bank's read rule changes: 0127's, with
-- "OR lower(subject) = 'english'" on the free solo line (subject NULL is Math, as everywhere else). The slice keeps its
-- 100 English rows; they're harmless. Safe to run twice.
SET lock_timeout = '3s';

DROP POLICY IF EXISTS "Staff and centers view active intl questions" ON public.intl_questions;
CREATE POLICY "Staff and centers view active intl questions" ON public.intl_questions FOR SELECT TO authenticated
  USING (is_active AND (SELECT public.is_staff_or_center_member())
    AND ((SELECT NOT public.is_demo_user()) OR id IN (SELECT item_id FROM public.demo_slice WHERE kind = 'question')) -- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.
    AND ((SELECT NOT public.is_free_solo_user()) OR lower(subject) = 'english' OR id IN (SELECT item_id FROM public.solo_free_slice WHERE kind = 'question') OR id IN (SELECT public.solo_free_test_questions()))); -- Free solo check (solo plan, 10 Nov; all English free 12 Nov): keep this line when rewriting.
