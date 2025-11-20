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

    // Fetch all teachers without auth accounts
    const { data: teachers, error: fetchError } = await supabaseAdmin
      .from('teachers')
      .select('*')
      .is('username', null)

    if (fetchError) throw fetchError

    const results = []

    for (const teacher of teachers || []) {
      try {
        // Generate username from name
        const username = teacher.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        
        // Extract last 8 digits from phone (after +976-)
        const phoneDigits = teacher.phone.replace(/\D/g, '')
        const password = phoneDigits.slice(-8)
        
        const email = `${username}@teachers.tsetsegs.mn`

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            username,
            display_name: teacher.name,
          },
        })

        if (authError) {
          results.push({
            name: teacher.name,
            success: false,
            error: authError.message
          })
          continue
        }

        // Update teacher record with proper RLS bypass
        const { error: updateError } = await supabaseAdmin
          .from('teachers')
          .update({
            username,
            password_hash: 'managed_by_supabase_auth',
            temporary_password: false,
          })
          .eq('id', teacher.id)

        if (updateError) {
          console.error('Update error:', updateError)
          throw updateError
        }

        // Add teacher role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: 'teacher',
          })

        if (roleError) throw roleError

        results.push({
          name: teacher.name,
          username,
          password,
          success: true
        })
      } catch (err: any) {
        results.push({
          name: teacher.name,
          success: false,
          error: err.message
        })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      },
    )
  }
})