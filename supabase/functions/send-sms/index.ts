import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  // 8-digit MN number → +976
  if (/^\d{8}$/.test(digits)) return '+976' + digits;
  // already has 976 prefix without +
  if (/^976\d{8}$/.test(digits)) return '+' + digits;
  // US 10-digit
  if (/^\d{10}$/.test(digits)) return '+1' + digits;
  if (/^\d{11}$/.test(digits)) return '+' + digits;
  return digits;
}

interface Body {
  to: string;
  body: string;
  kind: 'absence' | 'welcome' | 'manual';
  recipient_role: 'parent' | 'student' | 'other';
  student_id?: string;
  batch_id?: string;
  session_number?: number;
  status?: string;
  dedupe_key?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const FROM = Deno.env.get('TWILIO_FROM_NUMBER');
    const MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || (!FROM && !MESSAGING_SERVICE_SID)) {
      throw new Error('Missing TWILIO credentials');
    }

    const payload = (await req.json()) as Body;
    if (!payload?.to || !payload?.body || !payload?.kind || !payload?.recipient_role) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const to = normalizePhone(payload.to);

    // Dedupe check
    if (payload.dedupe_key) {
      const { data: existing } = await supabase
        .from('sms_logs')
        .select('id, twilio_status, twilio_sid')
        .eq('dedupe_key', payload.dedupe_key)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ deduped: true, ...existing }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Insert pending log
    const { data: log, error: logErr } = await supabase
      .from('sms_logs')
      .insert({
        kind: payload.kind,
        recipient_role: payload.recipient_role,
        to_phone: to,
        from_phone: FROM,
        body: payload.body,
        student_id: payload.student_id ?? null,
        batch_id: payload.batch_id ?? null,
        session_number: payload.session_number ?? null,
        status: payload.status ?? null,
        dedupe_key: payload.dedupe_key ?? null,
        twilio_status: 'pending',
      })
      .select('id')
      .single();
    if (logErr) throw logErr;

    // Send via Twilio gateway
    const twRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: FROM, Body: payload.body }),
    });
    const twData = await twRes.json();

    if (!twRes.ok) {
      await supabase
        .from('sms_logs')
        .update({
          twilio_status: 'failed',
          error: JSON.stringify(twData).slice(0, 500),
        })
        .eq('id', log.id);
      return new Response(
        JSON.stringify({ error: 'Twilio send failed', details: twData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await supabase
      .from('sms_logs')
      .update({
        twilio_sid: twData.sid,
        twilio_status: twData.status ?? 'sent',
      })
      .eq('id', log.id);

    return new Response(JSON.stringify({ success: true, sid: twData.sid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('send-sms error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
