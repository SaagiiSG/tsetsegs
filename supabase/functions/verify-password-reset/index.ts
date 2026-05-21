import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PASSWORD_MIN_LEN = 8;

function passwordOk(p: string): boolean {
  return (
    p.length >= PASSWORD_MIN_LEN &&
    /[A-Z]/.test(p) &&
    /[a-z]/.test(p) &&
    /[0-9]/.test(p) &&
    /[!@#$%^&*(),.?":{}|<>]/.test(p)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const phone: string = (body?.phone_number ?? '').toString().trim();
    const code: string = (body?.code ?? '').toString().trim();
    const newPassword: string = (body?.new_password ?? '').toString();

    if (!phone || !code || !newPassword) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid code format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!passwordOk(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'Password does not meet complexity requirements' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: account } = await supabase
      .from('student_accounts')
      .select('id, is_blocked')
      .eq('phone_number', phone)
      .maybeSingle();

    if (!account || account.is_blocked) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get most recent unconsumed code for this account
    const { data: resetRow, error: rowErr } = await supabase
      .from('password_reset_codes')
      .select('*')
      .eq('student_account_id', account.id)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rowErr) throw rowErr;
    if (!resetRow) {
      return new Response(JSON.stringify({ error: 'No active reset code. Request a new one.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(resetRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: 'Code expired. Request a new one.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check attempt count
    if ((resetRow.attempts ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Request a new code.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify code via existing crypt function
    const { data: isValid, error: verifyErr } = await supabase.rpc('verify_student_password', {
      stored_hash: resetRow.code_hash,
      input_password: code,
    });
    if (verifyErr) throw verifyErr;

    if (!isValid) {
      await supabase
        .from('password_reset_codes')
        .update({ attempts: (resetRow.attempts ?? 0) + 1 })
        .eq('id', resetRow.id);

      return new Response(JSON.stringify({ error: 'Incorrect code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash new password
    const { data: newHash, error: hashErr } = await supabase.rpc('hash_student_password', {
      password: newPassword,
    });
    if (hashErr) throw hashErr;

    // Update account: new password + clear device lock so they can sign in fresh
    const { error: updErr } = await supabase
      .from('student_accounts')
      .update({
        password_hash: newHash as string,
        password_set_at: new Date().toISOString(),
        registered_device_id: null,
        device_registered_at: null,
        device_fingerprint: null,
      })
      .eq('id', account.id);
    if (updErr) throw updErr;

    // Mark code consumed; deactivate any other active reset codes
    await supabase
      .from('password_reset_codes')
      .update({ consumed_at: new Date().toISOString() })
      .eq('student_account_id', account.id)
      .is('consumed_at', null);

    // Also kill any active sessions so the old device must re-login
    await supabase
      .from('student_sessions')
      .update({ is_active: false })
      .eq('student_account_id', account.id)
      .eq('is_active', true);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('verify-password-reset error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
