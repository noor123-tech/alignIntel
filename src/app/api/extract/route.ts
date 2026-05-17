import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60; // Allow enough time for deep visual document reading

export async function POST(req: Request) {
  try {
    const { fileBase64, mimeType, customApiKey } = await req.json();

    if (!fileBase64 || !mimeType) {
      return NextResponse.json({ error: 'File data and mime type are required.' }, { status: 400 });
    }

    // Determine the API Key to use (custom key from user or system environment variable)
    const apiKey = customApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return NextResponse.json({
        error: 'Gemini API Key is not configured. Please supply an API key in the settings panel to enable visual OCR extraction.'
      }, { status: 401 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert OCR and educational document extraction specialist AI.
Your task is to visually examine the provided scanned document or image page-by-page, read all text characters, and reconstruct the lesson plan exactly as written.

Reconstruct the lesson plan with:
- Clear bold headings (e.g. Grade, Objectives, Activities, Assessments)
- Organized lists for instructional steps, activities, and procedures
- Proper spacing and clean paragraph layouts

Format your response in a highly legible plain text / markdown layout. Do not wrap your response in markdown code blocks like \`\`\`markdown or \`\`\`text. Just return the clean text of the extracted lesson plan directly.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: fileBase64,
            mimeType: mimeType
          }
        },
        {
          text: prompt
        }
      ]
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini API failed to return any text. Please verify the document has clear readable characters.');
    }

    return NextResponse.json({ text: resultText });

  } catch (error: any) {
    console.error('Error in /api/extract visual OCR endpoint:', error);
    return NextResponse.json({
      error: error.message || 'An error occurred while performing visual OCR extraction.'
    }, { status: 500 });
  }
}
