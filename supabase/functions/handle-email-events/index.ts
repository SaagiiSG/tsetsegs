import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.4.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Reason = 'bounce' | 'complaint' | 'unsubscribe'
const STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced', complaint: 'complained', unsubscribe: 'suppressed',
}
const MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

// Notification-only record keeping in the kept email tables; never gates sends.
async function record(reason: Reason, event: { event_id: string; data: { recipient: string } }) {
  const email = event.data.recipient.toLowerCase()
  const { error: suppressError } = await admin
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Suppression write failed', { code: suppressError.code, message: suppressError.message, event_id: event.event_id })
    throw new Error('suppression write failed')
  }
  const { error: logError } = await admin.from('email_send_log').insert({
    message_id: null, template_name: 'system', recipient_email: email,
    status: STATUS[reason], error_message: MESSAGE[reason], metadata: null,
  })
  if (logError) {
    console.error('Email log write failed', { code: logError.code, message: logError.message, event_id: event.event_id })
    throw new Error('log write failed')
  }
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    'email.bounced': (event) => record('bounce', event),
    'email.complaint': (event) => record('complaint', event),
    'email.unsubscribed': (event) => record('unsubscribe', event),
  },
})

Deno.serve((req) => handler(req))
