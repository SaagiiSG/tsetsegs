// Twilio inbound SMS webhook. Configure Twilio number's "A MESSAGE COMES IN" to:
// https://plfaixcjzrhpaxfhfstd.supabase.co/functions/v1/receive-sms  (HTTP POST)
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

function normalize(p: string) {
  const d = (p || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (/^976\d{8}$/.test(d)) return '+' + d;
  if (/^\d{8}$/.test(d)) return '+976' + d;
  if (/^\d{10}$/.test(d)) return '+1' + d;
  return d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const ct = req.headers.get('content-type') || '';
    let params: Record<string, string> = {};
    if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
      const form = await req.formData();
      form.forEach((v, k) => { params[k] = String(v); });
    } else {
      params = await req.json().catch(() => ({}));
    }

    const from = normalize(params.From || '');
    const to = normalize(params.To || '');
    const body = params.Body || '';
    const sid = params.MessageSid || params.SmsSid || null;
    const numMedia = parseInt(params.NumMedia || '0', 10) || 0;
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const u = params[`MediaUrl${i}`];
      if (u) mediaUrls.push(u);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Match student by phone (parent_phone, phone variants)
    let matched_student_id: string | null = null;
    let matched_role: 'parent' | 'student' | 'unknown' = 'unknown';
    const bare = from.replace(/^\+976/, '').replace(/^\+/, '');

    const { data: parentMatch } = await supabase
      .from('students')
      .select('id')
      .or(`parent_phone.eq.${from},parent_phone.eq.${bare}`)
      .limit(1)
      .maybeSingle();
    if (parentMatch) {
      matched_student_id = parentMatch.id;
      matched_role = 'parent';
    } else {
      const { data: stuMatch } = await supabase
        .from('students')
        .select('id')
        .or(`phone.eq.${from},phone.eq.${bare}`)
        .limit(1)
        .maybeSingle();
      if (stuMatch) {
        matched_student_id = stuMatch.id;
        matched_role = 'student';
      }
    }

    await supabase.from('sms_inbox').insert({
      twilio_sid: sid,
      from_phone: from,
      to_phone: to,
      body,
      num_media: numMedia,
      media_urls: mediaUrls.length ? mediaUrls : null,
      matched_student_id,
      matched_role,
      raw: params,
    });

    // Empty TwiML so Twilio doesn't auto-reply
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('receive-sms error:', err);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
    });
  }
});
