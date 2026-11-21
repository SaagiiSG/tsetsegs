// Daily (cron, 0163): one email to the owner listing partner payouts that came due. The scheduler calls with the
// public key, so anyone can trigger a run; that's harmless, because claim_partner_payouts_due hands out each payout
// exactly once and the email only goes to the owner. A failed send is unclaimed and retried on the next run.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { TEMPLATES } from '../_shared/transactional-email-templates/registry.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

type Due = { id: string; partner_name: string; code: string; amount_cents: number; due_at: string }

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.rpc('claim_partner_payouts_due')
  if (error) {
    console.error('claim_partner_payouts_due', error.message)
    return json({ error: 'Could not read payouts' }, 500)
  }
  const due = (data ?? []) as Due[]
  if (!due.length) return json({ due: 0 })

  const templateName = 'partner-payouts-due'
  const recipient = TEMPLATES[templateName]?.to ?? ''
  const log = (status: 'sent' | 'suppressed' | 'failed', error_message?: string) =>
    admin.from('email_send_log').insert({ message_id: null, template_name: templateName, recipient_email: recipient, status, error_message: error_message ?? null })
      .then(({ error: e }) => { if (e) console.error('Email log write failed', e.message) })
  try {
    const r = await sendTemplateEmail(templateName, recipient, {
      templateData: {
        payouts: due.map((d) => ({ partner_name: d.partner_name, code: d.code, amount: `$${d.amount_cents / 100}`, due: fmt(d.due_at) })),
      },
      idempotencyKey: `partner-payouts-due:${new Date().toISOString().slice(0, 10)}`,
    })
    await log(r.sent ? 'sent' : 'suppressed')
  } catch (e) {
    await log('failed', (e as Error)?.message)
    await admin.rpc('unclaim_partner_payouts_due', { _ids: due.map((d) => d.id) })
    return json({ error: 'Could not send email' }, 502)
  }
  return json({ due: due.length })
})
