import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Server-side student sign-in. Checks the password, the 90-day device lock and
// the account block, closes every other session (one active device), and
// issues a secret session token. Only a hash of the token is stored, so the
// token can't be read back from the database by anyone.

const DEVICE_LOCK_DAYS = 90
const SESSION_DAYS = 35

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const body = await req.json().catch(() => ({}))
    const accountId = typeof body.account_id === 'string' ? body.account_id : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const deviceId = typeof body.device_id === 'string' ? body.device_id.slice(0, 200) : ''
    const fingerprint = typeof body.fingerprint === 'string' ? body.fingerprint.slice(0, 500) : null
    const userAgent = typeof body.user_agent === 'string' ? body.user_agent.slice(0, 500) : null
    if (!accountId || !password || !deviceId) return json({ error: 'Missing credentials' }, 400)

    const { data: acct, error: aErr } = await admin
      .from('student_accounts')
      .select('id, is_blocked, blocked_reason, is_dev_account, registered_device_id, device_registered_at, device_fingerprint')
      .eq('id', accountId)
      .maybeSingle()
    if (aErr) throw aErr
    if (!acct) return json({ error: 'Invalid credentials' }, 401)

    const { data: cred } = await admin
      .from('student_credentials')
      .select('password_hash')
      .eq('student_account_id', accountId)
      .maybeSingle()
    if (!cred?.password_hash) return json({ error: 'Invalid credentials' }, 401)

    const { data: ok, error: vErr } = await admin.rpc('verify_student_password', {
      stored_hash: cred.password_hash,
      input_password: password,
    })
    if (vErr) throw vErr
    if (!ok) return json({ error: 'Invalid credentials' }, 401)

    if (acct.is_blocked) {
      return json({ error: `Your account has been suspended: ${acct.blocked_reason || 'Contact administrator for help.'}` }, 403)
    }

    // ---- 90-day device lock ----
    const now = new Date()
    const patch: Record<string, unknown> = { last_login: now.toISOString() }
    const isDev = acct.is_dev_account === true
    const fpMatches = !!acct.device_fingerprint && acct.device_fingerprint === fingerprint
    if (!isDev && acct.registered_device_id && acct.device_registered_at) {
      const days = Math.floor((now.getTime() - new Date(acct.device_registered_at).getTime()) / 86400000)
      const remaining = Math.max(0, DEVICE_LOCK_DAYS - days)
      const idMatches = acct.registered_device_id === deviceId
      if (!idMatches && !fpMatches && remaining > 0) {
        await admin.from('security_alerts').insert({
          student_account_id: acct.id,
          alert_type: 'unauthorized_device_attempt',
          severity: 'high',
          metadata: { attempted_device_id: deviceId, registered_device_id: acct.registered_device_id, days_remaining: remaining, fingerprint_match: false, user_agent: userAgent },
        })
        return json({ error: `This account is registered to another device. You can log in from a new device in ${remaining} day${remaining !== 1 ? 's' : ''}.` }, 403)
      }
      if (!idMatches && fpMatches) patch.registered_device_id = deviceId
      if (!idMatches && !fpMatches && remaining <= 0) {
        Object.assign(patch, { registered_device_id: deviceId, device_registered_at: now.toISOString(), device_fingerprint: fingerprint })
      }
      if (idMatches && !acct.device_fingerprint) patch.device_fingerprint = fingerprint
    } else if (!acct.registered_device_id || (isDev && acct.registered_device_id !== deviceId)) {
      Object.assign(patch, { registered_device_id: deviceId, device_registered_at: now.toISOString(), device_fingerprint: fingerprint })
    } else if (!acct.device_fingerprint) {
      patch.device_fingerprint = fingerprint
    }
    await admin.from('student_accounts').update(patch).eq('id', acct.id)

    // ---- one active session ----
    await admin.from('student_sessions').update({ is_active: false }).eq('student_account_id', acct.id).eq('is_active', true)

    const tokenBytes = new Uint8Array(32)
    crypto.getRandomValues(tokenBytes)
    const token = Array.from(tokenBytes, (b) => b.toString(16).padStart(2, '0')).join('')
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
    const expires = new Date(now.getTime() + SESSION_DAYS * 86400000)

    const { data: session, error: sErr } = await admin
      .from('student_sessions')
      .upsert({
        student_account_id: acct.id,
        device_id: deviceId,
        login_timestamp: now.toISOString(),
        expires_at: expires.toISOString(),
        is_active: true,
        user_agent: userAgent,
        token_hash: tokenHash,
      }, { onConflict: 'student_account_id,device_id' })
      .select('id')
      .single()
    if (sErr) throw sErr

    await admin.from('student_activity_logs').insert({
      student_account_id: acct.id,
      session_id: session.id,
      activity_type: 'login',
      metadata: { device_id: deviceId, user_agent: userAgent, ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null },
    })

    return json({ ok: true, session_id: session.id, token })
  } catch (e: any) {
    console.error('student-login error', e)
    return json({ error: 'Sign-in failed. Please try again.' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}
