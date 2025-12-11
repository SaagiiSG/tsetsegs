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
  "option_a": "option A text/expression",
  "option_b": "option B text/expression", 
  "option_c": "option C text/expression",
  "option_d": "option D text/expression",
  "correct_answer": "A or B or C or D",
  "rationale": "the full explanation text"
}

IMPORTANT:
- Convert all math expressions to LaTeX format wrapped in $ symbols
- For fractions use \\frac{a}{b}
- For exponents use ^{} like x^{2}
- For subscripts use _{} like a_{1}
- If any field cannot be extracted, use null
- Return ONLY the JSON object, no other text`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract the SAT question from this CollegeBoard PDF page screenshot. Return only the JSON object.'
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

    console.log('Successfully parsed question:', parsedQuestion.question_id);

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
