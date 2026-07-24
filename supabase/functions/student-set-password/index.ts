import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Public endpoint: hashes and stores a student's password server-side.
// The underlying hash/verify RPCs are revoked from anon/authenticated;
// only service_role (this function) can call them.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const body = await req.json().catch(() => ({}))
    const accountId: string | undefined = body.account_id
    const phone: string | undefined = body.phone_number
    const password: string | undefined = body.password
    const currentPassword: string | undefined = body.current_password

    if (!password || password.length < 8) {
      return json({ error: 'Password too short' }, 400)
    }
    if (!accountId && !phone) {
      return json({ error: 'account_id or phone_number required' }, 400)
    }

    // Fetch target account
    let query = admin.from('student_accounts').select('id, phone_number, password_hash').limit(1)
    query = accountId ? query.eq('id', accountId) : query.eq('phone_number', phone!)
    const { data: acct, error: acctErr } = await query.maybeSingle()
    if (acctErr) throw acctErr
    if (!acct) return json({ error: 'Account not found' }, 404)

    // If a password already exists, require current password (change-password flow)
    if (acct.password_hash) {
      if (!currentPassword) return json({ error: 'Current password required' }, 400)
      const { data: ok, error: vErr } = await admin.rpc('verify_student_password', {
        stored_hash: acct.password_hash,
        input_password: currentPassword,
      })
      if (vErr) throw vErr
      if (!ok) return json({ error: 'Current password is incorrect' }, 401)
    }

    const { data: hash, error: hErr } = await admin.rpc('hash_student_password', { password })
    if (hErr) throw hErr

    const { error: uErr } = await admin
      .from('student_accounts')
      .update({ password_hash: hash, password_set_at: new Date().toISOString() })
      .eq('id', acct.id)
    if (uErr) throw uErr

    return json({ ok: true })
  } catch (e: any) {
    console.error('student-set-password error', e)
    return json({ error: e?.message || 'Failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
