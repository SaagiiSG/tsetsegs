
-- Health snapshot functions. Callers must be admin.

CREATE OR REPLACE FUNCTION public.admin_db_size()
RETURNS TABLE(bytes bigint, pretty text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY SELECT pg_database_size(current_database())::bigint,
                      pg_size_pretty(pg_database_size(current_database()));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_connection_stats()
RETURNS TABLE(active integer, max_connections integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max int;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT setting::int INTO v_max FROM pg_settings WHERE name = 'max_connections';
  RETURN QUERY SELECT (SELECT count(*)::int FROM pg_stat_activity), v_max;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_activity_stats()
RETURNS TABLE(deadlocks bigint, rolled_back bigint, committed bigint, temp_files bigint, temp_bytes bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT d.deadlocks, d.xact_rollback, d.xact_commit, d.temp_files, d.temp_bytes
    FROM pg_stat_database d
    WHERE d.datname = current_database();
END; $$;

CREATE OR REPLACE FUNCTION public.admin_wal_size()
RETURNS TABLE(bytes bigint, pretty text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bytes bigint := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  BEGIN
    SELECT COALESCE(sum(size), 0) INTO v_bytes FROM pg_ls_waldir();
  EXCEPTION WHEN OTHERS THEN
    v_bytes := 0;
  END;
  RETURN QUERY SELECT v_bytes, pg_size_pretty(v_bytes);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_top_tables()
RETURNS TABLE(table_name text, total_bytes bigint, total_pretty text, row_estimate bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
    SELECT c.relname::text,
           pg_total_relation_size(c.oid)::bigint,
           pg_size_pretty(pg_total_relation_size(c.oid)),
           c.reltuples::bigint
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 15;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_db_size FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_connection_stats FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_activity_stats FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_wal_size FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_top_tables FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_db_size TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_connection_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_activity_stats TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_wal_size TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_top_tables TO service_role;
