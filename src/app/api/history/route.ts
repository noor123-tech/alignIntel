import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET: Retrieve a summarized list of all alignment reports in history
export async function GET() {
  try {
    const query = `
      SELECT 
        ar.id,
        ar.detected_grade as detectedGrade,
        ar.stats,
        ar.created_at as createdAt,
        d_lp.file_name as lessonPlanName,
        d_st.file_name as standardsName
      FROM alignment_reports ar
      JOIN documents d_lp ON ar.lesson_plan_id = d_lp.id
      LEFT JOIN documents d_st ON ar.standards_id = d_st.id
      ORDER BY ar.created_at DESC
    `;

    const stmt = db.prepare(query);
    const rows = stmt.all();

    // Map rows and parse the JSON stringified stats
    const reports = rows.map((row: any) => ({
      id: row.id,
      detectedGrade: row.detectedGrade,
      createdAt: row.createdAt,
      lessonPlanName: row.lessonPlanName,
      standardsName: row.standardsName || 'Default ELA Benchmarks',
      stats: row.stats ? JSON.parse(row.stats) : { total: 0, high: 0, low: 0 }
    }));

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch alignment history.' }, { status: 500 });
  }
}

// POST: Save a new alignment report and its files to SQLite
export async function POST(req: Request) {
  try {
    const {
      lessonPlanName,
      lessonPlanText,
      standardsName,
      standardsText,
      detectedGrade,
      stats,
      extractions,
      alignments,
      gaps,
      suggestions,
      rewrittenPlan,
      changesMade
    } = await req.json();

    if (!lessonPlanText || !lessonPlanText.trim()) {
      return NextResponse.json({ error: 'Lesson plan text is required to save a report.' }, { status: 400 });
    }

    // Begin a synchronous database transaction to guarantee ACID safety
    const insertTx = db.transaction(() => {
      // 1. Insert the lesson plan document
      const lpInsert = db.prepare(`
        INSERT INTO documents (type, file_name, content) 
        VALUES ('lesson_plan', ?, ?)
      `);
      const lpResult = lpInsert.run(lessonPlanName || 'Pasted_Lesson_Plan.txt', lessonPlanText);
      const lessonPlanId = lpResult.lastInsertRowid;

      // 2. Insert standard document if provided, otherwise default to null
      let standardsId: number | bigint | null = null;
      if (standardsText && standardsText.trim()) {
        const stInsert = db.prepare(`
          INSERT INTO documents (type, file_name, content)
          VALUES ('standards', ?, ?)
        `);
        const stResult = stInsert.run(standardsName || 'Custom_Standards.txt', standardsText);
        standardsId = stResult.lastInsertRowid;
      }

      // 3. Insert the alignment report linking to the documents
      const reportInsert = db.prepare(`
        INSERT INTO alignment_reports (
          lesson_plan_id, 
          standards_id, 
          detected_grade, 
          stats, 
          extractions, 
          alignments, 
          gaps, 
          suggestions, 
          rewritten_plan, 
          changes_made
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const reportResult = reportInsert.run(
        lessonPlanId,
        standardsId,
        detectedGrade || '--',
        JSON.stringify(stats || { total: 0, high: 0, low: 0 }),
        JSON.stringify(extractions || []),
        JSON.stringify(alignments || []),
        JSON.stringify(gaps || []),
        JSON.stringify(suggestions || []),
        rewrittenPlan || '',
        JSON.stringify(changesMade || [])
      );

      return reportResult.lastInsertRowid;
    });

    const insertedId = insertTx();

    return NextResponse.json({ 
      success: true, 
      id: Number(insertedId), 
      message: 'Report saved to database successfully.' 
    });

  } catch (error: any) {
    console.error('Error saving report:', error);
    return NextResponse.json({ error: error.message || 'Failed to save alignment report.' }, { status: 500 });
  }
}
