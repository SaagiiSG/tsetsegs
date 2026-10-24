-- Step 2 of 2 for 0076 (live as 0077): check existing rows against the constraints it added as NOT VALID.
-- Apply only after 0076 is live, on its own. VALIDATE reads every row but takes only a light lock,
-- so students keep answering while it runs. Safe to run twice.
SET lock_timeout = '3s';
ALTER TABLE public.student_attempts VALIDATE CONSTRAINT student_attempts_one_bank;
ALTER TABLE public.student_attempts VALIDATE CONSTRAINT student_attempts_question_id_fkey;
ALTER TABLE public.student_attempts VALIDATE CONSTRAINT student_attempts_intl_question_id_fkey;
ALTER TABLE public.speed_session_items VALIDATE CONSTRAINT speed_session_items_one_bank;
ALTER TABLE public.speed_session_items VALIDATE CONSTRAINT speed_session_items_question_id_fkey;
ALTER TABLE public.speed_session_items VALIDATE CONSTRAINT speed_session_items_intl_question_id_fkey;
ALTER TABLE public.student_review_queue VALIDATE CONSTRAINT student_review_queue_one_bank;
ALTER TABLE public.student_review_queue VALIDATE CONSTRAINT student_review_queue_question_id_fkey;
ALTER TABLE public.student_review_queue VALIDATE CONSTRAINT student_review_queue_intl_question_id_fkey;
ALTER TABLE public.student_progress VALIDATE CONSTRAINT student_progress_one_bank;
ALTER TABLE public.student_progress VALIDATE CONSTRAINT student_progress_question_id_fkey;
ALTER TABLE public.student_progress VALIDATE CONSTRAINT student_progress_intl_question_id_fkey;
