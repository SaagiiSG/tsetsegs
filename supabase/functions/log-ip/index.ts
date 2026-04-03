import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const bodySchema = z.object({
  student_account_id: z.string().uuid(),
  activity_type: z.string().min(1).max(100).optional().default('ip_logged'),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate input
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { student_account_id, activity_type } = parsed.data;

    // Verify student account exists
    const { data: account } = await supabase
      .from('student_accounts')
      .select('id')
      .eq('id', student_account_id)
      .maybeSingle();

    if (!account) {
      return new Response(
        JSON.stringify({ error: "Invalid student account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    const clientIp = cfConnectingIp || (forwardedFor?.split(",")[0].trim()) || realIp || "unknown";

    // Log the activity with IP
    const { error: logError } = await supabase
      .from("student_activity_logs")
      .insert({
        student_account_id,
        activity_type,
        ip_address: clientIp,
        metadata: {
          user_agent: req.headers.get("user-agent"),
          timestamp: new Date().toISOString(),
        }
      });

    if (logError) {
      console.error("Error logging activity:", logError);
    }

    // Check for unusual IP patterns
    const { data: recentIps, error: fetchError } = await supabase
      .from("student_activity_logs")
      .select("ip_address, created_at")
      .eq("student_account_id", student_account_id)
      .not("ip_address", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!fetchError && recentIps) {
      const uniqueIps = [...new Set(recentIps.map(r => r.ip_address))];
      if (uniqueIps.length > 3) {
        await supabase.from("security_alerts").insert({
          student_account_id,
          alert_type: "multiple_ips",
          severity: "medium",
          metadata: { unique_ips: uniqueIps, current_ip: clientIp }
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, ip: clientIp, logged: !logError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
