import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function pgQuery<T = any>(admin: any, sql: string): Promise<T[] | null> {
  // Try execute via a Postgres function if one exists; otherwise fall back to
  // per-metric calls we've defined explicitly below.
  try {
    const { data, error } = await admin.rpc('admin_run_health_sql', { p_sql: sql });
    if (error) return null;
    return data as T[];
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return json(401, { error: 'Missing bearer token' });

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: 'Invalid token' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) return json(403, { error: 'Admin only' });

    // Metric queries via Postgres. We use dedicated RPCs (defined in migration).
    const results: Record<string, any> = {};

    const calls: Array<[string, string]> = [
      ['db_size', 'admin_db_size'],
      ['connections', 'admin_connection_stats'],
      ['activity', 'admin_activity_stats'],
      ['wal_size', 'admin_wal_size'],
      ['top_tables', 'admin_top_tables'],
    ];

    for (const [key, fn] of calls) {
      const { data, error } = await admin.rpc(fn);
      if (error) {
        results[key] = { error: error.message };
      } else {
        results[key] = data;
      }
    }

    return json(200, {
      generated_at: new Date().toISOString(),
      ...results,
    });
  } catch (e) {
    console.error('admin-db-health failed:', e);
    return json(500, { error: (e as Error).message });
  }
});
