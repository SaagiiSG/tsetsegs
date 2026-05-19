import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function render(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

function tomorrowUB(): string {
  const now = new Date();
  // Add 1 day, format as YYYY-MM-DD in Asia/Ulaanbaatar
  const ub = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ulaanbaatar' }));
  ub.setDate(ub.getDate() + 1);
  const y = ub.getFullYear();
  const m = String(ub.getMonth() + 1).padStart(2, '0');
  const d = String(ub.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: flow } = await supabase.from('sms_flows').select('enabled, template_mn, recipient_role').eq('key', 'batch_start').maybeSingle();
    if (!flow || !flow.enabled) return new Response(JSON.stringify({ skipped: 'flow disabled' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const tomorrow = tomorrowUB();
    const { data: batches, error: bErr } = await supabase.from('batches').select('id, name, start_date').eq('start_date', tomorrow);
    if (bErr) throw bErr;

    let sent = 0;
    for (const b of batches ?? []) {
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, parent_phone, batch_id')
        .eq('batch_id', b.id);

      for (const s of students ?? []) {
        const target = flow.recipient_role === 'parent' ? (s.parent_phone || s.phone) : s.phone;
        if (!target) continue;
        const name = `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim();
        const body = render(flow.template_mn, { name, batch: b.name ?? '', date: b.start_date ?? '' });

        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
          body: JSON.stringify({
            to: target, body, kind: 'batch_start', recipient_role: flow.recipient_role,
            student_id: s.id, batch_id: b.id,
            dedupe_key: `batch_start:${b.id}:${s.id}:${b.start_date}`,
          }),
        });
        sent++;
      }
    }

    await supabase.from('sms_flows').update({ last_fired_at: new Date().toISOString(), sent_count: (sent ? undefined : undefined) }).eq('key', 'batch_start');
    // Increment sent_count via raw
    if (sent > 0) {
      await supabase.rpc('exec_increment_flow_count', { p_key: 'batch_start', p_n: sent }).catch(() => {});
    }

    return new Response(JSON.stringify({ batches: batches?.length ?? 0, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('send-batch-start-reminder error:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
