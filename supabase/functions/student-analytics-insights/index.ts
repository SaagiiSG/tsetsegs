// AI study coach for center students: turns a compact stats summary into a short, actionable plan.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Please sign in again." }, 401);
    if (user.email?.endsWith("@demo.flowersos.co")) return json({ error: "Turned off in the demo." }, 403);

    const { stats } = await req.json();
    if (!stats || typeof stats !== "object") return json({ error: "Missing stats" }, 400);
    const summary = JSON.stringify(stats).slice(0, 6000);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "AI is not configured" }, 500);

    const r = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You are a concise SAT study coach. Using ONLY the student's stats, write: 1) one-sentence overall read, 2) top 3 priorities as short bullets with a concrete weekly target each, 3) one encouraging line. Plain markdown, under 150 words. Never invent numbers. If there is little data, say so and suggest how to start.",
        input: `Student stats (JSON): ${summary}`,
      }),
    });
    if (!r.ok || !r.body) {
      const t = await r.text().catch(() => "");
      let msg = "AI insights are unavailable right now.";
      try { msg = JSON.parse(t)?.error?.message ?? JSON.parse(t)?.message ?? msg; } catch { /* keep default */ }
      return json({ error: msg }, r.status);
    }

    // Convert SSE into a plain text stream of output deltas.
    const enc = new TextEncoder(), dec = new TextDecoder();
    const out = new ReadableStream({
      async start(ctrl) {
        const reader = r.body!.getReader(); let buf = "";
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n"); buf = lines.pop() ?? "";
          for (const l of lines) {
            if (!l.startsWith("data:")) continue;
            try { const e = JSON.parse(l.slice(5).trim()); if (e.type === "response.output_text.delta" && e.delta) ctrl.enqueue(enc.encode(e.delta)); } catch { /* ignore */ }
          }
        }
        ctrl.close();
      },
    });
    const h: Record<string, string> = { ...cors, "Content-Type": "text/plain; charset=utf-8" };
    const run = r.headers.get("X-Lovable-AIG-Run-ID"); if (run) h["X-Lovable-AIG-Run-ID"] = run;
    return new Response(out, { headers: h });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
