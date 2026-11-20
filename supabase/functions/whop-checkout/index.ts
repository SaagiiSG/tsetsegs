// Starts a Whop checkout for the signed-in solo student and returns its configuration id for the embedded card form.
// Made here, not in the browser, so the student id in the metadata (what whop-webhook keys Premium on) and the
// early-bird trial can't be picked by the buyer. Early birds (0143) get the 14-day plans, everyone else 7 days.
// Secrets: WHOP_API_KEY, WHOP_ENV ('production' or anything else for sandbox), and WHOP_PLAN_IDS, a JSON object
// {"monthly","yearly","monthly_early","yearly_early"} of plan_ ids from the same environment. In production the
// WHOP_API_KEY_LIVE and WHOP_PLAN_IDS_LIVE twins win when set (Saagii, 20 Nov), so going live is WHOP_ENV alone.
// While WHOP_ENV isn't production, only the comma-separated emails in WHOP_TESTERS get a checkout: a sandbox checkout
// takes Whop's test cards, so anyone else could unlock Premium for free on the live site.

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
  const production = Deno.env.get('WHOP_ENV') === 'production'
  const secret = (name: string) => (production && Deno.env.get(`${name}_LIVE`)) || Deno.env.get(name) || ''
  const apiKey = secret('WHOP_API_KEY')
  let plans: Record<string, string> = {}
  try { plans = JSON.parse(secret('WHOP_PLAN_IDS') || '{}') } catch (_err) { /* checked below */ }
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server misconfigured' }, 500)

  const admin = createClient(supabaseUrl, serviceKey)
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '')
  const { data: { user } } = await admin.auth.getUser(jwt)
  if (!user) return json({ error: 'Please sign in' }, 401)

  let cycle = ''
  try { cycle = (await req.json())?.cycle } catch (_err) { /* checked below */ }
  if (cycle !== 'monthly' && cycle !== 'yearly') return json({ error: 'Pick monthly or yearly' }, 400)

  const { data: solo } = await admin.from('solo_students').select('plan, premium_until').eq('user_id', user.id).maybeSingle()
  if (!solo) return json({ error: 'Premium is for solo accounts' }, 403)
  // Same rule as solo_has_premium (0034). Stops a second subscription, and a second charge, for someone already paying.
  if (solo.plan === 'premium' && (solo.premium_until == null || new Date(solo.premium_until) > new Date())) {
    return json({ error: 'You already have Premium' }, 409)
  }

  const email = (user.email ?? '').toLowerCase()
  const testers = (Deno.env.get('WHOP_TESTERS') ?? '').toLowerCase().split(',').map(e => e.trim())
  if (!production && !(email && testers.includes(email))) return json({ error: "Premium isn't open yet." }, 403)
  const { count } = await admin.from('early_bird_signups').select('email', { count: 'exact', head: true }).eq('email', email)
  const variantId = plans[count ? `${cycle}_early` : cycle]
  if (!variantId || !apiKey) return json({ error: 'Server misconfigured' }, 500)

  const res = await fetch(`https://${production ? '' : 'sandbox-'}api.whop.com/api/v1/checkout_configurations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant_id: variantId, metadata: { customer_id: user.id } }),
  })
  if (!res.ok) {
    console.error('whop checkout_configurations', res.status, await res.text())
    return json({ error: 'Checkout is unavailable right now. Please try again.' }, 502)
  }
  const { id } = await res.json()
  return json({ id, environment: production ? 'production' : 'sandbox', email })
})
