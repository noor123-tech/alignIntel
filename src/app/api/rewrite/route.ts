import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Allow enough time for deep processing

export async function POST(req: Request) {
  try {
    const {
      standardsText,
      lessonPlanText,
      gapAnalysis,
      suggestedImprovements,
      focusAreas,
      customApiKey
    } = await req.json();

    if (!lessonPlanText || !lessonPlanText.trim()) {
      return NextResponse.json({ error: 'Lesson plan text is required.' }, { status: 400 });
    }

    // Determine the API Key to use (custom key from user or system environment variable)
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json({
        error: 'Gemini API Key is not configured. Please supply an API key in the settings panel to enable AI-powered rewriting.'
      }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Focus areas description
    const focusString = focusAreas && focusAreas.length > 0
      ? `Special Instruction: In your rewritten lesson plan, place extra emphasis on incorporating these specific pedagogical frameworks/focus areas: ${focusAreas.join(', ')}.`
      : '';

    const prompt = `
You are an expert Educational Curriculum Designer, Pedagogy Specialist, and Revision Assistant.
Your task is to take a teacher's lesson plan, analyze its current structure, standards gaps, and improvement suggestions, and rewrite it so that it is fully, robustly, and demonstrably aligned to the standards.

Here are the Curriculum Standards context:
"""
${standardsText || 'Standard K-12 English Language Arts and Literacy alignment'}
"""

Here is the Original Lesson Plan:
"""
${lessonPlanText}
"""

Here are the Identified Gaps from the Alignment Check:
${JSON.stringify(gapAnalysis || [], null, 2)}

Here are the Suggested Improvements:
${JSON.stringify(suggestedImprovements || [], null, 2)}

${focusString}

Write a fully redesigned, highly detailed, and professionally formatted lesson plan in Markdown.
Ensure that:
1. Every standard mentioned in the gaps is explicitly, robustly, and clearly integrated into the objectives, activities, or assessments.
2. The revised lesson plan follows clear instructional sequencing (e.g. Warm-up, Modeling/Direct Instruction, Guided Practice, Independent Practice, Wrap-up/Assessment).
3. The language is extremely clear, easy for teachers to read, and represents executive-grade educational standards.
4. If there were focus areas specified, clearly flag where they have been included (e.g., "[Peer Feedback Integration]" or "[Formative Assessment Highlight]").

You must respond in strict JSON format. Do not write any markdown blocks (like \`\`\`json) in your raw response. Ensure the response is valid, parseable JSON.

Provide the rewritten plan and explanation as a JSON object with the following structure:
{
  "rewrittenLessonPlan": "The complete, detailed lesson plan fully written out in Markdown format, with sections, bullet points, bolding, and high readability.",
  "changesMade": [
    {
      "element": "The section or standard changed (e.g., 'Assessment', 'Objective 2', 'Grade 8 Standard R-8.2')",
      "whatWasChanged": "Detailed description of what you added, deleted, or revised.",
      "pedagogicalReason": "The educational reasoning behind why this change helps the students and satisfies the curriculum standards."
    }
  ]
}

Verify that your response is completely valid JSON and follows this exact structure.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini API returned an empty response.');
    }

    // Try to parse the result to guarantee validity
    const data = JSON.parse(resultText.trim());
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in /api/rewrite:', error);
    return NextResponse.json({
      error: error.message || 'An error occurred during the lesson plan rewriting process.'
    }, { status: 500 });
  }
}
