import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};




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

    // Twilio SMS is unavailable — instead file a reset request for admins to approve.
    const { data: existing } = await supabase
      .from('password_reset_requests')
      .select('id')
      .eq('student_account_id', account.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      const { error: touchErr } = await supabase
        .from('password_reset_requests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (touchErr) throw touchErr;
    } else {
      const { error: reqErr } = await supabase.from('password_reset_requests').insert({
        student_account_id: account.id,
        phone_number: phone,
        status: 'pending',
      });
      if (reqErr) throw reqErr;
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
