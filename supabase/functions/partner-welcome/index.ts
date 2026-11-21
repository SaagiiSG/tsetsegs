import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { PARTNER_RULES, partnerLink } from '../_shared/partner-rules.ts'

// Admin only (JWT on): emails an approved partner their code and link, and creates the sign-in account they use.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Same admin check as create-teacher-account.
  const callerClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: claims, error: claimsError } = await callerClient.auth.getClaims(authHeader.replace('Bearer ', ''))
  if (claimsError || !claims?.claims?.sub) return json({ error: 'Not authenticated' }, 401)
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', claims.claims.sub).eq('role', 'admin').maybeSingle()
  if (!role) return json({ error: 'Admin access required' }, 403)

  const partnerId = await req.json().then((body) => body?.partner_id, () => null)
  if (typeof partnerId !== 'string' || !UUID.test(partnerId)) return json({ error: 'Invalid partner id' }, 400)

  const { data: partner, error: partnerError } = await admin.from('partners').select('name, email, code').eq('id', partnerId).maybeSingle()
  if (partnerError) {
    console.error('Partner load failed', partnerError)
    return json({ error: 'Could not load partner' }, 500)
  }
  if (!partner) return json({ error: 'Partner not found' }, 404)

  // The partner signs in with an email code, so the account only has to exist; it may already.
  const { error: createError } = await admin.auth.admin.createUser({ email: partner.email, email_confirm: true })
  if (createError && !/already.*registered|email_exists/i.test(`${(createError as { code?: string }).code ?? ''} ${createError.message}`)) {
    console.error('Partner account create failed', createError.message)
    return json({ error: 'Could not create sign-in account' }, 500)
  }

  // Atomic claim: a second or concurrent call finds welcomed_at already set and gets no row.
  const { data: claimed, error: claimError } = await admin
    .from('partners').update({ welcomed_at: new Date().toISOString() }).eq('id', partnerId).is('welcomed_at', null).select('id').maybeSingle()
  if (claimError) {
    console.error('Partner welcome claim failed', claimError)
    return json({ error: 'Could not send welcome' }, 500)
  }
  if (!claimed) return json({ alreadySent: true })

  const release = () => admin.from('partners').update({ welcomed_at: null }).eq('id', partnerId)
  const log = async (status: 'sent' | 'suppressed' | 'failed', error_message?: string) => {
    const { error: logError } = await admin.from('email_send_log').insert({
      message_id: null, template_name: 'partner-welcome', recipient_email: partner.email, status, error_message: error_message ?? null,
    })
    if (logError) console.error('Email log write failed', { code: logError.code, message: logError.message })
  }

  // The dashboard finds a partner only by this link; no account found means they could never sign in to it.
  const { data: linked, error: linkError } = await admin.rpc('partner_link_user', { _partner: partnerId })
  if (linkError || !linked) {
    console.error('Partner link failed', linkError?.message ?? 'no account found')
    await release()
    return json({ error: 'Could not link sign-in account' }, 500)
  }

  try {
    const result = await sendTemplateEmail('partner-welcome', partner.email, {
      templateData: { name: partner.name, code: partner.code, link: partnerLink(partner.code), rules: PARTNER_RULES, signIn: 'https://flowersos.co/partner/dashboard' },
      idempotencyKey: `partner-welcome-${partnerId}`,
    })
    await log(result.sent ? 'sent' : 'suppressed')
  } catch (sendError) {
    console.error('Partner welcome failed', sendError)
    await log('failed', sendError instanceof Error ? sendError.message : String(sendError))
    await release()
    return json({ error: 'Could not send welcome' }, 502)
  }
  return json({ sent: true })
})
