
-- Added in 0036 for the public closing report, unused since it switched to
-- report_attempt_count. Student ids are public (attendance, homework), so this
-- turned any of them into an account id, which student-set-password accepts
-- for accounts that have no password yet.
DROP FUNCTION IF EXISTS public.student_account_id_for_student(uuid);
