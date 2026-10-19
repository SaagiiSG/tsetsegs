import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

// Resets a main-portal student's password after they prove ownership with the
// Google account they connected earlier (student_email_links).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone_number ?? '').replace(/\D/g, '');
    const password = String(body?.password ?? '');
    if (phone.length < 8 || phone.length > 15) return json({ error: 'Invalid phone number' }, 400);
    if (password.length < 8 || password.length > 72) return json({ error: 'Password must be 8–72 characters' }, 400);

    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'Google sign-in required' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user?.email) return json({ error: 'Google sign-in required' }, 401);
    const googleSub = (user.identities ?? []).find((i) => i.provider === 'google')?.id ?? null;

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: acct } = await admin.from('student_accounts').select('id, is_blocked').eq('phone_number', phone).maybeSingle();
    const { data: link } = acct ? await admin.from('student_email_links').select('email, google_sub').eq('student_account_id', acct.id).maybeSingle() : { data: null };
    const matches = !!link && (link.email?.toLowerCase() === user.email.toLowerCase() || (!!googleSub && link.google_sub === googleSub));
    try { await userClient.auth.signOut(); } catch { /* ignore */ }
    if (!acct || acct.is_blocked || !matches) return json({ error: 'This Google account is not connected to that phone number.' }, 403);

    const { data: hash, error: hErr } = await admin.rpc('hash_student_password', { password });
    if (hErr) throw hErr;
    const { error: uErr } = await admin.from('student_accounts').update({ password_hash: hash, password_set_at: new Date().toISOString() }).eq('id', acct.id);
    if (uErr) throw uErr;
    return json({ ok: true });
  } catch (e) {
    console.error('google-reset-password', e);
    return json({ error: 'Reset failed' }, 500);
  }
});
