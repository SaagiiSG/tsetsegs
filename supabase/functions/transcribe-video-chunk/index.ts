import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: 'Not signed in' }, 401);
    const { data: isAdmin } = await sb.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'Admins only' }, 403);

    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) return json({ error: 'AI is not configured' }, 500);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) return json({ error: 'Missing audio' }, 400);
    if (file.size > 20 * 1024 * 1024) return json({ error: 'Audio chunk too large' }, 400);

    const fd = new FormData();
    fd.append('file', new File([await file.arrayBuffer()], 'chunk.wav', { type: 'audio/wav' }));
    fd.append('model', 'openai/gpt-transcribe');
    fd.append('prompt', 'SAT math concept lesson. Terms: Desmos, quadratic, discriminant, asymptote, vertex, slope, intercept.');

    const r = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: fd,
    });
    const body = await r.text();
    if (!r.ok) {
      console.error(`transcribe failed [${r.status}]: ${body}`);
      let msg = body;
      try { msg = JSON.parse(body)?.error?.message ?? JSON.parse(body)?.message ?? body; } catch { /* keep */ }
      return json({ error: msg, status: r.status }, r.status);
    }
    const parsed = JSON.parse(body);
    return json({ text: (parsed.text ?? '').trim() });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
