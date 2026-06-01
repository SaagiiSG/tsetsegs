import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

function generateOtp(): string {
  // 6-digit numeric, zero-padded — cryptographically secure
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return (arr[0] % 1_000_000).toString().padStart(6, '0');
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('976')) return '+' + digits;
  if (digits.length === 8) return '+976' + digits;
  return '+' + digits;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phone: string = (body?.phone_number ?? '').toString().trim();

    if (!phone || phone.replace(/\D/g, '').length < 8) {
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find student account
    const { data: account, error: acctErr } = await supabase
      .from('student_accounts')
      .select('id, phone_number, is_blocked')
      .eq('phone_number', phone)
      .maybeSingle();

    if (acctErr) throw acctErr;

    // Always return generic success to prevent phone enumeration —
    // but still skip Twilio call if no account/blocked.
    const genericOk = () =>
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    if (!account || account.is_blocked) {
      return genericOk();
    }

    // Rate limit: max 3 requests per phone per hour
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('password_reset_codes')
      .select('*', { count: 'exact', head: true })
      .eq('phone_number', phone)
      .gt('created_at', since);
    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: 'Too many reset requests. Try again later.' }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const code = generateOtp();
    const { data: hashResult, error: hashErr } = await supabase.rpc('hash_student_password', {
      password: code,
    });
    if (hashErr) throw hashErr;

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const { error: insertErr } = await supabase.from('password_reset_codes').insert({
      student_account_id: account.id,
      phone_number: phone,
      code_hash: hashResult as string,
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    // Send SMS via Twilio gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');

    if (!LOVABLE_API_KEY || !TWILIO_API_KEY) {
      console.error('Missing Twilio credentials');
      return new Response(JSON.stringify({ error: 'SMS service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Always send via the Messaging Service so the alphanumeric Sender ID
    // ("Tsetsegs") shows up as the sender on the student's phone. We do NOT
    // fall back to TWILIO_FROM_NUMBER — a numeric fallback would defeat the
    // branded-sender goal.
    if (!MESSAGING_SERVICE_SID) {
      console.error('TWILIO_MESSAGING_SERVICE_SID not configured');
      return new Response(
        JSON.stringify({ error: 'SMS sender (Messaging Service) not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const to = normalizePhone(phone);
    const text = `Tsetsegs нууц үг сэргээх код: ${code}. 10 минутын дотор ашиглана уу.`;

    const params = new URLSearchParams({
      To: to,
      Body: text,
      MessagingServiceSid: MESSAGING_SERVICE_SID,
    });

    const twilioRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': TWILIO_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    const twilioData = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error('Twilio error:', twilioData);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS. Please try again.' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    return genericOk();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('request-password-reset error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
