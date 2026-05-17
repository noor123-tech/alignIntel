import { NextResponse } from 'next/server';
import db from '@/lib/db';

type Params = Promise<{ id: string }>

// GET: Retrieve a specific saved alignment report details including document contents
export async function GET(req: Request, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    const query = `
      SELECT 
        ar.id,
        ar.detected_grade as detectedGrade,
        ar.stats,
        ar.extractions,
        ar.alignments,
        ar.gaps,
        ar.suggestions,
        ar.rewritten_plan as rewrittenPlan,
        ar.changes_made as changesMade,
        ar.created_at as createdAt,
        d_lp.file_name as lessonPlanName,
        d_lp.content as lessonPlanText,
        d_st.file_name as standardsName,
        d_st.content as standardsText
      FROM alignment_reports ar
      JOIN documents d_lp ON ar.lesson_plan_id = d_lp.id
      LEFT JOIN documents d_st ON ar.standards_id = d_st.id
      WHERE ar.id = ?
    `;

    const stmt = db.prepare(query);
    const row: any = stmt.get(id);

    if (!row) {
      return NextResponse.json({ error: 'Alignment report not found.' }, { status: 404 });
    }

    // Return the parsed detailed object
    const report = {
      id: row.id,
      detectedGrade: row.detectedGrade,
      createdAt: row.createdAt,
      lessonPlanName: row.lessonPlanName,
      lessonPlanText: row.lessonPlanText,
      standardsName: row.standardsName || 'Default ELA Benchmarks',
      standardsText: row.standardsText || '',
      stats: row.stats ? JSON.parse(row.stats) : { total: 0, high: 0, low: 0 },
      extractions: row.extractions ? JSON.parse(row.extractions) : [],
      alignments: row.alignments ? JSON.parse(row.alignments) : [],
      gaps: row.gaps ? JSON.parse(row.gaps) : [],
      suggestions: row.suggestions ? JSON.parse(row.suggestions) : [],
      rewrittenPlan: row.rewrittenPlan || '',
      changesMade: row.changesMade ? JSON.parse(row.changesMade) : []
    };

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error('Error fetching saved report:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch the saved report.' }, { status: 500 });
  }
}

// DELETE: Delete a specific alignment report and its cascading documents from SQLite
export async function DELETE(req: Request, segmentData: { params: Params }) {
  try {
    const params = await segmentData.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required.' }, { status: 400 });
    }

    // We can retrieve the document IDs linked to this report to remove them as well
    const getDocsQuery = db.prepare(`
      SELECT lesson_plan_id, standards_id 
      FROM alignment_reports 
      WHERE id = ?
    `);
    const reportRow: any = getDocsQuery.get(id);

    if (!reportRow) {
      return NextResponse.json({ error: 'Alignment report not found.' }, { status: 404 });
    }

    // Run the deletion within a transactional lock
    const deleteTx = db.transaction(() => {
      // 1. Delete the alignment report itself
      db.prepare('DELETE FROM alignment_reports WHERE id = ?').run(id);

      // 2. Delete the associated lesson plan document
      db.prepare('DELETE FROM documents WHERE id = ?').run(reportRow.lesson_plan_id);

      // 3. Delete the custom standards document if it exists
      if (reportRow.standards_id) {
        db.prepare('DELETE FROM documents WHERE id = ?').run(reportRow.standards_id);
      }
    });

    deleteTx();

    return NextResponse.json({ 
      success: true, 
      message: 'Alignment report and associated documents deleted successfully.' 
    });

  } catch (error: any) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete report.' }, { status: 500 });
  }
}
