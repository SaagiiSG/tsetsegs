// Hourly (cron 'trial-reminders-hourly', 0153): emails each solo student whose Premium trial ends within 2 days, once
// per trial end. The scheduler calls with the public key, so anyone can trigger a run; that's harmless, because
// claim_trial_reminders hands out each reminder exactly once. A send that throws is unclaimed and retried next hour.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

type Due = { user_id: string; email: string; name: string; period_end: string; billing_period_days: number | null }

// Saagii's prices (src/solo/plans.ts PRICE), by Whop's billing period.
const priceFor = (days: number | null) => (days === 365 ? '$39 a year' : days === 30 ? '$19 a month' : null)
// UTC, so the date doesn't depend on where the function runs; a trial ending late in the day may read a day early
// for students far east, never late.
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('claim_trial_reminders')
  if (error) {
    console.error('claim_trial_reminders', error.message)
    return json({ error: 'Could not read trials' }, 500)
  }
  let sent = 0, failed = 0
  for (const d of (data ?? []) as Due[]) {
    const log = (status: 'sent' | 'suppressed' | 'failed', error_message?: string) =>
      admin.from('email_send_log').insert({ message_id: null, template_name: 'trial-reminder', recipient_email: d.email, status, error_message: error_message ?? null })
        .then(({ error: e }) => { if (e) console.error('Email log write failed', e.message) })
    try {
      const r = await sendTemplateEmail('trial-reminder', d.email, {
        templateData: { ends: fmt(d.period_end), price: priceFor(d.billing_period_days) },
        idempotencyKey: `trial-reminder:${d.user_id}:${d.period_end}`,
      })
      await log(r.sent ? 'sent' : 'suppressed')
      sent++
    } catch (e) {
      failed++
      await log('failed', (e as Error)?.message)
      await admin.rpc('unclaim_trial_reminder', { _user: d.user_id, _period_end: d.period_end })
    }
  }
  return json({ sent, failed })
})
