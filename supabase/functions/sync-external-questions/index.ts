import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const { subject, since_date, dry_run = false, category } = body;

    // Connect to external Supabase project via REST API
    const externalUrl = Deno.env.get("EXTERNAL_DB_URL");
    const externalKey = Deno.env.get("EXTERNAL_SUPABASE_KEY");
    if (!externalUrl || !externalKey) {
      return new Response(
        JSON.stringify({ error: "External DB credentials not configured. Need EXTERNAL_DB_URL and EXTERNAL_SUPABASE_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const externalClient = createClient(externalUrl, externalKey);

    // Build query with filters
    let query = externalClient
      .from("questions")
      .select("question_id, question_text, answer, multiple_choice_options, difficulty_level, subject, question_type, rationale, passage_text, original_cb_id, question_set, subtopic, alternate_answers, question_image_url, choice_images, video_url, skill, has_figure, figure_type, figure_description, figure_svg")
      .eq("is_active", true)
      .eq("is_original", true)
      .order("created_at", { ascending: true })
      .limit(1000);

    if (subject) {
      query = query.eq("subject", subject);
    }
    if (since_date) {
      query = query.gt("created_at", since_date);
    }

    const { data: externalQuestions, error: extError } = await query;

    if (extError) {
      return new Response(
        JSON.stringify({ error: `External DB query failed: ${extError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter by math category if specified
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

    let filteredQuestions = externalQuestions || [];
    if (category && categorySkillMap[category]) {
      const allowedSkills = categorySkillMap[category];
      filteredQuestions = filteredQuestions.filter((q: any) =>
        q.skill && allowedSkills.includes(q.skill.toLowerCase())
      );
    }

    if (filteredQuestions.length === 0) {
      return new Response(
        JSON.stringify({ preview: dry_run, total_found: 0, sample: [], message: "No questions found matching filters." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (dry_run) {
      return new Response(
        JSON.stringify({
          preview: true,
          total_found: filteredQuestions.length,
          sample: filteredQuestions.map((q) => ({
            question_id: q.question_id,
            subject: q.subject,
            difficulty_level: q.difficulty_level,
            question_type: q.question_type,
            skill: q.skill,
            question_text: q.question_text,
            answer: q.answer,
            multiple_choice_options: q.multiple_choice_options,
            choice_images: q.choice_images,
            passage_text: q.passage_text,
            question_image_url: q.question_image_url,
            rationale: q.rationale,
            subtopic: q.subtopic,
            alternate_answers: q.alternate_answers,
            has_figure: q.has_figure,
            figure_type: q.figure_type,
            figure_description: q.figure_description,
            original_cb_id: q.original_cb_id,
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for inserts into local DB
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch category IDs for mapping skills to categories
    const { data: categories } = await adminClient
      .from("question_categories")
      .select("id, name");

    const categoryMap: Record<string, string> = {};
    for (const cat of categories || []) {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    }

    // SAT Math skill -> category mapping
    const skillToCategoryMap: Record<string, string> = {
      // Algebra
      "linear equations in one variable": "algebra",
      "linear equations in two variables": "algebra",
      "linear functions": "algebra",
      "linear inequalities in one or two variables": "algebra",
      "linear inequalities": "algebra",
      "systems of two linear equations in two variables": "algebra",
      "systems of linear equations": "algebra",
      // Advanced Math
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
      // Geometry and Trigonometry
      "area and volume": "geometry and trigonometry",
      "lines, angles, and triangles": "geometry and trigonometry",
      "right triangles and trigonometry": "geometry and trigonometry",
      "circles": "geometry and trigonometry",
      // Data Analysis and Problem Solving
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
      // English categories
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

    function getCategoryId(skill: string | null, subtopic: string | null): string | null {
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

    // Get existing question IDs and original_cb_ids to skip duplicates
    const { data: existingQuestions } = await adminClient
      .from("questions")
      .select("question_id, original_cb_id");

    const existingQIds = new Set((existingQuestions || []).map((q) => q.question_id));
    const existingCbIds = new Set(
      (existingQuestions || []).map((q) => q.original_cb_id).filter(Boolean)
    );

    // Find the highest EXT number
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

    for (const q of filteredQuestions) {
      const cbId = q.original_cb_id as string | null;
      const qId = q.question_id as string;

      if (cbId && existingCbIds.has(cbId)) { skipped++; continue; }
      if (existingQIds.has(qId)) { skipped++; continue; }

      const newQuestionId = `EXT${String(nextExtNum).padStart(4, "0")}`;
      nextExtNum++;

      // Normalize difficulty_level to match check constraint (easy, medium, hard)
      const rawDifficulty = (q.difficulty_level || '').toString().toLowerCase().trim();
      const normalizedDifficulty = ['easy', 'medium', 'hard'].includes(rawDifficulty) ? rawDifficulty : null;

      // Normalize question_type to match check constraint (multiple_choice, fill_blank)
      const rawType = (q.question_type || '').toString().toLowerCase().trim();
      const normalizedType = rawType === 'multiple_choice' ? 'multiple_choice'
        : ['fill_blank', 'fill_in_blank', 'grid_in', 'free_response', 'student_produced', 'numeric', 'spr'].includes(rawType) ? 'fill_blank'
        : rawType.includes('choice') ? 'multiple_choice'
        : 'multiple_choice';

      // Map skill/subtopic to category
      const categoryId = getCategoryId(q.skill as string | null, q.subtopic as string | null);

      const insertData: Record<string, unknown> = {
        question_id: newQuestionId,
        question_text: q.question_text,
        answer: q.answer,
        multiple_choice_options: q.multiple_choice_options,
        difficulty_level: normalizedDifficulty,
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
        skill: q.skill,
        has_figure: q.has_figure,
        figure_type: q.figure_type,
        figure_description: q.figure_description,
        figure_svg: q.figure_svg,
        is_original: true,
        is_active: true,
        category_id: categoryId,
      };

      const { error: insertError } = await adminClient.from("questions").insert(insertData);

      if (insertError) {
        errors++;
        errorDetails.push(`${qId}: ${insertError.message}`);
      } else {
        imported++;
        existingQIds.add(newQuestionId);
        if (cbId) existingCbIds.add(cbId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, total_found: filteredQuestions.length, imported, skipped, errors, error_details: errorDetails.slice(0, 10) }),
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
