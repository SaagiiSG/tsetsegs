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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { name, phone } = await req.json()

    if (!name || !phone) {
      throw new Error('Name and phone are required')
    }

    // Generate username from name
    const username = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    
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
      user_metadata: {
        username,
        display_name: name,
      },
    })

    if (authError) {
      throw new Error(`Auth error: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user')
    }

    // Insert teacher record
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .insert({
        name,
        phone,
        username,
        password_hash: 'managed_by_supabase_auth',
        temporary_password: true,
      })

    if (teacherError) {
      throw new Error(`Teacher insert error: ${teacherError.message}`)
    }

    // Add teacher role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'teacher',
      })

    if (roleError) {
      throw new Error(`Role error: ${roleError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        username,
        temporaryPassword,
        email
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error: any) {
    console.error('Error creating teacher:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      },
    )
  }
})