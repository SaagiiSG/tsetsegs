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

    const { userId } = await req.json()

    if (!userId) {
      throw new Error('User ID is required')
    }

    // Delete user from auth (this will cascade to user_roles via foreign key)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      throw new Error(`Auth deletion error: ${authError.message}`)
    }

    // Delete teacher record (if exists)
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .delete()
      .eq('username', userId) // This might need adjustment based on how we identify teachers

    // Note: We're ignoring teacher deletion errors since the record might not exist
    if (teacherError) {
      console.log('Teacher record deletion note:', teacherError.message)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error: any) {
    console.error('Error deleting teacher account:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      },
    )
  }
})