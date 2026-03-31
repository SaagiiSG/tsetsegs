import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// SAT Math skill -> category mapping
const skillToCategoryMap: Record<string, string> = {
  "linear equations in one variable": "algebra",
  "linear equations in two variables": "algebra",
  "linear functions": "algebra",
  "linear inequalities in one or two variables": "algebra",
  "linear inequalities": "algebra",
  "systems of two linear equations in two variables": "algebra",
  "systems of linear equations": "algebra",
  "equivalent expressions": "advanced math",
  "nonlinear equations in one variable and systems of equations in two variables": "advanced math",
  "nonlinear functions": "advanced math",
  "nonlinear equations": "advanced math",
  "quadratic equations": "advanced math",
  "polynomial factors and graphs": "advanced math",
  "quadratic and exponential word problems": "advanced math",
  "solving quadratic equations": "advanced math",
  "functions": "advanced math",
  "parabolas and vertex form": "advanced math",
  "area and volume": "geometry and trigonometry",
  "lines, angles, and triangles": "geometry and trigonometry",
  "right triangles and trigonometry": "geometry and trigonometry",
  "circles": "geometry and trigonometry",
  "ratios, rates, proportional relationships, and units": "data analysis and problem solving",
  "percentages": "data analysis and problem solving",
  "one-variable data: distributions and measures of center and spread": "data analysis and problem solving",
  "two-variable data: models and scatterplots": "data analysis and problem solving",
  "probability and conditional probability": "data analysis and problem solving",
  "inference from sample statistics and margin of error": "data analysis and problem solving",
  "evaluating statistical claims: observational studies and experiments": "data analysis and problem solving",
  "interpreting data": "data analysis and problem solving",
  "interpreting relationships in tables and graphs": "data analysis and problem solving",
  "interpreting relationships shown by data": "data analysis and problem solving",
  "central ideas and details": "information and ideas",
  "inferences": "information and ideas",
  "command of evidence": "information and ideas",
  "words in context": "craft and structure",
  "text structure and purpose": "craft and structure",
  "cross-text connections": "craft and structure",
  "rhetorical synthesis": "expression of ideas",
  "transitions": "expression of ideas",
  "boundaries": "standard english conventions",
  "form, structure, and sense": "standard english conventions",
};

const categorySkillMap: Record<string, string[]> = {
  algebra: [
    "linear equations in one variable", "linear equations in two variables",
    "linear functions", "systems of two linear equations in two variables",
    "linear inequalities in one or two variables",
  ],
  advanced_math: [
    "equivalent expressions", "nonlinear equations in one variable and systems of equations in two variables",
    "nonlinear functions",
  ],
  problem_solving: [
    "ratios, rates, proportional relationships, and units",
    "percentages", "one-variable data: distributions and measures of center and spread",
    "two-variable data: models and scatterplots", "probability and conditional probability",
    "inference from sample statistics and margin of error",
    "evaluating statistical claims: observational studies and experiments",
  ],
  geometry: [
    "area and volume", "lines, angles, and triangles",
    "right triangles and trigonometry", "circles",
  ],
};

function getCategoryId(
  skill: string | null,
  subtopic: string | null,
  categoryMap: Record<string, string>
): string | null {
  const lookups = [skill, subtopic].filter(Boolean) as string[];
  for (const val of lookups) {
    const lower = val.toLowerCase().trim();
    const catName = skillToCategoryMap[lower];
    if (catName && categoryMap[catName]) {
      return categoryMap[catName];
    }
  }
  return null;
}

