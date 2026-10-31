// Live demo: gives each visitor a private "Northside Academy" copy with three real logins, and takes it away again.
// start/end are public (the page is signed out); cleanup is called by pg_cron and only deletes expired copies.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const DOMAIN = '@demo.flowersos.co'
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (s: string) => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))))
// Same generator as tenant-accounts (copied: functions don't import across folders).
const tempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '!7'
}
const withFreshPassword = async <T>(fn: (password: string) => Promise<{ data?: unknown; error: { message?: string } | null }>): Promise<{ password: string; data?: T }> => {
  let lastError: { message?: string } | null = null
  for (let i = 0; i < 4; i++) {
    const password = tempPassword()
    const { data, error } = await fn(password)
    if (!error) return { password, data: data as T | undefined }
    lastError = error
    if (!/weak|easy to guess|leaked|compromised/i.test(error.message ?? '')) throw new Error(error.message ?? 'Could not set password')
  }
  throw new Error(lastError?.message ?? 'Could not set password')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Deletes the logins of a copy, but only accounts that really are demo accounts. Returns false if any delete failed.
  const deleteUsers = async (ids: string[]) => {
    let ok = true
    for (const id of ids) {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (error) { if (error.status !== 404) ok = false; continue } // 404 = already gone
      if (!data.user?.email?.endsWith(DOMAIN)) continue
      const { error: dErr } = await admin.auth.admin.deleteUser(id)
      if (dErr && dErr.status !== 404) ok = false
    }
    return ok
  }

  try {
    const body = await req.json()
    const action = String(body.action ?? '')

    if (action === 'start') {
      const visitor = String(body.visitor ?? '')
      if (!/^[0-9a-f]{32}$/.test(visitor)) return json({ error: 'Invalid visitor' }, 400)
      const endToken = hex(crypto.getRandomValues(new Uint8Array(32)))
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
      const { data: made, error } = await admin.rpc('demo_create', { _visitor: visitor, _ip: ip, _end_token_hash: await sha256(endToken) })
      if (error) {
        if (error.code === '55P03' || error.message.includes('demo_busy')) return json({ error: 'demo_busy' }, 503)
        if (error.message.includes('demo_limit')) return json({ error: 'demo_limit' }, 429)
        throw error
      }
      const copyId = made.copy_id as string
      const created: string[] = []
      try {
        const logins: Record<string, { email: string; password: string }> = {}
        for (const role of ['admin', 'teacher', 'student']) {
          const email = `${role}-${copyId}${DOMAIN}`
          const r = await withFreshPassword<{ user: { id: string } | null }>((pw) =>
            admin.auth.admin.createUser({ email, password: pw, email_confirm: true, user_metadata: { demo_copy: copyId } }))
          if (!r.data?.user) throw new Error('Could not create demo login')
          created.push(r.data.user.id)
          logins[role] = { email, password: r.password }
        }
        const { error: aErr } = await admin.rpc('demo_attach_logins', { _copy: copyId, _admin: created[0], _teacher: created[1], _student: created[2] })
        if (aErr) throw aErr
        return json({ copyId, endToken, slug: made.slug, expiresAt: made.expires_at, logins })
      } catch (e) {
        // Never leave a half-made copy with live logins.
        await deleteUsers(created)
        await admin.rpc('demo_drop', { _copy: copyId })
        console.error('demo start failed', e)
        return json({ error: 'Could not start the demo.' }, 500)
      }
    }

    if (action === 'end') {
      const copyId = String(body.copyId ?? '')
      const { data: ids, error } = await admin.rpc('demo_end_users', { _copy: copyId, _end_token_hash: await sha256(String(body.endToken ?? '')) })
      if (error) return json({ error: 'Not allowed' }, 403)
      // If a delete fails the copy row stays, so cleanup retries it once it expires.
      if (!(await deleteUsers(ids ?? []))) return json({ error: 'Could not end the demo.' }, 500)
      const { error: dErr } = await admin.rpc('demo_drop', { _copy: copyId })
      if (dErr) throw dErr
      return json({ ok: true })
    }

    if (action === 'cleanup') {
      const { data: expired, error } = await admin.rpc('demo_expired')
      if (error) throw error
      let deleted = 0
      for (const c of (expired ?? []) as { copy_id: string; user_ids: string[] | null }[]) {
        if (!(await deleteUsers(c.user_ids ?? []))) continue
        const { error: dErr } = await admin.rpc('demo_drop', { _copy: c.copy_id })
        if (dErr) console.error('demo_drop failed', dErr); else deleted++
      }
      await admin.rpc('demo_cleanup_finish')
      return json({ deleted })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('demo error', e)
    return json({ error: (e as Error).message ?? 'Unexpected error' }, 500)
  }
})
