import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Public endpoint: verifies a student password server-side.
// Returns { ok: true } on success; the client then proceeds with its
// localStorage-based session creation. Password hash never leaves the server.

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
    if (!password || (!accountId && !phone)) {
      return json({ error: 'Missing credentials' }, 400)
    }

    let query = admin.from('student_accounts').select('id, password_hash').limit(1)
    query = accountId ? query.eq('id', accountId) : query.eq('phone_number', phone!)
    const { data: acct, error: acctErr } = await query.maybeSingle()
    if (acctErr) throw acctErr
    if (!acct || !acct.password_hash) return json({ error: 'Invalid credentials' }, 401)

    const { data: ok, error: vErr } = await admin.rpc('verify_student_password', {
      stored_hash: acct.password_hash,
      input_password: password,
    })
    if (vErr) throw vErr
    if (!ok) return json({ error: 'Invalid credentials' }, 401)

    return json({ ok: true, account_id: acct.id })
  } catch (e: any) {
    console.error('student-verify-password error', e)
    return json({ error: e?.message || 'Failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
