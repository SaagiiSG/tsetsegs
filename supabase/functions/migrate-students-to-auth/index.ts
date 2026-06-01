// Phase 2 of student auth migration.
// One-shot, idempotent backfill: for each public.student_accounts row that
// has no auth_user_id, create a corresponding auth.users entry using phone
// (E.164 +976...) and import the existing bcrypt password_hash so the
// student's password keeps working unchanged.
//
// Admin-only. Caller must have a valid Supabase session with the 'admin' role.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, '');
  if (!digits) return null;
  // Strip leading country code if duplicated
  if (digits.length > 8 && digits.startsWith('976')) {
    digits = digits.slice(3);
  }
  if (digits.length !== 8) return null;
  return `+976${digits}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // --- AuthZ: caller must be an admin ---
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'admin',
    });
    if (roleErr || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Optional body params ---
    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body?.dry_run === true;
    const limit: number = typeof body?.limit === 'number' ? body.limit : 10000;

    // --- Fetch unmigrated accounts ---
    const { data: accounts, error: fetchErr } = await admin
      .from('student_accounts')
      .select('id, phone_number, password_hash, auth_user_id')
      .is('auth_user_id', null)
      .limit(limit);

    if (fetchErr) throw fetchErr;

    const stats = {
      considered: accounts?.length ?? 0,
      migrated: 0,
      skipped_no_password: 0,
      skipped_bad_phone: 0,
      relinked_existing: 0,
      errors: [] as Array<{ id: string; phone: string; error: string }>,
      dry_run: dryRun,
    };

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify(stats), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const acc of accounts) {
      const e164 = normalizePhone(acc.phone_number);
      if (!e164) {
        stats.skipped_bad_phone += 1;
        stats.errors.push({ id: acc.id, phone: acc.phone_number, error: 'cannot normalize phone' });
        continue;
      }
      if (!acc.password_hash) {
        stats.skipped_no_password += 1;
        continue;
      }

      if (dryRun) {
        stats.migrated += 1;
        continue;
      }

      // Try to create the auth user with imported bcrypt hash
      // @ts-ignore — password_hash is supported by admin.createUser in supabase-js v2.39+
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        phone: e164,
        password_hash: acc.password_hash,
        phone_confirm: true,
        user_metadata: { migrated_from_student_account: acc.id },
      });

      let authUserId: string | null = created?.user?.id ?? null;

      // If the phone is already in auth (e.g. partial previous run), look it up and relink.
      if (createErr && /already|duplicate|exists/i.test(createErr.message)) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const existing = list?.users.find((u) => u.phone === e164.replace('+', ''))
                      ?? list?.users.find((u) => u.phone === e164);
        if (existing) {
          authUserId = existing.id;
          stats.relinked_existing += 1;
        } else {
          stats.errors.push({ id: acc.id, phone: e164, error: `create failed: ${createErr.message}` });
          continue;
        }
      } else if (createErr) {
        stats.errors.push({ id: acc.id, phone: e164, error: createErr.message });
        continue;
      }

      if (!authUserId) {
        stats.errors.push({ id: acc.id, phone: e164, error: 'no auth user id returned' });
        continue;
      }

      const { error: linkErr } = await admin
        .from('student_accounts')
        .update({ auth_user_id: authUserId })
        .eq('id', acc.id);

      if (linkErr) {
        stats.errors.push({ id: acc.id, phone: e164, error: `link failed: ${linkErr.message}` });
        continue;
      }

      stats.migrated += 1;
    }

    return new Response(JSON.stringify(stats), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('migrate-students-to-auth error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
