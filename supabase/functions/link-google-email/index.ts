import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders as sdkCorsHeaders } from '../_shared/cors.ts'

const corsHeaders = {
  ...sdkCorsHeaders,
  "Access-Control-Allow-Headers": `${sdkCorsHeaders['Access-Control-Allow-Headers']}, x-student-session-id, x-student-token`,
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error('Service configuration unavailable');

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

    const googleIdentity = user.identities?.find((identity) => identity.provider === 'google');
    const googleSub = googleIdentity?.identity_data?.sub ?? googleIdentity?.id;
    if (!googleSub || typeof googleSub !== 'string') {
      return new Response(JSON.stringify({ error: 'Please connect using a Google account' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);

    // Ownership check: caller must present an active student session for the target account
    const sessionId = req.headers.get('x-student-session-id') ?? '';
    const studentToken = req.headers.get('x-student-token') ?? '';
    if (!sessionId || !studentToken) {
      return new Response(JSON.stringify({ error: 'missing student session' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(studentToken));
    const tokenHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    const { data: session } = await admin
      .from('student_sessions')
      .select('student_account_id, is_active, expires_at')
      .eq('id', sessionId)
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (!session || !session.is_active || new Date(session.expires_at as string) < new Date() || session.student_account_id !== student_account_id) {
      return new Response(JSON.stringify({ error: 'session does not own this account' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email.toLowerCase();

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

    // The browser cleans up only its borrowed Google session after unlocking.

    return new Response(JSON.stringify({ ok: true, email }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
