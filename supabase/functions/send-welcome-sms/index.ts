import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface Body {
  student_id: string;
}

const LOGIN_URL = 'https://flowersos.co/login';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { student_id } = (await req.json()) as Body;
    if (!student_id) {
      return new Response(JSON.stringify({ error: 'Missing student_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: student, error } = await supabase
      .from('students')
      .select('id, first_name, phone, batch_id')
      .eq('id', student_id)
      .single();
    if (error || !student) throw error || new Error('Student not found');

    const phone = (student.phone || '').trim();
    if (!phone) {
      return new Response(JSON.stringify({ skipped: 'no phone' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const name = student.first_name || '';
    const body = `Сайн байна уу ${name}! Цэцэгс сургалтын төв тавтай морилно уу. Та сурагчийн хувийн булангаа ${LOGIN_URL} холбоосоор нэвтэрч ашиглаарай. Холбоо барих утас: ${phone}.`;

    const smsRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          to: phone,
          body,
          kind: 'welcome',
          recipient_role: 'student',
          student_id,
          batch_id: student.batch_id,
          dedupe_key: `welcome:${student_id}`,
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
    console.error('send-welcome-sms error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
