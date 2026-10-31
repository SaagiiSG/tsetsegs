import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'
import { CODE_ERRORS, canSend, checkCode, hashCode, newCode } from './emailCode.ts'

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
const withFreshPassword = async <T>(fn: (password: string) => Promise<{ data?: unknown; error: { message?: string } | null }>): Promise<{ password: string; data?: T }> => {
  let lastError: { message?: string } | null = null
  for (let i = 0; i < 4; i++) {
    const password = tempPassword()
    const { data, error } = await fn(password)
    if (!error) return { password, data: data as T | undefined }
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
      const { data } = await admin.from('institution_customers').select('id, portal_enabled, status, access_blocked_at')
        .ilike('slug', String(slug ?? '').trim()).maybeSingle()
      return data && data.portal_enabled && data.status !== 'churned' ? data : null
    }

    // The open center and the class for a join link, or the error response (shared by send_email_code and register_verified).
    const joinTarget = async () => {
      const tenant = await findTenant(body.slug)
      if (!tenant) return { error: json({ error: 'This center portal is not available.' }, 404) }
      if (tenant.access_blocked_at) return { error: json({ error: 'This center is paused because of an overdue payment, so new sign-ups are closed. Please contact your center.' }, 403) }
      const { data: cls } = await admin.from('tenant_classes').select('id').eq('institution_id', tenant.id).eq('join_code', String(body.code ?? '').trim()).maybeSingle()
      if (!cls) return { error: json({ error: 'This sign-up link is not valid. Ask your center for a new one.' }, 404) }
      return { tenant, cls }
    }
    const typedEmail = String(body.email ?? '').trim().toLowerCase().slice(0, 200)
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(typedEmail)

    // ---------- Email code for the verified sign-up ----------
    if (action === 'send_email_code') {
      const t = await joinTarget()
      if (t.error) return t.error
      if (!emailOk) return json({ error: 'Enter a valid email.' }, 400)
      const now = new Date()
      const { data: sent } = await admin.from('tenant_email_codes').select('created_at').eq('institution_id', t.tenant.id).eq('email', typedEmail)
        .gte('created_at', new Date(now.getTime() - 3600e3).toISOString()).order('created_at', { ascending: false })
      const gate = canSend((sent ?? []).map((r) => r.created_at), now)
      if (!gate.ok) return json({ error: gate.error }, 429)
      const { count: hourly } = await admin.from('tenant_email_codes').select('id', { count: 'exact', head: true }).eq('institution_id', t.tenant.id)
        .gte('created_at', new Date(now.getTime() - 3600e3).toISOString())
      if ((hourly ?? 0) > 300) return json({ error: 'Too many sign-ups right now. Please try again later.' }, 429)
      const code = newCode()
      const { data: row, error: insErr } = await admin.from('tenant_email_codes').insert({
        institution_id: t.tenant.id, email: typedEmail, code_hash: await hashCode(typedEmail, code), expires_at: new Date(now.getTime() + 600e3).toISOString(),
      }).select('id').single()
      if (insErr || !row) throw insErr ?? new Error('Could not save code')
      const { data: center } = await admin.from('institution_customers').select('name').eq('id', t.tenant.id).maybeSingle()
      try {
        const r = await sendTemplateEmail('center-email-code', typedEmail, { templateData: { code, center_name: center?.name ?? '' } })
        if (!r.sent) {
          await admin.from('tenant_email_codes').delete().eq('id', row.id)
          return json({ error: "We can't send email to this address. Use Google or another email." }, 400)
        }
      } catch (e) {
        console.error('center email code failed', e)
        await admin.from('tenant_email_codes').delete().eq('id', row.id)
        return json({ error: 'Could not send the code. Try again.' }, 502)
      }
      return json({ ok: true })
    }

    // ---------- Verified registration (class join link + emailed code) ----------
    if (action === 'register_verified') {
      const t = await joinTarget()
      if (t.error) return t.error
      const { tenant, cls } = t
      const name = String(body.name ?? '').trim().slice(0, 100)
      const phone = digits(body.phone)
      const school = String(body.school ?? '').trim().slice(0, 120)
      const grade = String(body.grade ?? '').trim().slice(0, 20)
      const password = String(body.password ?? '')
      if (name.length < 2) return json({ error: 'Enter your full name.' }, 400)
      if (phone.length < 6 || phone.length > 15) return json({ error: 'Enter a valid phone number.' }, 400)
      if (!emailOk) return json({ error: 'Enter a valid email.' }, 400)
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
        return json({ error: 'Use at least 8 characters with letters and numbers.' }, 400)
      const since = new Date(Date.now() - 3600e3).toISOString()
      const { count } = await admin.from('tenant_registrations').select('id', { count: 'exact', head: true }).eq('institution_id', tenant.id).gte('created_at', since)
      if ((count ?? 0) > 200) return json({ error: 'Too many sign-ups right now. Please try again later.' }, 429)
      // Same order as tenant_join_with_google: an existing login or an inactive row stops here, an admin-added row is taken over.
      const { data: cur } = await admin.from('tenant_students').select('id, user_id, active, class_id, email, google_due_on').eq('institution_id', tenant.id).eq('phone', phone).maybeSingle()
      if (cur?.user_id) return json({ error: 'You already have an account here. Sign in instead.' }, 409)
      if (cur && !cur.active) return json({ error: 'This phone number is not active here. Ask your center.' }, 403)
      // Newest code for this email in this center.
      const { data: codeRow } = await admin.from('tenant_email_codes').select('id, code_hash, expires_at, attempts').eq('institution_id', tenant.id).eq('email', typedEmail)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      const verdict = checkCode(codeRow, await hashCode(typedEmail, String(body.email_code ?? '').trim()), new Date())
      if (verdict === 'expired' || verdict === 'locked') return json({ error: CODE_ERRORS[verdict] }, 400)
      // Charge the attempt first (compare-and-set), so parallel guesses cannot dodge the limit; a lost race looks like a wrong code.
      const { data: charged } = await admin.from('tenant_email_codes').update({ attempts: codeRow!.attempts + 1 })
        .eq('id', codeRow!.id).eq('attempts', codeRow!.attempts).select('id')
      if (!charged?.length || verdict === 'wrong') return json({ error: CODE_ERRORS.wrong }, 400)
      let studentId = cur?.id as string | undefined
      if (!studentId) {
        const { data: student, error: sErr } = await admin.from('tenant_students')
          .insert({ institution_id: tenant.id, class_id: cls.id, name, phone, email: typedEmail }).select('id').single()
        if (sErr || !student) return json({ error: 'Could not create your account. Try again.' }, 400)
        studentId = student.id
      }
      const loginEmail = `s-${studentId}@students.flowersos.co`
      const { data: created, error: uErr } = await admin.auth.admin.createUser({
        email: loginEmail, password, email_confirm: true, user_metadata: { tenant_student_id: studentId },
      })
      if (uErr || !created.user) {
        if (!cur) await admin.from('tenant_students').delete().eq('id', studentId)
        return json({ error: /weak|leaked|compromised|guess/i.test(uErr?.message ?? '') ? 'That password is too easy to guess. Pick another.' : 'Could not create your account. Try again.' }, 400)
      }
      // The admin-added row keeps its class; only a null class takes the link's. The email is the one just verified.
      const { data: linked } = await admin.from('tenant_students').update({
        user_id: created.user.id, password_user_id: created.user.id,
        email: typedEmail, class_id: cur?.class_id ?? cls.id, email_verified_at: new Date().toISOString(),
        // Email-path students get 7 days to connect Google; an admin-added row keeps a later date.
        ...(cur ? { google_due_on: [cur.google_due_on, new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)].filter(Boolean).sort().pop() } : {}),
      }).eq('id', studentId).is('user_id', null).select('id')
      if (!linked?.length) {
        await admin.auth.admin.deleteUser(created.user.id)
        if (!cur) await admin.from('tenant_students').delete().eq('id', studentId)
        return json({ error: 'You already have an account here. Sign in instead.' }, 409)
      }
      await admin.from('tenant_registrations').insert({ institution_id: tenant.id, class_id: cur?.class_id ?? cls.id, name, phone, email: typedEmail, school, grade, status: 'approved', reviewed_at: new Date().toISOString() })
      await admin.from('tenant_email_codes').delete().eq('institution_id', tenant.id).eq('email', typedEmail)
      return json({ email: loginEmail })
    }

    // ---------- Public registration (class join link) ----------
    if (action === 'register') {
      const tenant = await findTenant(body.slug)
      if (!tenant) return json({ error: 'This center portal is not available.' }, 404)
      if (tenant.access_blocked_at) return json({ error: 'This center is paused because of an overdue payment, so new sign-ups are closed. Please contact your center.' }, 403)
      const code = String(body.code ?? '').trim()
      const { data: cls } = await admin.from('tenant_classes').select('id').eq('institution_id', tenant.id).eq('join_code', code).maybeSingle()
      if (!cls) return json({ error: 'This sign-up link is not valid. Ask your center for a new one.' }, 404)
      const name = String(body.name ?? '').trim().slice(0, 100)
      const phone = digits(body.phone)
      const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200)
      const school = String(body.school ?? '').trim().slice(0, 120)
      const grade = String(body.grade ?? '').trim().slice(0, 20)
      if (name.length < 2) return json({ error: 'Enter your full name.' }, 400)
      if (phone.length < 6 || phone.length > 15) return json({ error: 'Enter a valid phone number.' }, 400)
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a valid email or leave it empty.' }, 400)
      const since = new Date(Date.now() - 3600e3).toISOString()
      const { count } = await admin.from('tenant_registrations').select('id', { count: 'exact', head: true }).eq('institution_id', tenant.id).gte('created_at', since)
      if ((count ?? 0) > 200) return json({ error: 'Too many sign-ups right now. Please try again later.' }, 429)
      const { data: existing } = await admin.from('tenant_students').select('id').eq('institution_id', tenant.id).eq('phone', phone).maybeSingle()
      if (existing) return json({ error: 'This phone number is already registered. Sign in instead.' }, 409)
      const password = String(body.password ?? '')
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
        return json({ error: 'Use at least 8 characters with letters and numbers.' }, 400)
      // Instant enrollment: the class code itself is the invitation.
      const { data: student, error: sErr } = await admin.from('tenant_students')
        .insert({ institution_id: tenant.id, class_id: cls.id, name, phone }).select('id').single()
      if (sErr || !student) return json({ error: 'Could not create your account. Try again.' }, 400)
      const loginEmail = `s-${student.id}@students.flowersos.co`
      const { data: created, error: uErr } = await admin.auth.admin.createUser({
        email: loginEmail, password, email_confirm: true, user_metadata: { tenant_student_id: student.id },
      })
      if (uErr || !created.user) {
        await admin.from('tenant_students').delete().eq('id', student.id)
        return json({ error: /weak|leaked|compromised|guess/i.test(uErr?.message ?? '') ? 'That password is too easy to guess. Pick another.' : 'Could not create your account. Try again.' }, 400)
      }
      await admin.from('tenant_students').update({ user_id: created.user.id, password_user_id: created.user.id }).eq('id', student.id)
      await admin.from('tenant_registrations').insert({ institution_id: tenant.id, class_id: cls.id, name, phone, email, school, grade, status: 'approved', reviewed_at: new Date().toISOString() })
      return json({ email: loginEmail })
    }

    // ---------- Public student actions ----------
    if (action === 'student_lookup' || action === 'student_activate') {
      const tenant = await findTenant(body.slug)
      if (!tenant) return json({ error: 'This center portal is not available.' }, 404)
      const phone = digits(body.phone)
      if (phone.length < 6) return json({ error: 'Enter the phone number registered with your class.' }, 400)
      const { data: student } = await admin.from('tenant_students').select('id, user_id, active, google_user_id, google_due_on')
        .eq('institution_id', tenant.id).eq('phone', phone).maybeSingle()
      if (!student || !student.active) return json({ error: 'This phone number is not registered with your center. Ask your center to add you.' }, 404)
      const email = `s-${student.id}@students.flowersos.co`
      if (action === 'student_lookup') return json({ activated: !!student.user_id, email: student.user_id ? email : null, google: !!student.user_id && student.user_id === student.google_user_id })

      if (student.user_id) return json({ error: 'This account already has a password. Sign in instead.' }, 409)
      const password = String(body.password ?? '')
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
        return json({ error: 'Use at least 8 characters with letters and numbers.' }, 400)
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { tenant_student_id: student.id },
      })
      if (error || !created.user) throw new Error(error?.message ?? 'Could not create account')
      const { error: linkErr } = await admin.from('tenant_students').update({
        user_id: created.user.id, password_user_id: created.user.id,
        // 7 days to connect Google; an admin-set later date stays.
        google_due_on: [student.google_due_on, new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)].filter(Boolean).sort().pop(),
      }).eq('id', student.id).is('user_id', null)
      if (linkErr) { await admin.auth.admin.deleteUser(created.user.id); throw linkErr }
      return json({ email })
    }

    // ---------- Signed-in actions ----------
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) return json({ error: 'Not signed in' }, 401)
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData.user) return json({ error: 'Not signed in' }, 401)
    const callerId = userData.user.id
    const { data: isPlatformAdmin } = await admin.rpc('has_role', { _user_id: callerId, _role: 'admin' })

    const institutionId = String(body.institution_id ?? '')

    // ---------- Signed-in student verifies an email instead of connecting Google ----------
    if (action === 'student_email_code' || action === 'student_email_verify') {
      const { data: me } = await admin.from('tenant_students').select('id').eq('institution_id', institutionId).eq('user_id', callerId).eq('active', true).maybeSingle()
      if (!me) return json({ error: 'Not allowed' }, 403)
      if (!emailOk) return json({ error: 'Enter a valid email.' }, 400)
      const now = new Date()
      if (action === 'student_email_code') {
        const { data: sent } = await admin.from('tenant_email_codes').select('created_at').eq('institution_id', institutionId).eq('email', typedEmail)
          .gte('created_at', new Date(now.getTime() - 3600e3).toISOString()).order('created_at', { ascending: false })
        const gate = canSend((sent ?? []).map((r) => r.created_at), now)
        if (!gate.ok) return json({ error: gate.error }, 429)
        const { count: hourly } = await admin.from('tenant_email_codes').select('id', { count: 'exact', head: true }).eq('institution_id', institutionId)
          .gte('created_at', new Date(now.getTime() - 3600e3).toISOString())
        if ((hourly ?? 0) > 300) return json({ error: 'Too many codes right now. Please try again later.' }, 429)
        const code = newCode()
        const { data: row, error: insErr } = await admin.from('tenant_email_codes').insert({
          institution_id: institutionId, email: typedEmail, code_hash: await hashCode(typedEmail, code), expires_at: new Date(now.getTime() + 600e3).toISOString(),
        }).select('id').single()
        if (insErr || !row) throw insErr ?? new Error('Could not save code')
        const { data: center } = await admin.from('institution_customers').select('name').eq('id', institutionId).maybeSingle()
        try {
          const r = await sendTemplateEmail('center-email-code', typedEmail, { templateData: { code, center_name: center?.name ?? '' } })
          if (!r.sent) {
            await admin.from('tenant_email_codes').delete().eq('id', row.id)
            return json({ error: "We can't send email to this address. Use Google or another email." }, 400)
          }
        } catch (e) {
          console.error('student email code failed', e)
          await admin.from('tenant_email_codes').delete().eq('id', row.id)
          return json({ error: 'Could not send the code. Try again.' }, 502)
        }
        return json({ ok: true })
      }
      const { data: codeRow } = await admin.from('tenant_email_codes').select('id, code_hash, expires_at, attempts').eq('institution_id', institutionId).eq('email', typedEmail)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      const verdict = checkCode(codeRow, await hashCode(typedEmail, String(body.email_code ?? '').trim()), now)
      if (verdict === 'expired' || verdict === 'locked') return json({ error: CODE_ERRORS[verdict] }, 400)
      // Charge the attempt first (compare-and-set), as in register_verified.
      const { data: charged } = await admin.from('tenant_email_codes').update({ attempts: codeRow!.attempts + 1 })
        .eq('id', codeRow!.id).eq('attempts', codeRow!.attempts).select('id')
      if (!charged?.length || verdict === 'wrong') return json({ error: CODE_ERRORS.wrong }, 400)
      const { error: upErr } = await admin.from('tenant_students').update({ email: typedEmail, email_verified_at: now.toISOString() }).eq('id', me.id)
      if (upErr) throw upErr
      await admin.from('tenant_email_codes').delete().eq('id', codeRow!.id)
      return json({ ok: true })
    }

    const { data: callerMember } = await admin.from('tenant_members').select('role, active')
      .eq('institution_id', institutionId).eq('user_id', callerId).maybeSingle()
    const isCenterAdmin = callerMember?.active && callerMember.role === 'center_admin'

    if (action === 'create_member') {
      const role = body.role === 'center_admin' ? 'center_admin' : 'teacher'
      // Center admins add teachers or co-admins, only to the center they admin (isCenterAdmin is scoped to institution_id).
      if (!isPlatformAdmin && !isCenterAdmin) return json({ error: 'Not allowed' }, 403)
      const name = String(body.name ?? '').trim().slice(0, 100)
      const email = String(body.email ?? '').trim().toLowerCase()
      if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'Enter a name and a valid email.' }, 400)
      const { data: inst } = await admin.from('institution_customers').select('id').eq('id', institutionId).maybeSingle()
      if (!inst) return json({ error: 'Center not found' }, 404)
      let created: { user: { id: string } | null } | undefined
      let password = ''
      let existing = false
      try {
        const r = await withFreshPassword((pw) => admin.auth.admin.createUser({
          email, password: pw, email_confirm: true, user_metadata: { display_name: name, tenant_institution_id: institutionId },
        }))
        created = r.data as typeof created
        password = r.password
      } catch (e) {
        const msg = (e as Error).message ?? 'Could not create account'
        if (!/already/i.test(msg)) return json({ error: msg }, 400)
        // Email already has a login: attach that login without touching its password (reset_member_password refuses it too).
        const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
        if (linkErr || !link?.user) return json({ error: 'That email already has an account, but it could not be attached.' }, 400)
        created = { user: { id: link.user.id } }
        existing = true
      }
      if (!created?.user) return json({ error: 'Could not create account' }, 400)
      const { data: dup } = await admin.from('tenant_members').select('id').eq('institution_id', institutionId).eq('user_id', created.user.id).maybeSingle()
      if (dup) return json({ error: 'This person is already a member of this center.' }, 400)
      const { error: insErr } = await admin.from('tenant_members').insert({
        institution_id: institutionId, user_id: created.user.id, role, display_name: name, email,
      })
      if (insErr) { if (!existing) await admin.auth.admin.deleteUser(created.user.id); throw insErr }
      return json(existing ? { email, existingAccount: true } : { email, temporaryPassword: password })
    }

    if (action === 'reset_member_password') {
      const { data: member } = await admin.from('tenant_members').select('user_id, role, institution_id').eq('id', body.member_id).maybeSingle()
      if (!member || member.institution_id !== institutionId) return json({ error: 'Not found' }, 404)
      if (!isPlatformAdmin && !(isCenterAdmin && member.role === 'teacher')) return json({ error: 'Not allowed' }, 403)
      // Never reset a login that existed before it was attached to this center (e.g. a platform account).
      const { data: u } = await admin.auth.admin.getUserById(member.user_id)
      if (u?.user?.user_metadata?.tenant_institution_id !== institutionId)
        return json({ error: 'This person uses their existing login. Their password can only be changed by them.' }, 400)
      const { password } = await withFreshPassword((pw) => admin.auth.admin.updateUserById(member.user_id, { password: pw }))
      return json({ temporaryPassword: password })
    }

    if (action === 'reset_student') {
      if (!isPlatformAdmin && !isCenterAdmin) return json({ error: 'Not allowed' }, 403)
      const { data: student } = await admin.from('tenant_students').select('id, user_id, institution_id, google_user_id').eq('id', body.student_id).maybeSingle()
      if (!student || student.institution_id !== institutionId) return json({ error: 'Not found' }, 404)
      if (student.user_id && student.user_id === student.google_user_id)
        return json({ error: 'This student signs in with Google. Use Switch to phone sign-in instead.' }, 400)
      if (student.user_id) {
        await admin.from('tenant_students').update({ user_id: null }).eq('id', student.id)
        // Center admins can edit user_id, so only delete the login this function made for this student, never someone else's.
        const { data: u } = await admin.auth.admin.getUserById(student.user_id)
        if (u?.user?.email === `s-${student.id}@students.flowersos.co`) {
          await admin.auth.admin.deleteUser(student.user_id)
          await admin.from('tenant_students').update({ password_user_id: null }).eq('id', student.id)
        }
      }
      return json({ ok: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('tenant-accounts error', e)
    return json({ error: (e as Error).message ?? 'Unexpected error' }, 500)
  }
})
