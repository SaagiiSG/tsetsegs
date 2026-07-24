
-- 1. Column-level revoke: hide password_hash on student_accounts from clients
REVOKE SELECT (password_hash) ON public.student_accounts FROM anon, authenticated;

-- 2. Column-level revoke: hide phone_number on live_session_participants
REVOKE SELECT (phone_number) ON public.live_session_participants FROM anon, authenticated;

-- 3. Drop broad "authenticated users" storage policies for question-images (keep admin-only)
DROP POLICY IF EXISTS "Authenticated users can upload question images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update question images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete question images" ON storage.objects;

-- 4. Revoke public EXECUTE on admin-only SECURITY DEFINER helpers (they self-check role, but no need to expose)
REVOKE EXECUTE ON FUNCTION public.admin_db_size() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_top_tables() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_connection_stats() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_activity_stats() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.admin_wal_size() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_all_users() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.admin_db_size() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_top_tables() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_connection_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_activity_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_wal_size() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO service_role;

-- 5. Password hash/verify RPCs: revoke from client roles; only server functions should call them
REVOKE EXECUTE ON FUNCTION public.hash_student_password(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.verify_student_password(text, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.hash_student_password(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_student_password(text, text) TO service_role;
