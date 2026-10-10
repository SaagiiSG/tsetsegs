import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '')
const tempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('') + '!7'
}
// Retry when the auth provider rejects a generated password as weak/leaked.
const withFreshPassword = async <T>(fn: (password: string) => Promise<{ data?: T; error: { message?: string } | null }>): Promise<{ password: string; data?: T }> => {
  let lastError: { message?: string } | null = null
  for (let i = 0; i < 4; i++) {
    const password = tempPassword()
    const { data, error } = await fn(password)
    if (!error) return { password, data }
    lastError = error
    if (!/weak|easy to guess|leaked|compromised/i.test(error.message ?? '')) throw new Error(error.message ?? 'Could not set password')
  }
  throw new Error(lastError?.message ?? 'Could not set password')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  try {
    const body = await req.json()
    const action = String(body.action ?? '')

    const findTenant = async (slug: string) => {
      const { data } = await admin.from('institution_customers').select('id, portal_enabled, status')
        .ilike('slug', String(slug ?? '').trim()).maybeSingle()
      return data && data.portal_enabled && data.status !== 'churned' ? data : null
    }

    // ---------- Public student actions ----------
    if (action === 'student_lookup' || action === 'student_activate') {
      const tenant = await findTenant(body.slug)
      if (!tenant) return json({ error: 'This center portal is not available.' }, 404)
      const phone = digits(body.phone)
      if (phone.length < 6) return json({ error: 'Enter the phone number registered with your class.' }, 400)
      const { data: student } = await admin.from('tenant_students').select('id, user_id, active')
        .eq('institution_id', tenant.id).eq('phone', phone).maybeSingle()
      if (!student || !student.active) return json({ error: 'This phone number is not registered with your center. Ask your center to add you.' }, 404)
      const email = `s-${student.id}@students.flowersos.co`
      if (action === 'student_lookup') return json({ activated: !!student.user_id, email: student.user_id ? email : null })

      if (student.user_id) return json({ error: 'This account already has a password. Sign in instead.' }, 409)
      const password = String(body.password ?? '')
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
        return json({ error: 'Use at least 8 characters with letters and numbers.' }, 400)
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { tenant_student_id: student.id },
      })
      if (error || !created.user) throw new Error(error?.message ?? 'Could not create account')
      const { error: linkErr } = await admin.from('tenant_students').update({ user_id: created.user.id })
        .eq('id', student.id).is('user_id', null)
      if (linkErr) { await admin.auth.admin.deleteUser(created.user.id); throw linkErr }
      return json({ email })
    }

    // ---------- Staff actions (authenticated) ----------
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Not signed in' }, 401)
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401)
    const callerId = userData.user.id
    const { data: isPlatformAdmin } = await admin.rpc('has_role', { _user_id: callerId, _role: 'admin' })

    const institutionId = String(body.institution_id ?? '')
    const { data: callerMember } = await admin.from('tenant_members').select('role, active')
      .eq('institution_id', institutionId).eq('user_id', callerId).maybeSingle()
    const isCenterAdmin = callerMember?.active && callerMember.role === 'center_admin'

    if (action === 'create_member') {
      const role = body.role === 'center_admin' ? 'center_admin' : 'teacher'
      if (!isPlatformAdmin && !(isCenterAdmin && role === 'teacher')) return json({ error: 'Not allowed' }, 403)
      const name = String(body.name ?? '').trim().slice(0, 100)
      const email = String(body.email ?? '').trim().toLowerCase()
      if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a name and a valid email.' }, 400)
      const { data: inst } = await admin.from('institution_customers').select('id').eq('id', institutionId).maybeSingle()
      if (!inst) return json({ error: 'Center not found' }, 404)
      let created: { user: { id: string } | null } | undefined
      let password = ''
      try {
        const r = await withFreshPassword((pw) => admin.auth.admin.createUser({
          email, password: pw, email_confirm: true, user_metadata: { display_name: name, tenant_institution_id: institutionId },
        }))
        created = r.data as typeof created
        password = r.password
      } catch (e) {
        const msg = (e as Error).message ?? 'Could not create account'
        return json({ error: msg.includes('already') ? 'That email already has an account.' : msg }, 400)
      }
      if (!created?.user) return json({ error: 'Could not create account' }, 400)
      const { error: insErr } = await admin.from('tenant_members').insert({
        institution_id: institutionId, user_id: created.user.id, role, display_name: name, email,
      })
      if (insErr) { await admin.auth.admin.deleteUser(created.user.id); throw insErr }
      return json({ email, temporaryPassword: password })
    }

    if (action === 'reset_member_password') {
      const { data: member } = await admin.from('tenant_members').select('user_id, role, institution_id').eq('id', body.member_id).maybeSingle()
      if (!member || member.institution_id !== institutionId) return json({ error: 'Not found' }, 404)
      if (!isPlatformAdmin && !(isCenterAdmin && member.role === 'teacher')) return json({ error: 'Not allowed' }, 403)
      const password = tempPassword()
      const { error } = await admin.auth.admin.updateUserById(member.user_id, { password })
      if (error) throw error
      return json({ temporaryPassword: password })
    }

    if (action === 'reset_student') {
      if (!isPlatformAdmin && !isCenterAdmin) return json({ error: 'Not allowed' }, 403)
      const { data: student } = await admin.from('tenant_students').select('id, user_id, institution_id').eq('id', body.student_id).maybeSingle()
      if (!student || student.institution_id !== institutionId) return json({ error: 'Not found' }, 404)
      if (student.user_id) {
        await admin.from('tenant_students').update({ user_id: null }).eq('id', student.id)
        await admin.auth.admin.deleteUser(student.user_id)
      }
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('tenant-accounts error', e)
    return json({ error: (e as Error).message ?? 'Unexpected error' }, 500)
  }
})
