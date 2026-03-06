import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const { subject, since_date, dry_run = false } = body;

    // Connect to external DB
    const externalDbUrl = Deno.env.get("EXTERNAL_DB_URL");
    if (!externalDbUrl) {
      return new Response(
        JSON.stringify({ error: "EXTERNAL_DB_URL secret not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const externalClient = new Client(externalDbUrl);
    await externalClient.connect();

    // Build query with optional filters
    let whereClause = "WHERE is_active = true AND is_original = true";
    const params: unknown[] = [];
    let paramIdx = 1;

    if (subject) {
      whereClause += ` AND subject = $${paramIdx}`;
      params.push(subject);
      paramIdx++;
    }
    if (since_date) {
      whereClause += ` AND created_at > $${paramIdx}`;
      params.push(since_date);
      paramIdx++;
    }

    const query = `
      SELECT 
        question_id, question_text, answer, multiple_choice_options, 
        difficulty_level, subject, question_type, rationale, passage_text,
        original_cb_id, question_set, subtopic, alternate_answers,
        question_image_url, choice_images, video_url, category_id
      FROM questions 
      ${whereClause}
      ORDER BY created_at ASC
    `;

    const result = await externalClient.queryObject(query, params);
    const externalQuestions = result.rows as Record<string, unknown>[];

    await externalClient.end();

    if (dry_run) {
      return new Response(
        JSON.stringify({
          preview: true,
          total_found: externalQuestions.length,
          sample: externalQuestions.slice(0, 5).map((q) => ({
            question_id: q.question_id,
            subject: q.subject,
            question_text:
              String(q.question_text || "").substring(0, 100) + "...",
          })),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Use service role client for inserts
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get existing question IDs and original_cb_ids to skip duplicates
    const { data: existingQuestions } = await adminClient
      .from("questions")
      .select("question_id, original_cb_id");

    const existingQIds = new Set(
      (existingQuestions || []).map((q) => q.question_id)
    );
    const existingCbIds = new Set(
      (existingQuestions || [])
        .map((q) => q.original_cb_id)
        .filter(Boolean)
    );

    // Find the highest EXT number for sequential IDs
    const extIds = (existingQuestions || [])
      .map((q) => q.question_id)
      .filter((id: string) => id.startsWith("EXT"))
      .map((id: string) => parseInt(id.replace("EXT", ""), 10))
      .filter((n: number) => !isNaN(n));
    let nextExtNum = extIds.length > 0 ? Math.max(...extIds) + 1 : 1;

    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const q of externalQuestions) {
      // Skip if we already have this question
      const cbId = q.original_cb_id as string | null;
      const qId = q.question_id as string;

      if (cbId && existingCbIds.has(cbId)) {
        skipped++;
        continue;
      }
      if (existingQIds.has(qId)) {
        skipped++;
        continue;
      }

      // Generate new question_id
      const newQuestionId = `EXT${String(nextExtNum).padStart(4, "0")}`;
      nextExtNum++;

      const insertData: Record<string, unknown> = {
        question_id: newQuestionId,
        question_text: q.question_text,
        answer: q.answer,
        multiple_choice_options: q.multiple_choice_options,
        difficulty_level: q.difficulty_level,
        subject: q.subject || "math",
        question_type: q.question_type || "multiple_choice",
        rationale: q.rationale,
        passage_text: q.passage_text,
        original_cb_id: cbId || `ext_${qId}`,
        question_set: q.question_set || "External",
        subtopic: q.subtopic,
        alternate_answers: q.alternate_answers,
        question_image_url: q.question_image_url,
        choice_images: q.choice_images,
        video_url: q.video_url,
        is_original: true,
        is_active: true,
      };

      const { error: insertError } = await adminClient
        .from("questions")
        .insert(insertData);

      if (insertError) {
        errors++;
        errorDetails.push(
          `${qId}: ${insertError.message}`
        );
      } else {
        imported++;
        existingQIds.add(newQuestionId);
        if (cbId) existingCbIds.add(cbId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_found: externalQuestions.length,
        imported,
        skipped,
        errors,
        error_details: errorDetails.slice(0, 10),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
