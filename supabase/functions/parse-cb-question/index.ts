import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    console.log(`Parsing page ${pageNumber}...`);

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
            content: `You are an expert at extracting SAT math questions from CollegeBoard PDF screenshots.
Extract the question data and return ONLY a valid JSON object with this exact structure:
{
  "question_id": "the hex ID like f5c3e3b8",
  "domain": "Advanced Math or Algebra or Geometry and Trigonometry or Data Analysis",
  "skill": "the specific skill/subtopic like Equivalent expressions",
  "difficulty": "easy or medium or hard (based on filled squares: 1=easy, 2=medium, 3=hard)",
  "question_text": "the full question text including any math expressions in LaTeX format like $x^2 + 3x$",
  "question_type": "multiple_choice or fill_in_blank",
  "option_a": "option A text/expression (null for fill-in-blank questions)",
  "option_b": "option B text/expression (null for fill-in-blank questions)", 
  "option_c": "option C text/expression (null for fill-in-blank questions)",
  "option_d": "option D text/expression (null for fill-in-blank questions)",
  "correct_answer": "A/B/C/D for multiple choice, OR the actual numeric/text answer for fill-in-blank",
  "rationale": "the full explanation text"
}

CRITICAL INSTRUCTIONS:
1. QUESTION TYPE DETECTION:
   - If the question has options A, B, C, D to choose from → question_type: "multiple_choice"
   - If the question asks student to enter/write their own answer (Student-Produced Response) → question_type: "fill_in_blank"
   - For fill-in-blank: set option_a, option_b, option_c, option_d to null

2. CORRECT ANSWER EXTRACTION:
   - For multiple choice: the correct_answer should be A, B, C, or D
   - For fill-in-blank: the correct_answer should be the actual value (number, fraction, text)
   - IMPORTANT: If the correct answer is NOT clearly marked in the question section, LOOK FOR IT IN THE RATIONALE/EXPLANATION SECTION!
   - The rationale often contains phrases like "The correct answer is...", "Choice X is correct...", "The answer is..."
   - Always check the explanation text to find the correct answer if not visible elsewhere

3. MATH FORMATTING:
   - Convert all math expressions to LaTeX format wrapped in $ symbols
   - For fractions use \\frac{a}{b}
   - For exponents use ^{} like x^{2}
   - For subscripts use _{} like a_{1}

4. If any field cannot be extracted, use null
5. Return ONLY the JSON object, no other text`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the SAT question from this CollegeBoard PDF page screenshot. Pay special attention to: 1) Whether this is multiple choice or fill-in-blank, 2) Finding the correct answer even if it is only shown in the rationale/explanation section. Return only the JSON object.'
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
        max_tokens: 2000,
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
      // Find JSON directly by locating { and } - more reliable than regex replacement
      const jsonStart = content.indexOf("{");
      const jsonEnd = content.lastIndexOf("}");
      
      // Check if this page doesn't contain a complete question (continuation page, rationale-only, etc.)
      if (jsonStart === -1 || jsonEnd === -1) {
        // Check if the AI indicated it couldn't find a question
        const lowerContent = content.toLowerCase();
        const isIncomplete = lowerContent.includes('cannot extract') || 
                            lowerContent.includes('not a complete question') ||
                            lowerContent.includes('no actual question') ||
                            lowerContent.includes("i'm sorry") ||
                            lowerContent.includes('only contains');
        
        if (isIncomplete) {
          console.log(`Page ${pageNumber} skipped - no complete question found`);
          return new Response(
            JSON.stringify({ 
              success: true, 
              skipped: true,
              reason: 'Page does not contain a complete question',
              pageNumber 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error('No JSON object found in response');
      }
      
      // Extract just the JSON object
      let cleaned = content.substring(jsonStart, jsonEnd + 1);
      
      try {
        parsedQuestion = JSON.parse(cleaned);
      } catch (e) {
        // Try to fix common issues
        cleaned = cleaned
          .replace(/,\s*}/g, "}") // Remove trailing commas
          .replace(/,\s*]/g, "]")
          .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters
        parsedQuestion = JSON.parse(cleaned);
      }
      
      // Validate options only for multiple choice questions
      const isFillInBlank = parsedQuestion.question_type === 'fill_in_blank';
      
      if (!isFillInBlank && parsedQuestion.option_a !== null && parsedQuestion.option_b !== null) {
        const optionsEmpty = 
          (!parsedQuestion.option_a || parsedQuestion.option_a.trim() === '') &&
          (!parsedQuestion.option_b || parsedQuestion.option_b.trim() === '') &&
          (!parsedQuestion.option_c || parsedQuestion.option_c.trim() === '') &&
          (!parsedQuestion.option_d || parsedQuestion.option_d.trim() === '');
        
        if (optionsEmpty) {
          console.error('All options are empty - parsing likely failed');
          return new Response(
            JSON.stringify({ 
              error: 'Failed to extract answer options from the image. The question may require manual entry.',
              raw_content: content 
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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

    console.log('Successfully parsed question:', parsedQuestion.question_id, 'Type:', parsedQuestion.question_type);

    return new Response(
      JSON.stringify({ 
        success: true, 
        question: parsedQuestion,
        pageNumber 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing question:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
