import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Allow enough time for multimodal OCR + deep analysis

export async function POST(req: Request) {
  try {
    const { 
      standardsText, 
      lessonPlanText, 
      customApiKey, 
      lessonPlanFileBase64, 
      lessonPlanFileMimeType 
    } = await req.json();

    // Determine the API Key to use (custom key from user or system environment variable)
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json({
        error: 'Gemini API Key is not configured. Please supply an API key in the settings panel to enable AI-powered analysis.'
      }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct standard or custom standard description
    const curriculumContext = standardsText && standardsText.trim().length > 100
      ? `Here are the official curriculum standards to align against:\n\n${standardsText}\n\n`
      : `Since no custom standards document was provided, align against standard Grade-level K-12 English Language Arts and Academic/Literacy expectations.`;

    const prompt = `
You are an expert Educational Curriculum Alignment Specialist and Alignment Intelligence AI.
Your task is to analyze a teacher's lesson plan and compare it against the curriculum standards to determine alignment, extract elements, identify gaps, and provide improvements.

${curriculumContext}

Your response must be in strict JSON format. Do not write any markdown blocks (like \`\`\`json) in your raw response. Ensure the response is valid, parseable JSON.

Provide the analysis as a JSON object with the following structure:
{
  "detectedGrade": "String showing the detected grade level of the lesson plan (e.g., 'Grade 8', 'Kindergarten', 'Grade 3')",
  "extractedComponents": [
    {
      "type": "Objective" | "Activity" | "Assessment",
      "text": "The exact or summarized text of this element from the lesson plan"
    }
  ],
  "alignments": [
    {
      "type": "Objective" | "Activity" | "Assessment",
      "elementText": "The lesson plan element text being checked",
      "matchedStandardId": "The code/number/id of the matched standard (e.g. 'R-8.1', 'W-4.2', or 'Custom-1')",
      "matchedStandardText": "The exact description/text of the standard that was matched",
      "score": 0 to 100, // represent the confidence score or level of semantic alignment (High: 70-100, Medium: 40-69, Low: 0-39)
      "evidence": "A brief explanation of how/why this lesson element matches the standard, or if the alignment is weak, why it is weak."
    }
  ],
  "gapAnalysis": [
    {
      "standardId": "The code of the standard",
      "standardText": "The text of the standard",
      "issue": "Detailed explanation of why this standard is either missing or has weak alignment despite being highly relevant to the lesson topic/grade."
    }
  ],
  "suggestedImprovements": [
    {
      "area": "Title of the improvement area (e.g., 'Formative Assessment Alignment', 'Vocabulary Scaffold', 'Literary Lens Integration')",
      "problem": "What is lacking or weak in the current layout",
      "suggestion": "Highly specific, actionable instructional advice on what to change, add, or rewrite."
    }
  ]
}

Instructions for evaluation:
1. Do not use exact keyword matching only. Perform deep semantic analysis. E.g. "Draft a creative piece that engages with a social theme" matches a standard about "Write an extended creative piece that engages with social, political or cultural theme".
2. Match elements against the most appropriate standards. If a lesson element doesn't align with any standard, give it a score under 30% and set matchedStandardId to null or 'None'.
3. Grade Level Context: Pay special attention to grade alignment. If the standard is for Grade 8 and the lesson is Grade 8, they align perfectly. If there is a grade mismatch (e.g., a Grade 4 lesson aligning to Grade 11 standards), reflect that with a much lower score and explain it in the evidence.

Verify that your response is completely valid JSON and follows this exact structure.
`;

    // Configure content array for Gemini
    const contents: any[] = [];

    if (lessonPlanFileBase64 && lessonPlanFileMimeType) {
      // Scanned PDF/Image multimodal pipeline
      contents.push({
        inlineData: {
          data: lessonPlanFileBase64,
          mimeType: lessonPlanFileMimeType
        }
      });
      contents.push({
        text: prompt + `\n\nCRITICAL MULTIMODAL INSTRUCTION: The lesson plan has been uploaded as an image-only / scanned file (scanned PDF or photo image). Read the document contents visually using your OCR and document understanding capabilities, extract all objectives, activities, assessments, and grade indicators, and then perform the curriculum standards alignment matrix analysis based on that visual extraction!`
      });
    } else {
      // Standard text-based pipeline
      if (!lessonPlanText || !lessonPlanText.trim()) {
        return NextResponse.json({ error: 'Lesson plan text is required for text-mode analysis.' }, { status: 400 });
      }
      contents.push({
        text: prompt + `\n\nHere is the Lesson Plan under analysis:\n"""\n${lessonPlanText}\n"""`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini API returned an empty response. Verify your API key has visual access or your file size is correct.');
    }

    // Try to parse the result to guarantee validity
    const data = JSON.parse(resultText.trim());
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error in /api/analyze route:', error);
    return NextResponse.json({
      error: error.message || 'An error occurred during curriculum alignment analysis.'
    }, { status: 500 });
  }
}
