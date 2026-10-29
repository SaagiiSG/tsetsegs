// Issues short-lived signed URLs for uploaded concept videos (private bucket).
// Callers: Tsetsegs staff and center accounts (auth JWT). The main app has no concept
// videos, so student tokens are refused (Saagii, 28 Oct).

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500)

  // Same check as the concept_videos read rule (0088), run as the caller.
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  const auth = req.headers.get('Authorization') ?? ''
  let allowed = false
  if (anonKey && auth.startsWith('Bearer ')) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/is_staff_or_center_member`, {
        method: 'POST',
        headers: { apikey: anonKey, Authorization: auth, 'Content-Type': 'application/json' },
        body: '{}',
      })
      allowed = res.ok && (await res.json()) === true
    } catch (_err) { /* not allowed */ }
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
