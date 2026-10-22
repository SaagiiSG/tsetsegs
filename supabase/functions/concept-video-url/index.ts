// Issues short-lived signed URLs for uploaded concept videos (private bucket).
// Callers: signed-in accounts (auth JWT) or students with a valid student token
// (x-student-token header). Storage requests from the browser don't carry the
// student token, so signed URLs are minted here with the service role instead.

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET = 'concept-videos'
const SIGNED_TTL_S = 60 * 60 * 3
const PATH_RE = /^[\w.\-/]{1,200}$/

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500)

  // Auth: either a signed-in account or a valid student token.
  let allowed = false

  const auth = req.headers.get('Authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: serviceKey, Authorization: auth },
      })
      if (res.ok) allowed = true
    } catch (_err) { /* fall through to student token */ }
  }

  if (!allowed) {
    const token = req.headers.get('x-student-token') ?? ''
    if (token.length >= 32) {
      const admin = createClient(supabaseUrl, serviceKey)
      const { data } = await admin
        .from('student_sessions')
        .select('student_account_id, student_accounts!inner(is_blocked)')
        .eq('token_hash', await sha256Hex(token))
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .limit(1)
        .maybeSingle()
      if (data && !(data as { student_accounts?: { is_blocked?: boolean } }).student_accounts?.is_blocked) {
        allowed = true
      }
    }
  }

  if (!allowed) return json({ error: 'Please sign in' }, 401)

  let path = ''
  try {
    const body = await req.json()
    path = typeof body?.path === 'string' ? body.path : ''
  } catch (_err) {
    return json({ error: 'Invalid body' }, 400)
  }
  if (!PATH_RE.test(path) || path.includes('..')) return json({ error: 'Invalid path' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL_S)
  if (error || !data?.signedUrl) return json({ error: 'Video not found' }, 404)
  return json({ signedUrl: data.signedUrl })
})
