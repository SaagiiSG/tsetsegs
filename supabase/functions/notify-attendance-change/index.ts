import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  student_id: string;
  batch_id: string;
  session_number: number;
  status: 'absent' | 'sick' | 'excused';
}

function mongolianDate(d: Date): string {
  // YYYY/MM/DD in Ulaanbaatar time
  const ub = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Ulaanbaatar' }));
  const y = ub.getFullYear();
  const m = String(ub.getMonth() + 1).padStart(2, '0');
  const day = String(ub.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function buildMessage(name: string, status: string, dateStr: string): string {
  const prefix = `Сайн байна уу? Цэцэгс сургалтын төвөөс холбогдож байна.`;
  if (status === 'absent') {
    return `${prefix} ${name} ${dateStr}-ний хичээлд ирээгүй байна. Холбогдоно уу. Баярлалаа.`;
  }
  if (status === 'sick') {
    return `${prefix} ${name} ${dateStr}-ний хичээлээс өвчтэй гэсэн шалтгаанаар чөлөө авсан байна аа. Баярлалаа.`;
  }
  // excused
  return `${prefix} ${name} ${dateStr}-ний хичээлээс чөлөө авсан байна аа. Баярлалаа.`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { student_id, batch_id, session_number, status } = (await req.json()) as Body;
    if (!student_id || !session_number || !status) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['absent', 'sick', 'excused'].includes(status)) {
      return new Response(JSON.stringify({ skipped: 'status not notifiable' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: student, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, parent_phone, phone')
      .eq('id', student_id)
      .single();
    if (error || !student) throw error || new Error('Student not found');

    const parentPhone = (student.parent_phone || '').trim();
    if (!parentPhone) {
      console.log(`[notify-attendance-change] student ${student_id} has no parent_phone, skipping`);
      return new Response(JSON.stringify({ skipped: 'no parent_phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim();
    const dateStr = mongolianDate(new Date());
    const body = buildMessage(name, status, dateStr);
    const dedupe = `absence:${student_id}:${session_number}:${status}`;

    const smsRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          to: parentPhone,
          body,
          kind: 'absence',
          recipient_role: 'parent',
          student_id,
          batch_id,
          session_number,
          status,
          dedupe_key: dedupe,
        }),
      },
    );
    const result = await smsRes.json();

    return new Response(JSON.stringify(result), {
      status: smsRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('notify-attendance-change error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
