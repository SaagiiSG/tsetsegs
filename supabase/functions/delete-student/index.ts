import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function requireAdminOrTeacher(req: Request, supabaseAdmin: any): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  const { data: roles } = await supabaseAdmin.from('user_roles')
    .select('role').eq('user_id', userData.user.id)
  const allowed = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'teacher')
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Admin or teacher access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authFail = await requireAdmin(req, supabaseAdmin)
    if (authFail) return authFail

    const { studentId, batchId } = await req.json()

    if (!studentId) {
      throw new Error('Student ID is required')
    }

    // Get the student's phone to find linked account
    const { data: student } = await supabaseAdmin
      .from('students')
      .select('phone')
      .eq('id', studentId)
      .single()

    if (!student) {
      throw new Error('Student not found')
    }

    // Find linked student account
    const { data: account } = await supabaseAdmin
      .from('student_accounts')
      .select('id')
      .eq('linked_student_id', studentId)
      .maybeSingle()

    if (account) {
      const accountId = account.id

      const { data: attempts } = await supabaseAdmin
        .from('bluebook_attempts')
        .select('id')
        .eq('student_account_id', accountId)

      if (attempts && attempts.length > 0) {
        const attemptIds = attempts.map((a: any) => a.id)
        await supabaseAdmin.from('bluebook_answers').delete().in('attempt_id', attemptIds)
        await supabaseAdmin.from('bluebook_attempts').delete().eq('student_account_id', accountId)
      }

      const tables = [
        'student_attempts', 'student_progress', 'student_badges',
        'student_sessions', 'student_activity_logs', 'point_transactions',
        'featured_badges', 'question_flags', 'student_question_notes',
        'security_alerts', 'bug_reports', 'seat_bookings',
        'student_sprint_rankings', 'booking_bans',
        'student_streaks', 'student_review_queue', 'student_vocabulary_progress',
        'password_reset_codes', 'student_email_links', 'announcement_reads',
        'desmos_usage_events'
      ]

      for (const table of tables) {
        await supabaseAdmin.from(table).delete().eq('student_account_id', accountId)
      }

      await supabaseAdmin.from('student_accounts').delete().eq('id', accountId)
    }

    // Null out SMS history references (preserve history, don't delete logs)
    await supabaseAdmin.from('sms_logs').update({ student_id: null }).eq('student_id', studentId)
    await supabaseAdmin.from('sms_inbox').update({ matched_student_id: null }).eq('matched_student_id', studentId)

    await supabaseAdmin.from('attendance').delete().eq('student_id', studentId)
    await supabaseAdmin.from('homework').delete().eq('student_id', studentId)
    await supabaseAdmin.from('practice_tests').delete().eq('student_id', studentId)
    await supabaseAdmin.from('student_notes').delete().eq('student_id', studentId)
    await supabaseAdmin.from('closing_report_tokens').delete().eq('student_id', studentId)
    await supabaseAdmin.from('student_nudges').delete().eq('student_id', studentId)
    await supabaseAdmin.from('intense_prep_members').delete().eq('student_id', studentId)

    const { error } = await supabaseAdmin.from('students').delete().eq('id', studentId)

    if (error) {
      throw new Error(`Failed to delete student: ${error.message}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error('Error deleting student:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
