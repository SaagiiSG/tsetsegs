import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const bodySchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(20),
})

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

    // Validate input
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { name, phone } = parsed.data

    // Generate username from name
    const username = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50)
    
    // Generate random temporary password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let temporaryPassword = ''
    for (let i = 0; i < 12; i++) {
      temporaryPassword += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    const email = `${username}@teachers.tsetsegs.mn`

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { username, display_name: name },
    })

    if (authError) throw new Error(`Auth error: ${authError.message}`)
    if (!authData.user) throw new Error('Failed to create auth user')

    // Insert teacher record
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert({ name, phone, username, password_hash: 'managed_by_supabase_auth', temporary_password: true })

    if (teacherError) throw new Error(`Teacher insert error: ${teacherError.message}`)

    // Add teacher role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: authData.user.id, role: 'teacher' })

    if (roleError) throw new Error(`Role error: ${roleError.message}`)

    return new Response(
      JSON.stringify({ success: true, username, temporaryPassword, email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error: any) {
    console.error('Error creating teacher:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
