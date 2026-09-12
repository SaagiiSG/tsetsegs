import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BURNER_DOMAIN = 'burner.tsetsegs.mn'
const MAX_TTL_MINUTES = 24 * 60

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function randomToken(len: number) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*'
  let out = ''
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  for (let i = 0; i < 20; i++) out += chars[bytes[i] % chars.length]
  return out
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const { data: claims, error: claimsError } = await admin.auth.getClaims(
      authHeader.replace('Bearer ', '')
    )
    if (claimsError || !claims?.claims?.sub) return json({ error: 'Not authenticated' }, 401)
    const callerId = claims.claims.sub as string
    const callerEmail = String(claims.claims.email ?? '')
    const callerIsBurner = callerEmail.endsWith(`@${BURNER_DOMAIN}`)

    const { data: roleData } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)
      .eq('role', 'admin')
      .maybeSingle()
    if (!roleData) return json({ error: 'Admin access required' }, 403)

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const action = String(body.action ?? 'list')

    // ---- collect all burner accounts (paginated) ----
    const burners: any[] = []
    for (let page = 1; page <= 20; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      if (error) throw new Error(error.message)
      const users = data?.users ?? []
      for (const u of users) {
        if (u.email?.endsWith(`@${BURNER_DOMAIN}`)) burners.push(u)
      }
      if (users.length < 200) break
    }

    // ---- whoosh: delete anything past its expiry ----
    const now = Date.now()
    const purged: string[] = []
    for (const u of burners) {
      const expiresAt = u.user_metadata?.expires_at ? Date.parse(u.user_metadata.expires_at) : 0
      if (!expiresAt || expiresAt <= now) {
        await admin.from('user_roles').delete().eq('user_id', u.id)
        await admin.auth.admin.deleteUser(u.id)
        purged.push(u.id)
      }
    }
    const alive = burners.filter((u) => !purged.includes(u.id))

    if (action === 'purge' || action === 'list') {
      return json({
        success: true,
        purged: purged.length,
        burners: alive.map((u) => ({
          id: u.id,
          email: u.email,
          label: u.user_metadata?.label ?? null,
          created_at: u.created_at,
          expires_at: u.user_metadata?.expires_at ?? null,
          is_self: u.id === callerId,
        })),
      })
    }

    if (action === 'burn') {
      // A burner may always destroy itself; admins may destroy any burner.
      const targetId = String(body.userId ?? (callerIsBurner ? callerId : ''))
      if (!targetId) return json({ error: 'userId required' }, 400)
      const target = alive.find((u) => u.id === targetId)
      if (!target) return json({ success: true, alreadyGone: true })
      if (callerIsBurner && targetId !== callerId) return json({ error: 'Forbidden' }, 403)

      await admin.from('user_roles').delete().eq('user_id', targetId)
      const { error } = await admin.auth.admin.deleteUser(targetId)
      if (error) throw new Error(error.message)
      return json({ success: true, burned: targetId })
    }

    if (action === 'create') {
      if (callerIsBurner) return json({ error: 'Burner accounts cannot create burners' }, 403)

      const ttlMinutes = Math.min(
        Math.max(parseInt(String(body.ttlMinutes ?? 60), 10) || 60, 5),
        MAX_TTL_MINUTES
      )
      const label = typeof body.label === 'string' ? body.label.slice(0, 60) : null
      const email = `burner-${randomToken(8)}@${BURNER_DOMAIN}`
      const password = randomPassword()
      const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString()

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { burner: true, expires_at: expiresAt, label, display_name: 'Burner Admin' },
      })
      if (createError) throw new Error(createError.message)
      if (!created.user) throw new Error('Failed to create burner account')

      const { error: roleError } = await admin
        .from('user_roles')
        .insert({ user_id: created.user.id, role: 'admin' })
      if (roleError) {
        await admin.auth.admin.deleteUser(created.user.id)
        throw new Error(roleError.message)
      }

      return json({
        success: true,
        burner: { id: created.user.id, email, password, expires_at: expiresAt, label },
      })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (error: any) {
    console.error('burner-admin error:', error)
    return json({ error: error?.message ?? 'Unknown error' }, 400)
  }
})
