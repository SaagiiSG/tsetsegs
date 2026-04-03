import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const bodySchema = z.object({
  questionId: z.string().uuid(),
  questionText: z.string().min(5).max(5000),
  questionType: z.enum(['multiple_choice', 'fill_blank']),
  answer: z.string().min(1).max(500),
  multipleChoiceOptions: z.object({
    A: z.string().max(500),
    B: z.string().max(500),
    C: z.string().max(500),
    D: z.string().max(500),
  }).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller as admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const callerClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claims, error: claimsError } = await callerClient.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', claims.claims.sub)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate input
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { questionId, questionText, questionType, answer, multipleChoiceOptions } = parsed.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build prompt for AI
    let prompt = `You are an expert SAT test question writer. Generate exactly 3 variations of the following SAT question. 
IMPORTANT: Keep the same concept, difficulty level, and structure, but ONLY change the numbers/values. 
Do NOT change the wording or add new concepts.

Original Question:
${questionText}

Question Type: ${questionType === 'multiple_choice' ? 'Multiple Choice' : 'Fill in the Blank'}
Correct Answer: ${answer}`;

    if (questionType === 'multiple_choice' && multipleChoiceOptions) {
      prompt += `
Answer Options:
A: ${multipleChoiceOptions.A}
B: ${multipleChoiceOptions.B}
C: ${multipleChoiceOptions.C}
D: ${multipleChoiceOptions.D}`;
    }

    prompt += `

Return your response as a JSON array with exactly 3 variations. Each variation should have:
- "question_text": the modified question text
- "answer": the correct answer (A/B/C/D for multiple choice, or the actual answer for fill in blank)
${questionType === 'multiple_choice' ? '- "multiple_choice_options": {"A": "...", "B": "...", "C": "...", "D": "..."}' : ''}

Only return the JSON array, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert SAT test question writer. Always respond with valid JSON only." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse JSON from response
    let variations;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        variations = JSON.parse(jsonMatch[0]);
      } else {
        variations = JSON.parse(content);
      }
    } catch (e) {
      console.error("Failed to parse AI response");
      throw new Error("Failed to parse AI response");
    }

    if (!Array.isArray(variations) || variations.length < 1) {
      throw new Error("Invalid variations format");
    }

    const variationsToInsert = variations.slice(0, 3).map((v: any) => ({
      parent_question_id: questionId,
      question_text: String(v.question_text || '').slice(0, 5000),
      answer: String(v.answer || '').slice(0, 500),
      multiple_choice_options: v.multiple_choice_options || null,
      status: 'pending_review',
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('ai_variations')
      .insert(variationsToInsert)
      .select();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      count: inserted?.length || 0,
      variations: inserted 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-variations:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
