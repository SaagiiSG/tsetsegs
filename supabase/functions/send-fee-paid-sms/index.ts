import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body { student_id: string }

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { student_id } = (await req.json()) as Body;
    if (!student_id) return new Response(JSON.stringify({ error: 'Missing student_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: flow } = await supabase.from('sms_flows').select('enabled, template_mn, recipient_role').eq('key', 'fee_paid').maybeSingle();
    if (!flow || !flow.enabled) return new Response(JSON.stringify({ skipped: 'flow disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: student, error } = await supabase.from('students').select('id, first_name, last_name, phone, parent_phone, batch_id, fee_paid_at').eq('id', student_id).single();
    if (error || !student) throw error || new Error('Student not found');

    const target = flow.recipient_role === 'parent' ? (student.parent_phone || student.phone) : student.phone;
    if (!target) return new Response(JSON.stringify({ skipped: 'no phone' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim();
    const body = render(flow.template_mn, { name });

    const smsRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({
        to: target, body, kind: 'fee_paid', recipient_role: flow.recipient_role,
        student_id, batch_id: student.batch_id,
        dedupe_key: `fee_paid:${student_id}:${student.fee_paid_at ?? ''}`,
      }),
    });
    return new Response(await smsRes.text(), { status: smsRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('send-fee-paid-sms error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
