UPDATE public.student_accounts
SET password_hash = NULL,
    password_set_at = NULL
WHERE phone_number IN ('89299355', '99493165');