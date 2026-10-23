import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Public: the /educators form calls this right after submit_educator_demo_request with the new id.
// Safe to expose because the claim below lets each saved request email the owner at most once.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const id = await req.json().then((body) => body?.id, () => null)
  if (typeof id !== 'string' || !UUID.test(id)) return json({ error: 'Invalid request id' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Atomic claim: a second or concurrent call finds notified_at already set and gets no row.
  const { data: request, error } = await admin
    .from('educator_demo_requests')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('name, institution_name, email, phone, country, student_count, message, created_at')
    .maybeSingle()
  if (error) {
    console.error('Demo request claim failed', error)
    return json({ error: 'Could not load request' }, 500)
  }
  if (!request) return json({ success: true, alreadyNotified: true })

  // The service-role client authenticates as service_role, which send-transactional-email requires.
  const { error: sendError } = await admin.functions.invoke('send-transactional-email', {
    body: { templateName: 'educator-demo-request', idempotencyKey: `educator-demo-request-${id}`, templateData: request },
  })
  if (sendError) {
    console.error('Demo request alert failed', sendError)
    // Release the claim so a later call can retry this request.
    await admin.from('educator_demo_requests').update({ notified_at: null }).eq('id', id)
    return json({ error: 'Could not send alert' }, 502)
  }
  return json({ success: true })
})
