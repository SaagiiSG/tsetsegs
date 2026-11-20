// Whop calls this on membership.activated and membership.updated. It checks Whop's signature, then hands the
// membership's state to whop_sync_membership (0145), which turns solo Premium on or off.
// The student comes from the metadata whop-checkout put on the checkout. Secret: WHOP_WEBHOOK_SECRET (the ws_ value,
// as Whop shows it once); when WHOP_ENV is 'production', WHOP_WEBHOOK_SECRET_LIVE wins if set (20 Nov). verify_jwt is off for this function: Whop signs its requests instead of sending a JWT.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { unwrapWebhook } from 'npm:@whop/sdk@2.8.1/helpers'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type MembershipEvent = {
  type: string
  data: {
    id: string; status: string; current_period_end: string | null; updated_at: string; metadata?: Record<string, unknown>
    cancel_at_period_end?: boolean; billing_period_days?: number | null
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const secret = (Deno.env.get('WHOP_ENV') === 'production' && Deno.env.get('WHOP_WEBHOOK_SECRET_LIVE')) || Deno.env.get('WHOP_WEBHOOK_SECRET') || ''
  // A 500 makes Whop retry, so events sent before the secrets are set still land once they are.
  if (!supabaseUrl || !serviceKey || !secret) return new Response('Server misconfigured', { status: 500 })

  let event: MembershipEvent
  try {
    event = unwrapWebhook<MembershipEvent>(await req.text(), { headers: Object.fromEntries(req.headers), key: secret })
  } catch (_err) {
    return new Response('Bad signature', { status: 401 })
  }

  // Anything Whop can't fix by retrying gets a 200, so it stops resending.
  if (event.type !== 'membership.activated' && event.type !== 'membership.updated') return new Response('ignored')
  const m = event.data
  const user = m.metadata?.customer_id
  if (typeof user !== 'string' || !UUID_RE.test(user)) return new Response('no student on this membership')

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('whop_sync_membership', {
    _user: user, _membership: m.id, _status: m.status, _period_end: m.current_period_end, _updated_at: m.updated_at,
    // For the Billing page and the plan chip (0149).
    _cancel_at_period_end: m.cancel_at_period_end ?? null, _billing_period_days: m.billing_period_days ?? null,
  })
  if (error) {
    console.error('whop_sync_membership', m.id, error.message)
    return new Response('sync failed', { status: 500 })
  }
  console.log('whop', event.type, m.id, m.status, data)
  return new Response(data)
})
