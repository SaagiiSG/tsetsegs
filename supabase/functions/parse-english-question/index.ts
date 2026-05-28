import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const adminClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: userData, error: userErr } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''));
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { data: roles } = await adminClient.from('user_roles').select('role').eq('user_id', userData.user.id).in('role', ['admin', 'teacher']);
  if (!roles || roles.length === 0) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }


  try {
    const { imageBase64, pageNumber } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log(`Parsing English question page ${pageNumber}...`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting SAT Reading & Writing questions from CollegeBoard PDF screenshots.
Extract the question data and return ONLY a valid JSON object with this exact structure:
{
  "question_id": "the hex ID like f5c3e3b8 if visible",
  "domain": "Information and Ideas or Craft and Structure or Standard English Conventions or Expression of Ideas",
  "skill": "the specific skill/subtopic like Central Ideas, Text Structure, Transitions, etc.",
  "difficulty": "easy or medium or hard (based on filled squares: 1=easy, 2=medium, 3=hard)",
  "passage_text": "the full reading passage text if present (can be multiple paragraphs)",
  "question_text": "the actual question being asked",
  "question_type": "multiple_choice or fill_in_blank",
  "option_a": "option A text (null for fill-in-blank questions)",
  "option_b": "option B text (null for fill-in-blank questions)", 
  "option_c": "option C text (null for fill-in-blank questions)",
  "option_d": "option D text (null for fill-in-blank questions)",
  "correct_answer": "A/B/C/D for multiple choice, OR the actual text answer for fill-in-blank",
  "rationale": "the full explanation text explaining WHY the answer is correct"
}

CRITICAL INSTRUCTIONS:
1. QUESTION TYPE DETECTION:
   - If the question has options A, B, C, D to choose from → question_type: "multiple_choice"
   - If the question asks student to write their own answer → question_type: "fill_in_blank"
   - For fill-in-blank: set option_a, option_b, option_c, option_d to null

2. CORRECT ANSWER EXTRACTION:
   - For multiple choice: the correct_answer should be A, B, C, or D
   - For fill-in-blank: the correct_answer should be the actual text/value
   - IMPORTANT: If the correct answer letter is NOT visible in the question area, LOOK FOR IT IN THE RATIONALE/EXPLANATION SECTION!
   - The rationale often contains phrases like "The correct answer is...", "Choice A is correct because...", "The answer is B..."
   - Always check the explanation text to find the correct answer if not clearly marked elsewhere

3. PASSAGE AND QUESTION:
   - Preserve the passage text exactly as written
   - Keep paragraph breaks in passages
   - The question_text should be the specific question asked, NOT the passage
   - The rationale should explain the reasoning behind the correct answer

4. If any field cannot be extracted, use null
5. Return ONLY the JSON object, no other text`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the SAT Reading & Writing question from this CollegeBoard PDF page screenshot. Pay special attention to: 1) Whether this is multiple choice or fill-in-blank, 2) Finding the correct answer even if it is only shown in the rationale/explanation section. Return only the JSON object.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('Raw AI response:', content);

    // Parse the JSON from the response
    let parsedQuestion;
    try {
      // Try to extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedQuestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse question data',
          raw_content: content 
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully parsed English question:', parsedQuestion.question_id, 'Type:', parsedQuestion.question_type);

    return new Response(
      JSON.stringify({ 
        success: true, 
        question: parsedQuestion,
        pageNumber 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing English question:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
