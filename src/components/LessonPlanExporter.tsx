'use client';

/**
 * LessonPlanExporter.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Drop-in component for AlignIntel.
 *
 * WHAT IT DOES
 *   • Parses the rewrittenPlan markdown string from your /api/rewrite response
 *   • Renders it as the Format 4 "Modular Section Cards" HTML layout
 *   • Provides "Export to PDF" (browser print-to-PDF, zero extra deps)
 *   • Provides "Save as Word" (docx library, installed separately — see below)
 *
 * INSTALLATION
 *   npm install docx file-saver
 *   npm install -D @types/file-saver
 *
 * HOW TO USE IN page.tsx
 *   1. Import this component at the top of page.tsx:
 *        import LessonPlanExporter from '@/components/LessonPlanExporter';
 *        (or wherever you put this file)
 *
 *   2. Inside the rewriter tab, replace the current rewrittenPlan display block:
 *
 *        {rewrittenPlan ? (
 *          <LessonPlanExporter
 *            rewrittenPlan={rewrittenPlan}
 *            changesMade={changesMade}
 *            originalPlan={lessonPlanText}
 *          />
 *        ) : ( ... )}
 *
 *   That's it — the component handles everything else.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useMemo, useRef } from 'react';
import { Download, FileText, CheckCircle, Sliders } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Change {
  element: string;
  whatWasChanged: string;
  pedagogicalReason: string;
}

interface Props {
  rewrittenPlan: string;
  changesMade: Change[];
  originalPlan?: string;
}

// ─── Markdown parser → structured sections ───────────────────────────────────
// Extracts the most common sections AlignIntel's prompt produces.
// Falls back gracefully: unknown sections go into "Additional Notes".

interface ParsedPlan {
  title: string;
  teacher: string;
  grade: string;
  course: string;
  week: string;
  duration: string;
  standards: string[];
  objectives: string[];
  vocabulary: string[];
  materials: string[];
  days: DayBlock[];
  assessment: string;
  differentiation: string;
  teacherNotes: string;
}

interface DayBlock {
  heading: string;
  focus: string;
  steps: StepBlock[];
}

interface StepBlock {
  phase: string;
  duration: string;
  body: string;
  formative: string;
  diff: string;
}

function parsePlan(md: string): ParsedPlan {
  const lines = md.split('\n');

  // Helper: collect lines between two section headings
  const between = (startRe: RegExp, endRe: RegExp): string => {
    let capturing = false;
    const out: string[] = [];
    for (const l of lines) {
      if (!capturing && startRe.test(l)) { capturing = true; continue; }
      if (capturing && endRe.test(l)) break;
      if (capturing) out.push(l);
    }
    return out.join('\n').trim();
  };

  // Helper: collect a heading's content until next heading of same or higher level
  const section = (re: RegExp): string => {
    const idx = lines.findIndex(l => re.test(l));
    if (idx === -1) return '';
    const m = lines[idx].match(/^(#+)/);
    const level = m ? m[1].length : 99;
    const end = lines.findIndex((l, i) => i > idx && /^#{1,4} /.test(l) && (l.match(/^(#+)/) || ['', ''])[1].length <= level);
    return lines.slice(idx + 1, end === -1 ? undefined : end).join('\n').trim();
  };

  // Pull bullet items from a block of text
  const bullets = (text: string): string[] =>
    text.split('\n')
      .map(l => l.replace(/^[\s*\-•]+/, '').trim())
      .filter(l => l.length > 3);

  // Meta fields — look in first 20 lines
  const head = lines.slice(0, 25).join('\n');
  const meta = (re: RegExp) => { const m = head.match(re); return m ? m[1].trim() : ''; };

  const title = (lines.find(l => /^#\s+/.test(l)) || '').replace(/^#+\s*/, '').trim() || 'Lesson Plan';
  const teacher = meta(/(?:teacher|instructor)\s*[:\|]\s*(.+)/i);
  const grade = meta(/grade\s*(?:level)?\s*[:\|]\s*(.+)/i);
  const course = meta(/(?:course|subject|class)\s*[:\|]\s*(.+)/i);
  const week = meta(/week\s*[:\|]\s*(.+)/i);
  const duration = meta(/(?:time|duration|sessions?)\s*[:\|]\s*(.+)/i);

  // Standards
  const stdBlock = section(/^#{1,3}\s*(standard|alignment)/i);
  const standards = bullets(stdBlock).length
    ? bullets(stdBlock)
    : (md.match(/\[(?:Aligned to\s+)?([\w\-\.]+)\]/g) || []).map(s => s.replace(/[\[\]]/g, ''));

  // Objectives
  const objBlock = section(/^#{1,3}\s*(objective|swbat|learning goal|i can)/i);
  const objectives = bullets(objBlock);

  // Vocabulary
  const vocabBlock = section(/^#{1,3}\s*(vocab|key term|academic vocab)/i);
  const vocabulary = bullets(vocabBlock);

  // Materials
  const matBlock = section(/^#{1,3}\s*material/i);
  const materials = bullets(matBlock);

  // Parse day blocks
  const dayHeadings = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /^#{2,3}\s*day\s+\d/i.test(l));

  const days: DayBlock[] = dayHeadings.map(({ l, i }, di) => {
    const headingText = l.replace(/^#+\s*/, '');
    const focusMatch = headingText.match(/focus\s*[:\-]\s*(.+)/i);
    const focus = focusMatch ? focusMatch[1].replace(/[*_]/g, '').trim() : '';

    const nextDayIdx = dayHeadings[di + 1]?.i ?? lines.length;
    const dayLines = lines.slice(i + 1, nextDayIdx);

    // Parse step blocks within this day
    const stepHeadings = dayLines
      .map((l2, si) => ({ l2, si }))
      .filter(({ l2 }) => /^#{3,4}\s*\d+\./.test(l2) || /^\*\*(warm.?up|direct instruction|guided|independent|wrap.?up|exit|hook|practice|debrief|closure)/i.test(l2));

    const steps: StepBlock[] = stepHeadings.length
      ? stepHeadings.map(({ l2, si: stepIdx }, pi) => {
          const nextStepIdx = stepHeadings[pi + 1]?.si ?? dayLines.length;
          const stepBlock = dayLines.slice(stepIdx + 1, nextStepIdx).join('\n');
          const phaseText = l2.replace(/^[#*]+\s*\d*\.?\s*/, '').replace(/\*\*/g, '').trim();
          const durMatch = phaseText.match(/\((\d+\s*(?:min|minutes?))\)/i) || stepBlock.match(/\((\d+\s*(?:min|minutes?))\)/i);
          const dur = durMatch ? durMatch[1] : '';
          const phase = phaseText.replace(/\s*\(.*?\)/, '').trim();
          const formativeMatch = stepBlock.match(/\[(?:Formative[^:\]]*)[:\s]([^\]]+)\]/i);
          const diffMatch = stepBlock.match(/\[(?:Differentiat[^:\]]*|ESL[^:\]]*|Bilingual[^:\]]*)[:\s]([^\]]+)\]/i);
          const body = stepBlock
            .replace(/\[(?:Formative|Differentiat)[^\]]*\]/gi, '')
            .replace(/^\s*[\-*•]\s*/gm, '')
            .replace(/\n{2,}/g, '\n')
            .trim();
          return {
            phase,
            duration: dur,
            body: body.substring(0, 400),
            formative: formativeMatch ? formativeMatch[1] : '',
            diff: diffMatch ? diffMatch[1] : '',
          };
        })
      : [{
          phase: 'Instructional content',
          duration: '',
          body: dayLines.join('\n').replace(/^[#*\-•\d\.]+\s*/gm, '').trim().substring(0, 600),
          formative: '',
          diff: '',
        }];

    return { heading: headingText, focus, steps };
  });

  // If no day blocks found, make one generic day
  if (days.length === 0) {
    const instrBlock = section(/^#{1,3}\s*(instructional sequence|lesson sequence|activities)/i);
    const body = instrBlock || md.replace(/^#.+/gm, '').trim().substring(0, 800);
    days.push({
      heading: 'Instructional Sequence',
      focus: '',
      steps: [{ phase: 'Lesson content', duration: '', body, formative: '', diff: '' }],
    });
  }

  const assessment = section(/^(?:#{1,4}\s*|\*\*\s*)(assessment|formative assessment|evaluation)/i)
    .replace(/^[\-*•]\s*/gm, '').trim().substring(0, 400);
  const differentiation = section(/^(?:#{1,4}\s*|\*\*\s*)(differentiat|accommodation|modification)/i)
    .replace(/^[\-*•]\s*/gm, '').trim().substring(0, 400);
  const teacherNotes = section(/^(?:#{1,4}\s*|\*\*\s*)(teacher note|comment|note for teacher)/i)
    .replace(/^[\-*•]\s*/gm, '').trim().substring(0, 300);

  return {
    title, teacher, grade, course, week, duration,
    standards, objectives, vocabulary, materials,
    days, assessment, differentiation, teacherNotes,
  };
}

// ─── Colour palette (Format 4 card headers) ──────────────────────────────────

const DAY_COLORS = [
  { bg: '#E1F5EE', text: '#085041', border: '#5DCAA5' }, // teal
  { bg: '#E6F1FB', text: '#0C447C', border: '#85B7EB' }, // blue
  { bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' }, // purple
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function LessonPlanExporter({ rewrittenPlan, changesMade, originalPlan }: Props) {
  const plan = useMemo(() => parsePlan(rewrittenPlan), [rewrittenPlan]);
  const printRef = useRef<HTMLDivElement>(null);

  // ── Export: browser print → PDF ──────────────────────────────────────────
  const handleExportPDF = () => {
    const el = printRef.current;
    if (!el) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      alert('PDF export failed to initialize. Please try again.');
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>${plan.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 12mm; }
          .lp-header { margin-bottom: 14px; border-bottom: 2px solid #7F77DD; padding-bottom: 10px; }
          .lp-title { font-size: 17pt; font-weight: bold; margin-bottom: 3px; }
          .lp-sub { font-size: 9pt; color: #555; margin-bottom: 6px; }
          .lp-chips { display: flex; flex-wrap: wrap; gap: 5px; }
          .lp-chip { font-size: 8pt; border: 0.5px solid #ccc; border-radius: 12px; padding: 2px 8px; color: #555; }
          .lp-obj { border-left: 3px solid #7F77DD; padding: 7px 10px; background: #EEEDFE; border-radius: 0 5px 5px 0; margin-bottom: 12px; }
          .lp-obj-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 3px; font-size: 9.5pt; }
          .lp-obj-std { font-size: 7.5pt; background: #AFA9EC; color: #26215C; border-radius: 3px; padding: 1px 5px; white-space: nowrap; margin-top: 2px; flex-shrink: 0; font-weight: bold; }
          .lp-card { border: 0.5px solid #ccc; border-radius: 6px; overflow: hidden; margin-bottom: 11px; page-break-inside: avoid; }
          .lp-card-head { padding: 6px 11px; font-size: 8.5pt; font-weight: bold; letter-spacing: 0.06em; text-transform: uppercase; display: flex; justify-content: space-between; }
          .lp-card-body { padding: 9px 11px; font-size: 9.5pt; line-height: 1.5; }
          .lp-phase-row { display: flex; align-items: flex-start; gap: 9px; padding: 8px 11px; border-bottom: 0.5px solid #eee; font-size: 9.5pt; line-height: 1.4; }
          .lp-phase-row:last-child { border-bottom: none; }
          .lp-phase-left { min-width: 85px; flex-shrink: 0; display: flex; flex-direction: column; gap: 2px; }
          .lp-phase-pill { font-size: 8pt; background: #f3f3f3; border-radius: 12px; padding: 2px 7px; color: #555; text-align: center; }
          .lp-time-pill { font-size: 7.5pt; color: #888; text-align: center; }
          .lp-fa { font-size: 7.5pt; background: #E6F1FB; color: #0C447C; border-radius: 3px; padding: 1px 5px; display: inline-block; margin-top: 3px; }
          .lp-diff-pill { font-size: 7.5pt; background: #FAEEDA; color: #633806; border-radius: 3px; padding: 1px 5px; display: inline-block; margin-top: 3px; }
          .lp-vocab-row { display: flex; flex-wrap: wrap; gap: 5px; padding: 9px 11px; }
          .lp-vocab-chip { font-size: 8.5pt; border: 0.5px solid #bbb; border-radius: 12px; padding: 2px 9px; color: #555; }
          .lp-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
          .lp-day-label { font-size: 8pt; font-weight: bold; letter-spacing: 0.07em; text-transform: uppercase; color: #666; margin: 13px 0 5px; }
          .lp-footer { margin-top: 16px; border-top: 0.5px solid #ccc; padding-top: 7px; font-size: 7.5pt; color: #aaa; display: flex; justify-content: space-between; }
          @media print { body { padding: 8mm; } }
        </style>
      </head>
      <body>${el.innerHTML}</body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 400);
  };

  // ── Export: Word (.docx) ─────────────────────────────────────────────────
  const handleExportWord = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
              AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
              LevelFormat } = await import('docx');
      const fsModule = await import('file-saver');
      const saveAs = fsModule.saveAs || fsModule.default || (fsModule as any);

      const PAGE_W = 9360; // content width in DXA (US Letter, 1" margins)
      const PURPLE = '7F77DD';
      const LIGHT_PURPLE = 'EEEDFE';
      const TEAL_BG = 'E1F5EE';
      const TEAL_TXT = '085041';
      const BLUE_BG = 'E6F1FB';
      const BLUE_TXT = '0C447C';
      const GREEN_BG = 'EAF3DE';
      const GREEN_TXT = '27500A';
      const AMBER_BG = 'FAEEDA';
      const AMBER_TXT = '633806';
      const PINK_BG = 'FBEAF0';
      const PINK_TXT = '72243E';
      const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
      const borders = { top: border, bottom: border, left: border, right: border };
      const noBorder = { style: BorderStyle.NIL, size: 0, color: 'FFFFFF' };
      const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

      // Helper: a simple label+value table row
      const kv = (label: string, value: string, labelColor = '555555') =>
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 20, color: labelColor }),
            new TextRun({ text: value, size: 20 }),
          ],
        });

      // Helper: colored section card header row
      const cardHead = (text: string, bg: string, fgColor: string, rightText = '') =>
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: PAGE_W, type: WidthType.DXA },
              shading: { fill: bg, type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color: fgColor }),
                    ...(rightText ? [new TextRun({ text: `   ${rightText}`, size: 14, color: fgColor })] : []),
                  ],
                }),
              ],
            }),
          ],
        });

      // Helper: phase row
      const phaseRow = (phase: string, dur: string, body: string, formative: string, diff: string) =>
        new TableRow({
          children: [
            new TableCell({
              borders,
              width: { size: 1400, type: WidthType.DXA },
              shading: { fill: 'F8F8F8', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 100, right: 80 },
              children: [
                new Paragraph({ children: [new TextRun({ text: phase, bold: true, size: 18 })] }),
                ...(dur ? [new Paragraph({ children: [new TextRun({ text: dur, size: 15, color: '888888' })] })] : []),
              ],
            }),
            new TableCell({
              borders,
              width: { size: PAGE_W - 1400, type: WidthType.DXA },
              margins: { top: 60, bottom: 60, left: 100, right: 100 },
              children: [
                new Paragraph({ children: [new TextRun({ text: body, size: 18 })] }),
                ...(formative ? [new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `✓ Formative: ${formative}`, size: 15, color: '185FA5', italics: true })] })] : []),
                ...(diff ? [new Paragraph({ spacing: { before: 40 }, children: [new TextRun({ text: `⚡ ${diff}`, size: 15, color: '854F0B', italics: true })] })] : []),
              ],
            }),
          ],
        });

      // Helper: chip row (vocab / standards)
      const chipRow = (items: string[]) =>
        new Paragraph({
          spacing: { before: 60, after: 60 },
          children: items.flatMap((item, i) => [
            new TextRun({ text: item, size: 18, color: '555555' }),
            ...(i < items.length - 1 ? [new TextRun({ text: '  ·  ', size: 18, color: 'AAAAAA' })] : []),
          ]),
        });

      const children: any[] = [];

      // ── Title block ──
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 60 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PURPLE, space: 1 } },
          children: [new TextRun({ text: plan.title, size: 36, bold: true, color: '111111' })],
        }),
      );
      if (plan.teacher) children.push(kv('Teacher', plan.teacher));
      if (plan.grade) children.push(kv('Grade', plan.grade));
      if (plan.course) children.push(kv('Course', plan.course));
      if (plan.week) children.push(kv('Week', plan.week));
      if (plan.duration) children.push(kv('Duration', plan.duration));
      children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));

      // ── Standards ──
      if (plan.standards.length) {
        children.push(
          new Table({
            width: { size: PAGE_W, type: WidthType.DXA },
            columnWidths: [PAGE_W],
            rows: [
              cardHead('Standards Alignment', LIGHT_PURPLE, '3C3489'),
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    width: { size: PAGE_W, type: WidthType.DXA },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [chipRow(plan.standards)],
                  }),
                ],
              }),
            ],
          }),
        );
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }

      // ── Objectives ──
      if (plan.objectives.length) {
        children.push(
          new Table({
            width: { size: PAGE_W, type: WidthType.DXA },
            columnWidths: [PAGE_W],
            rows: [
              cardHead('Learning Objectives', LIGHT_PURPLE, '3C3489'),
              ...plan.objectives.map(obj =>
                new TableRow({
                  children: [
                    new TableCell({
                      borders,
                      width: { size: PAGE_W, type: WidthType.DXA },
                      margins: { top: 60, bottom: 60, left: 120, right: 120 },
                      shading: { fill: LIGHT_PURPLE, type: ShadingType.CLEAR },
                      children: [new Paragraph({ children: [new TextRun({ text: `• ${obj}`, size: 18, color: '26215C' })] })],
                    }),
                  ],
                }),
              ),
            ],
          }),
        );
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }

      // ── Vocabulary ──
      if (plan.vocabulary.length) {
        children.push(
          new Table({
            width: { size: PAGE_W, type: WidthType.DXA },
            columnWidths: [PAGE_W],
            rows: [
              cardHead('Key Vocabulary', LIGHT_PURPLE, '3C3489'),
              new TableRow({
                children: [
                  new TableCell({
                    borders,
                    width: { size: PAGE_W, type: WidthType.DXA },
                    margins: { top: 80, bottom: 80, left: 120, right: 120 },
                    children: [chipRow(plan.vocabulary)],
                  }),
                ],
              }),
            ],
          }),
        );
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }

      // ── Day blocks ──
      plan.days.forEach((day, di) => {
        const col = DAY_COLORS[di % DAY_COLORS.length];
        children.push(
          new Paragraph({
            spacing: { before: 180, after: 60 },
            children: [new TextRun({ text: day.heading.toUpperCase(), bold: true, size: 16, color: '666666', allCaps: true })],
          }),
        );
        children.push(
          new Table({
            width: { size: PAGE_W, type: WidthType.DXA },
            columnWidths: [1400, PAGE_W - 1400],
            rows: [
              cardHead('Instructional Sequence', col.bg.replace('#', ''), col.text.replace('#', ''), day.focus ? `Focus: ${day.focus}` : ''),
              ...day.steps.map(s => phaseRow(s.phase, s.duration, s.body, s.formative, s.diff)),
            ],
          }),
        );
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      });

      // ── Bottom 2x2 cards ──
      const bottomCards = [
        { label: 'Assessment', content: plan.assessment, bg: GREEN_BG, fg: GREEN_TXT },
        { label: 'Differentiation', content: plan.differentiation, bg: AMBER_BG, fg: AMBER_TXT },
        { label: 'Materials', content: plan.materials.join('  ·  ') || '—', bg: BLUE_BG, fg: BLUE_TXT },
        { label: 'Teacher Notes', content: plan.teacherNotes || '—', bg: PINK_BG, fg: PINK_TXT },
      ];

      const halfW = Math.floor(PAGE_W / 2);
      for (let i = 0; i < bottomCards.length; i += 2) {
        const left = bottomCards[i];
        const right = bottomCards[i + 1];
        children.push(
          new Table({
            width: { size: PAGE_W, type: WidthType.DXA },
            columnWidths: [halfW, halfW],
            rows: [
              new TableRow({
                children: [left, right].map(card =>
                  new TableCell({
                    borders: noBorders,
                    width: { size: halfW, type: WidthType.DXA },
                    margins: { top: 0, bottom: 0, left: 0, right: i === 0 ? 80 : 0 },
                    children: [
                      new Table({
                        width: { size: halfW - (i === 0 ? 80 : 0), type: WidthType.DXA },
                        columnWidths: [halfW - (i === 0 ? 80 : 0)],
                        rows: [
                          cardHead(card.label, card.bg.replace('#', ''), card.fg.replace('#', '')),
                          new TableRow({
                            children: [
                              new TableCell({
                                borders,
                                width: { size: halfW - (i === 0 ? 80 : 0), type: WidthType.DXA },
                                margins: { top: 80, bottom: 80, left: 120, right: 120 },
                                children: [new Paragraph({ children: [new TextRun({ text: card.content || '—', size: 18 })] })],
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ),
              }),
            ],
          }),
        );
        children.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
      }

      // ── Footer ──
      children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
      children.push(
        new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC', space: 1 } },
          children: [
            new TextRun({ text: 'Generated by AlignIntel · Curriculum Alignment Intelligence', size: 15, color: 'AAAAAA' }),
            new TextRun({ text: `   ${new Date().toLocaleDateString()}`, size: 15, color: 'AAAAAA' }),
          ],
        }),
      );

      const doc = new Document({
        styles: {
          default: { document: { run: { font: 'Arial', size: 20 } } },
          paragraphStyles: [
            {
              id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
              run: { size: 36, bold: true, font: 'Arial', color: '111111' },
              paragraph: { spacing: { before: 0, after: 120 }, outlineLevel: 0 },
            },
          ],
        },
        numbering: {
          config: [
            {
              reference: 'bullets',
              levels: [{
                level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
                style: { paragraph: { indent: { left: 720, hanging: 360 } } },
              }],
            },
          ],
        },
        sections: [{
          properties: {
            page: {
              size: { width: 12240, height: 15840 },
              margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
            },
          },
          children,
        }],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, `AlignIntel_${plan.title.replace(/[^a-z0-9]/gi, '_').substring(0, 40)}.docx`);
    } catch (err: any) {
      console.error('Word export error:', err);
      alert(`Word export failed: ${err.message}\n\nPlease try again or contact support if the issue persists.`);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Side-by-side: Original | Formatted preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Original */}
        {originalPlan && (
          <div className="flex flex-col gap-2">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Original plan</h5>
            <div className="bg-slate-950 p-5 rounded-2xl border border-white/5 font-sans text-slate-300 text-xs leading-relaxed max-h-[520px] overflow-y-auto whitespace-pre-wrap">
              {originalPlan}
            </div>
          </div>
        )}

        {/* Format 4 preview */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <h5 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Aligned plan — Format 4 preview
            </h5>
            {/* Export buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-all"
                title="Export lesson plan as PDF"
              >
                <Download className="w-3 h-3 text-rose-400" />
                PDF
              </button>
              <button
                onClick={handleExportWord}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white uppercase tracking-wider transition-all"
                title="Save as Word document (.docx)"
              >
                <FileText className="w-3 h-3 text-blue-400" />
                Word
              </button>
            </div>
          </div>

          {/* Scrollable Format 4 card */}
          <div className="bg-white rounded-2xl border border-emerald-500/20 max-h-[520px] overflow-y-auto p-5">
            <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', color: '#111', fontSize: '13px' }}>
              <Format4View plan={plan} />
            </div>
          </div>
        </div>
      </div>

      {/* Revision Action Logs */}
      {changesMade.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Revision Action Logs</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {changesMade.map((chg, idx) => (
              <div key={idx} className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-1.5">
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                  {chg.element}
                </span>
                <p className="text-xs font-semibold text-slate-200">{chg.whatWasChanged}</p>
                <p className="text-[10px] text-slate-400 italic">
                  <strong>Pedagogy Logic:</strong> {chg.pedagogicalReason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Format 4 HTML View (for preview + PDF print) ───────────────────────────

function Format4View({ plan }: { plan: ParsedPlan }) {
  const s: Record<string, React.CSSProperties> = {
    header: { marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #7F77DD' },
    title: { fontSize: 20, fontWeight: 600, margin: '0 0 4px' },
    sub: { fontSize: 12, color: '#555', margin: '0 0 8px' },
    chips: { display: 'flex', flexWrap: 'wrap', gap: 5 },
    chip: { fontSize: 11, border: '0.5px solid #ccc', borderRadius: 20, padding: '2px 9px', color: '#555' },
    objWrap: { borderLeft: '3px solid #7F77DD', padding: '8px 12px', background: '#EEEDFE', borderRadius: '0 5px 5px 0', marginBottom: 12 },
    objRow: { display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 3, fontSize: 12.5, lineHeight: 1.45 },
    objStd: { fontSize: 10, background: '#AFA9EC', color: '#26215C', borderRadius: 3, padding: '1px 5px', whiteSpace: 'nowrap', marginTop: 2, flexShrink: 0, fontWeight: 700 },
    card: { border: '0.5px solid #ccc', borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
    cardHead: { padding: '7px 11px', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' },
    phaseRow: { display: 'flex', alignItems: 'flex-start', gap: 9, padding: '8px 11px', borderBottom: '0.5px solid #eee', fontSize: 12.5, lineHeight: 1.4 },
    phaseLeft: { minWidth: 85, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 },
    phasePill: { fontSize: 10, background: '#f3f3f3', borderRadius: 12, padding: '2px 7px', color: '#555', textAlign: 'center' },
    timePill: { fontSize: 10, color: '#888', textAlign: 'center' },
    fa: { fontSize: 10, background: '#E6F1FB', color: '#0C447C', borderRadius: 3, padding: '1px 5px', display: 'inline-block', marginTop: 3 },
    diff: { fontSize: 10, background: '#FAEEDA', color: '#633806', borderRadius: 3, padding: '1px 5px', display: 'inline-block', marginTop: 3 },
    vocabRow: { display: 'flex', flexWrap: 'wrap', gap: 5, padding: '9px 11px' },
    vocabChip: { fontSize: 11, border: '0.5px solid #bbb', borderRadius: 12, padding: '2px 9px', color: '#555' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 0 },
    dayLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#666', margin: '13px 0 5px' },
    footer: { marginTop: 14, borderTop: '0.5px solid #ccc', paddingTop: 6, fontSize: 10, color: '#aaa', display: 'flex', justifyContent: 'space-between' },
  } as const;

  return (
    <>
      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>{plan.title}</div>
        <div style={s.sub}>
          {[plan.teacher, plan.grade, plan.course].filter(Boolean).join('  ·  ')}
        </div>
        <div style={s.chips}>
          {[plan.week, plan.duration, ...plan.standards].filter(Boolean).map((c, i) => (
            <span key={i} style={s.chip}>{c}</span>
          ))}
        </div>
      </div>

      {/* Objectives */}
      {plan.objectives.length > 0 && (
        <div style={s.objWrap}>
          {plan.objectives.map((obj, i) => (
            <div key={i} style={s.objRow}>
              <span style={s.objStd}>SWBAT</span>
              <span>{obj}</span>
            </div>
          ))}
        </div>
      )}

      {/* Vocabulary card */}
      {plan.vocabulary.length > 0 && (
        <div style={s.card}>
          <div style={{ ...s.cardHead, background: '#EEEDFE', color: '#3C3489' }}>Key vocabulary</div>
          <div style={s.vocabRow}>
            {plan.vocabulary.map((w, i) => <span key={i} style={s.vocabChip}>{w}</span>)}
          </div>
        </div>
      )}

      {/* Day sequence cards */}
      {plan.days.map((day, di) => {
        const col = DAY_COLORS[di % DAY_COLORS.length];
        return (
          <div key={di}>
            <div style={s.dayLabel}>{day.heading}</div>
            <div style={s.card}>
              <div style={{ ...s.cardHead, background: col.bg, color: col.text }}>
                <span>Instructional sequence</span>
                {day.focus && <span style={{ fontWeight: 400, fontSize: 10 }}>Focus: {day.focus}</span>}
              </div>
              {day.steps.map((step, si) => (
                <div key={si} style={{ ...s.phaseRow, borderBottom: si < day.steps.length - 1 ? '0.5px solid #eee' : 'none' }}>
                  <div style={s.phaseLeft}>
                    <span style={s.phasePill}>{step.phase}</span>
                    {step.duration && <span style={s.timePill}>{step.duration}</span>}
                  </div>
                  <div>
                    <span>{step.body}</span>
                    {step.formative && <div><span style={s.fa}>✓ Formative: {step.formative}</span></div>}
                    {step.diff && <div><span style={s.diff}>⚡ {step.diff}</span></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Bottom 2×2 cards */}
      <div style={s.grid2}>
        <div style={s.card}>
          <div style={{ ...s.cardHead, background: '#EAF3DE', color: '#27500A' }}>Assessment</div>
          <div style={{ padding: '9px 11px', fontSize: 12.5 }}>{plan.assessment || '—'}</div>
        </div>
        <div style={s.card}>
          <div style={{ ...s.cardHead, background: '#FAEEDA', color: '#633806' }}>Differentiation</div>
          <div style={{ padding: '9px 11px', fontSize: 12.5 }}>{plan.differentiation || '—'}</div>
        </div>
        <div style={{ ...s.card, marginTop: 8 }}>
          <div style={{ ...s.cardHead, background: '#E6F1FB', color: '#0C447C' }}>Materials</div>
          <div style={{ padding: '9px 11px', fontSize: 12.5 }}>{plan.materials.join('  ·  ') || '—'}</div>
        </div>
        <div style={{ ...s.card, marginTop: 8 }}>
          <div style={{ ...s.cardHead, background: '#FBEAF0', color: '#72243E' }}>Teacher notes</div>
          <div style={{ padding: '9px 11px', fontSize: 12.5 }}>{plan.teacherNotes || '—'}</div>
        </div>
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span>Generated by AlignIntel · Curriculum Alignment Intelligence</span>
        <span>{new Date().toLocaleDateString()}</span>
      </div>
    </>
  );
}

