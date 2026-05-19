import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Recipient { phone: string; name?: string }
interface Body {
  recipients: Recipient[];
  body: string;
  kind?: 'manual' | 'broadcast';
  recipient_role?: 'parent' | 'student' | 'other';
  dedupe_prefix?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: cErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (cErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const uid = claimsData.claims.sub;

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: uid, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const payload = (await req.json()) as Body;
    if (!Array.isArray(payload?.recipients) || !payload.recipients.length || !payload.body) {
      return new Response(JSON.stringify({ error: 'Missing recipients or body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const kind = payload.kind ?? 'broadcast';
    const role = payload.recipient_role ?? 'other';
    const prefix = payload.dedupe_prefix ?? `bcast:${Date.now()}`;

    const results: any[] = [];
    for (const r of payload.recipients) {
      if (!r.phone) continue;
      const personalized = payload.body.replace(/\{name\}/g, r.name ?? '');
      const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({
          to: r.phone, body: personalized, kind, recipient_role: role,
          dedupe_key: `${prefix}:${r.phone}`,
        }),
      });
      results.push({ phone: r.phone, status: resp.status, ok: resp.ok });
    }

    return new Response(JSON.stringify({ total: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('send-broadcast-sms error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
