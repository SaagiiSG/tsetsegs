-- Restore EXECUTE on student auth helpers.
-- These were revoked in Phase 1 security hardening but are required by:
--   * anon: login flow (verify_student_password) — student is not authenticated yet
--   * authenticated: password change flow (hash + verify)
-- These functions are pure (take inputs, return boolean/text). They do not
-- read or write tables. Restoring EXECUTE only restores the ability to call
-- the function — the caller still needs the stored_hash to verify against,
-- which is read separately under student_accounts RLS.

GRANT EXECUTE ON FUNCTION public.verify_student_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_student_password(text) TO anon, authenticated;