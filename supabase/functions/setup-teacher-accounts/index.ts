import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the caller as admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify caller is admin
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: claims, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    )
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', claims.claims.sub)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fetch all teachers without auth accounts
    const { data: teachers, error: fetchError } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .is('username', null)

    if (fetchError) throw fetchError

    const results = []

    const generateSecurePassword = (): string => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
      const bytes = new Uint32Array(14)
      crypto.getRandomValues(bytes)
      let out = ''
      for (let i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length]
      return out
    }

    for (const teacher of teachers || []) {
      try {
        const username = teacher.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50)
        const password = generateSecurePassword()
        const email = `${username}@teachers.tsetsegs.mn`

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { username, display_name: teacher.name },
        })

        if (authError) {
          results.push({ name: teacher.name, success: false, error: authError.message })
          continue
        }

        const { error: updateError } = await supabaseAdmin
          .from('teachers')
          .update({ username, password_hash: 'managed_by_supabase_auth', temporary_password: true })
          .eq('id', teacher.id)

        if (updateError) throw updateError

        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: authData.user.id, role: 'teacher' })

        if (roleError) throw roleError

        results.push({ name: teacher.name, username, password, success: true })
      } catch (err: any) {
        results.push({ name: teacher.name, success: false, error: err.message })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
