import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { student_account_id } = await req.json();
    if (!student_account_id || typeof student_account_id !== "string") {
      return new Response(JSON.stringify({ error: "student_account_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "missing bearer token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the (Google-issued) session token and pull email from auth.users
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user?.email) {
      return new Response(JSON.stringify({ error: "invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const email = user.email.toLowerCase();
    const googleSub = (user.user_metadata as any)?.sub
      ?? (user.identities?.find((i: any) => i.provider === "google")?.id ?? null);

    const { error: upsertErr } = await admin
      .from("student_email_links")
      .upsert({
        student_account_id,
        email,
        google_sub: googleSub,
        linked_at: new Date().toISOString(),
        unsubscribed_at: null,
      }, { onConflict: "student_account_id" });

    if (upsertErr) {
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("student_accounts")
      .update({ email_link_prompted_at: new Date().toISOString() })
      .eq("id", student_account_id);

    // Sign the user out of the Supabase auth session so the student session
    // (phone/password in localStorage) remains the primary identity.
    try { await userClient.auth.signOut(); } catch { /* ignore */ }

    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
