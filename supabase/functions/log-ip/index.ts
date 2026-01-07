import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client IP from various headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    
    const clientIp = cfConnectingIp || (forwardedFor?.split(",")[0].trim()) || realIp || "unknown";

    const { student_account_id, activity_type } = await req.json();

    if (!student_account_id) {
      return new Response(
        JSON.stringify({ error: "student_account_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the activity with IP
    const { error: logError } = await supabase
      .from("student_activity_logs")
      .insert({
        student_account_id,
        activity_type: activity_type || "ip_logged",
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
      // Get unique IPs from last 20 activities
      const uniqueIps = [...new Set(recentIps.map(r => r.ip_address))];
      
      // If more than 3 different IPs in recent activity, flag as suspicious
      if (uniqueIps.length > 3) {
        await supabase.from("security_alerts").insert({
          student_account_id,
          alert_type: "multiple_ips",
          severity: "medium",
          metadata: {
            unique_ips: uniqueIps,
            current_ip: clientIp,
          }
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ip: clientIp,
        logged: !logError 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});