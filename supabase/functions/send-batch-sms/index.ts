import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';

function isOnlineClass(schedule: string | null | undefined): boolean {
  return !!schedule && /online/i.test(schedule);
}

function getBatchSmsTemplate(batch: any): string {
  const batchLink = `https://flowersos.co/batch/${batch.unique_link_id}`;
  if (batch.course_type === 'IELTS') {
    return `Сайн байна уу? \n\nTsetsegs IELTS сургалтаас холбогдож байна. \n\nАнгийн мэдээлэл: ${batchLink}\n\nТус групт\n1. Бидний хэрэглэх ном (Google drive дотор)\n2. Цээжлэх үгс (Google drive дотор)\n3. ЭЕШ-д бэлдэх Англи хэл, Нийгмийн 700+ материал\n4. Сургалтын төлөвлөгөө зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nБаярлалаа.`;
  }
  if (isOnlineClass(batch.schedule)) {
    return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.\n\n🌐 ONLINE CLASS\n\nClass Info: ${batchLink}\n\nХичээлийн хуваарь:\nMath (Online): Даваа/Лхагва/Баасан 18:40-20:30\nEnglish (үнэгүй): Бямба 18:30-20:00\n\nPlatform: Discord\n\nТус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nТанилцах уулзалтанд тавтай морилно уу!\n\nБаярлалаа.\nУтас: 80660314, 88559876`;
  }
  return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.\n\nClass Info: ${batchLink}\n\nТус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nТанилцах уулзалтанд тавтай морилно уу!\n\nБаярлалаа.\nХаяг: Их Наяд Зүүн Өндөр 1114, ${batch.room} тоот\nУтас: 80660314, 88559876`;
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^0-9]/g, '');
  if (digits.length > 8 && digits.startsWith('976')) digits = digits.slice(3);
  if (digits.length !== 8) return null;
  return `+976${digits}`;
}

function estimateSegments(body: string): number {
  const isUcs2 = /[^\u0000-\u007F]/.test(body);
  const len = body.length;
  if (isUcs2) return len <= 70 ? 1 : Math.ceil(len / 67);
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub;

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const batchId: string | undefined = body?.batch_id;
    const dryRun: boolean = !!body?.dry_run;
    if (!batchId || typeof batchId !== 'string') {
      return new Response(JSON.stringify({ error: 'batch_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: batch, error: batchErr } = await admin.from('batches').select('*').eq('id', batchId).single();
    if (batchErr || !batch) {
      return new Response(JSON.stringify({ error: 'Batch not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: students } = await admin.from('students').select('id, name, phone').eq('batch_id', batchId);
    const recipients = (students ?? []).map((s) => ({
      id: s.id, name: s.name, raw: s.phone, phone: normalizePhone(s.phone),
    }));

    const template = getBatchSmsTemplate(batch);
    const segments = estimateSegments(template);
    const valid = recipients.filter((r) => r.phone);
    const invalid = recipients.filter((r) => !r.phone);

    if (dryRun) {
      return new Response(JSON.stringify({
        dry_run: true, template, segments, total: recipients.length,
        valid: valid.length, invalid: invalid.length,
        estimated_cost_usd: +(segments * valid.length * 0.0808).toFixed(2),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const TWILIO_API_KEY = Deno.env.get('TWILIO_API_KEY');
    const MSID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !MSID) {
      return new Response(JSON.stringify({ error: 'Twilio not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];
    let sent = 0, failed = 0;

    for (const r of valid) {
      try {
        const form = new URLSearchParams({
          To: r.phone!, MessagingServiceSid: MSID, Body: template,
        });
        const resp = await fetch(`${GATEWAY_URL}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'X-Connection-Api-Key': TWILIO_API_KEY,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        });
        const text = await resp.text();
        let json: any = {}; try { json = JSON.parse(text); } catch {}
        const ok = resp.ok && !json.error_code;
        if (ok) sent++; else failed++;

        await admin.from('sms_logs').insert({
          kind: 'batch_intro',
          recipient_role: 'student',
          to_phone: r.phone!,
          body: template,
          student_id: r.id,
          batch_id: batchId,
          status: ok ? 'sent' : 'failed',
          twilio_sid: json?.sid ?? null,
          twilio_status: json?.status ?? (ok ? 'queued' : 'failed'),
          error: ok ? null : (json?.message ?? text?.slice(0, 500) ?? `HTTP ${resp.status}`),
        });

        results.push({
          student_id: r.id, name: r.name, phone: r.phone,
          ok, error: ok ? null : (json?.message ?? `HTTP ${resp.status}`),
        });
      } catch (e: any) {
        failed++;
        results.push({ student_id: r.id, name: r.name, phone: r.phone, ok: false, error: e?.message ?? 'unknown' });
      }
    }

    for (const r of invalid) {
      results.push({ student_id: r.id, name: r.name, phone: r.raw, ok: false, error: 'Invalid phone' });
    }

    return new Response(JSON.stringify({
      sent, failed, skipped: invalid.length, total: recipients.length, results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
