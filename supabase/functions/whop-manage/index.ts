// Cancels the signed-in solo student's Premium at the end of its period, or undoes that, from flowersos's own Billing
// page (Saagii, 20 Nov: cancelling shouldn't send people to Whop). The membership is the one whop_sync_membership saved
// on the student's own row, so nobody can touch another student's. Whop's answer goes through whop_sync_membership
// (0149) like a webhook, so Billing updates at once; the webhook that follows is skipped as stale.
// Secrets as whop-checkout: WHOP_API_KEY (WHOP_API_KEY_LIVE wins when WHOP_ENV is 'production').

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

type Membership = { id: string; status: string; current_period_end: string | null; updated_at: string; cancel_at_period_end?: boolean; billing_period_days?: number | null }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const production = Deno.env.get('WHOP_ENV') === 'production'
  const apiKey = (production && Deno.env.get('WHOP_API_KEY_LIVE')) || Deno.env.get('WHOP_API_KEY') || ''
  if (!supabaseUrl || !serviceKey || !apiKey) return json({ error: 'Server misconfigured' }, 500)

  const admin = createClient(supabaseUrl, serviceKey)
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: { user } } = await admin.auth.getUser(jwt)
  if (!user) return json({ error: 'Please sign in' }, 401)

  let action = ''
  try { action = (await req.json())?.action } catch (_err) { /* checked below */ }
  if (action !== 'cancel' && action !== 'resume') return json({ error: 'Unknown action' }, 400)

  const { data: solo } = await admin.from('solo_students').select('whop_membership_id').eq('user_id', user.id).maybeSingle()
  const membership = solo?.whop_membership_id
  if (!membership) return json({ error: "There's no subscription to change." }, 404)

  const base = `https://${production ? '' : 'sandbox-'}api.whop.com/api/v1/memberships/${membership}`
  const res = await fetch(action === 'cancel' ? `${base}/cancel` : base, {
    method: action === 'cancel' ? 'POST' : 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    // Cancel at the period end: the Terms keep paid features (or the trial) until then, with no further charge.
    body: JSON.stringify(action === 'cancel' ? { cancel_at_period_end: true, reason: 'Canceled in flowersos' } : { cancel_at_period_end: false }),
  })
  if (!res.ok) {
    console.error('whop', action, membership, res.status, await res.text())
    return json({ error: "That didn't go through. Please try again." }, 502)
  }
  const m = (await res.json()) as Membership
  const { error } = await admin.rpc('whop_sync_membership', {
    _user: user.id, _membership: m.id, _status: m.status, _period_end: m.current_period_end, _updated_at: m.updated_at,
    _cancel_at_period_end: m.cancel_at_period_end ?? null, _billing_period_days: m.billing_period_days ?? null,
  })
  // Whop has already made the change; the webhook will save it if this didn't.
  if (error) console.error('whop_sync_membership', m.id, error.message)
  return json({ ok: true, cancel_at_period_end: m.cancel_at_period_end ?? null })
})