function normalizeQuestion(q: any, categoryMap: Record<string, string>) {
  const rawDifficulty = (q.difficulty_level || '').toString().toLowerCase().trim();
  const normalizedDifficulty = ['easy', 'medium', 'hard'].includes(rawDifficulty) ? rawDifficulty : null;

  const rawType = (q.question_type || '').toString().toLowerCase().trim();
  const normalizedType = rawType === 'multiple_choice' ? 'multiple_choice'
    : ['fill_blank', 'fill_in_blank', 'grid_in', 'free_response', 'student_produced', 'numeric', 'spr'].includes(rawType) ? 'fill_blank'
    : rawType.includes('choice') ? 'multiple_choice'
    : 'multiple_choice';

  const categoryId = getCategoryId(q.skill as string | null, q.subtopic as string | null, categoryMap);
  const cbId = q.original_cb_id as string | null;

  return {
    question_text: q.question_text,
    answer: q.answer,
    multiple_choice_options: q.multiple_choice_options,
    difficulty_level: normalizedDifficulty,
    subject: q.subject || "math",
    question_type: normalizedType,
    rationale: q.rationale,
    passage_text: q.passage_text,
    original_cb_id: cbId || `ext_${q.question_id}`,
    question_set: q.question_set || "External",
    subtopic: q.subtopic,
    alternate_answers: q.alternate_answers,
    question_image_url: q.question_image_url,
    choice_images: q.choice_images,
    video_url: q.video_url,
    skill: q.skill,
    has_figure: q.has_figure,
    figure_type: q.figure_type,
    figure_description: q.figure_description,
    figure_svg: q.figure_svg,
    is_original: true,
    is_active: true,
    category_id: categoryId,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { subject, since_date, dry_run = false, category, offset = 0, limit = 100, question_set } = body;

    // Clamp limit to prevent abuse
    const safeLimit = Math.min(Math.max(limit, 1), 200);

    const externalUrl = Deno.env.get("EXTERNAL_DB_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_KEY");
    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: "External DB credentials not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalClient = createClient(externalUrl, externalKey);

    // Build query with offset/limit pagination
    let query = externalClient
      .from("questions")
      .select("question_id, question_text, answer, multiple_choice_options, difficulty_level, subject, question_type, rationale, passage_text, original_cb_id, question_set, subtopic, alternate_answers, question_image_url, choice_images, video_url, skill, has_figure, figure_type, figure_description, figure_svg")
      .eq("is_active", true)
      .eq("is_original", true)
      .order("created_at", { ascending: true })
      .range(offset, offset + safeLimit - 1);

    if (subject) query = query.eq("subject", subject);
    if (since_date) query = query.gt("created_at", since_date);

    const { data: externalQuestions, error: extError } = await query;

    if (extError) {
      return new Response(
        JSON.stringify({ error: `External DB query failed: ${extError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter by math category if specified
    let filteredQuestions = externalQuestions || [];
    if (category && categorySkillMap[category]) {
      const allowedSkills = categorySkillMap[category];
      filteredQuestions = filteredQuestions.filter((q: any) =>
        q.skill && allowedSkills.includes(q.skill.toLowerCase())
      );
    }

    const hasMore = (externalQuestions || []).length === safeLimit;

    if (filteredQuestions.length === 0) {
      return new Response(
        JSON.stringify({ preview: dry_run, total_found: 0, sample: [], message: "No questions found matching filters.", has_more: hasMore, next_offset: offset + safeLimit }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({
          preview: true,
          total_found: filteredQuestions.length,
          has_more: hasMore,
          next_offset: offset + safeLimit,
          sample: filteredQuestions.map((q) => ({
            question_id: q.question_id, subject: q.subject, difficulty_level: q.difficulty_level,
            question_type: q.question_type, skill: q.skill, question_text: q.question_text,
            answer: q.answer, multiple_choice_options: q.multiple_choice_options,
            choice_images: q.choice_images, passage_text: q.passage_text,
            question_image_url: q.question_image_url, rationale: q.rationale,
            subtopic: q.subtopic, alternate_answers: q.alternate_answers,
            has_figure: q.has_figure, figure_type: q.figure_type,
            figure_description: q.figure_description, original_cb_id: q.original_cb_id,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for inserts
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch category IDs
    const { data: categories } = await adminClient.from("question_categories").select("id, name");
    const categoryMap: Record<string, string> = {};
    for (const cat of categories || []) {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    }

    // Get existing question IDs for dedup
    const { data: existingQuestions } = await adminClient
      .from("questions")
      .select("id, question_id, original_cb_id");

    const existingQIds = new Map((existingQuestions || []).map((q) => [q.question_id, q.id]));
    const existingCbIds = new Map(
      (existingQuestions || []).filter((q) => q.original_cb_id).map((q) => [q.original_cb_id!, q.id])
    );

    // Find highest EXT number
    const extIds = (existingQuestions || [])
      .map((q) => q.question_id)
      .filter((id: string) => id.startsWith("EXT"))
      .map((id: string) => parseInt(id.replace("EXT", ""), 10))
      .filter((n: number) => !isNaN(n));
    let nextExtNum = extIds.length > 0 ? Math.max(...extIds) + 1 : 1;

    let imported = 0, skipped = 0, errors = 0;
    const errorDetails: string[] = [];

    // Process in batches of 25
    const BATCH_SIZE = 25;
    for (let i = 0; i < filteredQuestions.length; i += BATCH_SIZE) {
      const batch = filteredQuestions.slice(i, i + BATCH_SIZE);

      const toInsert: any[] = [];

      for (const q of batch) {
        const cbId = q.original_cb_id as string | null;
        const qId = q.question_id as string;

        const existingId = (cbId && existingCbIds.has(cbId))
          ? existingCbIds.get(cbId)!
          : existingQIds.has(qId) ? existingQIds.get(qId)! : null;

        if (existingId) {
          skipped++;
        } else {
          const questionData = normalizeQuestion(q, categoryMap);
          const newQuestionId = `EXT${String(nextExtNum).padStart(4, "0")}`;
          nextExtNum++;
          toInsert.push({ ...questionData, question_id: newQuestionId });
        }
      }

      // Batch insert
      if (toInsert.length > 0) {
        const { error: insertError, data: insertedData } = await adminClient
          .from("questions")
          .insert(toInsert)
          .select("question_id, id, original_cb_id");

        if (insertError) {
          errors += toInsert.length;
          errorDetails.push(`batch insert: ${insertError.message}`);
        } else {
          imported += toInsert.length;
          for (const row of insertedData || []) {
            existingQIds.set(row.question_id, row.id);
            if (row.original_cb_id) existingCbIds.set(row.original_cb_id, row.id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_found: filteredQuestions.length,
        imported,
        skipped,
        errors,
        has_more: hasMore,
        next_offset: offset + safeLimit,
        error_details: errorDetails.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
