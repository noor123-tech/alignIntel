'use client';

import React, { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import {
  Sparkles,
  UploadCloud,
  FileText,
  BookOpen,
  FileCheck,
  Compass,
  Settings,
  Download,
  Copy,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sliders,
  Eye,
  Key,
  X,
  FileCode,
  Layers,
  ChevronRight,
  ThumbsUp,
  Database as DbIcon,
  FolderOpen
} from 'lucide-react';
import Fuse from 'fuse.js';

// --- THE CURRICULUM DATABASE (Colegio Bilingüe Ciudad Blanca Standards) ---
const DEFAULT_STANDARDS = [
  // Prekinder
  { grade: "PK", id: "L-PK.1", text: "Show understanding of a single spoken word or simple command (e.g., 'sit,' 'clap,' 'look') by responding with a physical action." },
  { grade: "PK", id: "L-PK.2", text: "Recognize their own name and the names of 2–3 classmates when spoken aloud in a group setting." },
  { grade: "PK", id: "S-PK.1", text: "Repeat single words and simple phrases modeled by the teacher, such as color names, numbers 1–5, and greetings." },
  { grade: "PK", id: "W-PK.1", text: "Demonstrate pre-writing readiness by drawing controlled shapes (lines, circles, crosses) and holding a writing tool with a functional grip." },
  
  // Kinder
  { grade: "K", id: "L-K.1", text: "Follow two-step oral instructions given by the teacher using familiar classroom language and visual support." },
  { grade: "K", id: "S-K.1", text: "Name at least 15 familiar classroom and household objects, animals, and colors using single words or short noun phrases." },
  
  // 1st Grade
  { grade: "1", id: "L-1.1", text: "Identify the main idea and at least two supporting details from a short read-aloud or listened text." },
  { grade: "1", id: "S-1.1", text: "Describe a familiar person, place, or object using a complete sentence that includes a subject, verb, and at least one adjective." },
  { grade: "1", id: "R-1.1", text: "Decode CVC and simple CCVC words and recognize a set of up to 30 high-frequency sight words." },
  
  // 4th Grade
  { grade: "4", id: "L-4.1", text: "Evaluate whether the speaker's claims are supported by clear evidence, identifying at least one strong point and one weak claim." },
  { grade: "4", id: "S-4.4", text: "Distinguish between informal and formal spoken language and demonstrate the ability to adjust register appropriately." },
  { grade: "4", id: "W-4.1", text: "Write a structured 5-paragraph essay that includes an introduction with a clear thesis statement." },

  // 7th Grade
  { grade: "7", id: "L-7.1", text: "Analyze the rhetorical strategies (e.g., ethos, pathos, logos) used in a speech, podcast, or academic lecture." },
  { grade: "7", id: "S-7.2", text: "Lead an academic discussion that models intellectual humility — acknowledging uncertainty and revising thinking based on new evidence." },
  { grade: "7", id: "W-7.1", text: "Write a sophisticated literary essay of 7–9 paragraphs that develops and sustains a complex, arguable thesis." },

  // 8th Grade 
  { grade: "8", id: "L-8.1", text: "Compare the use of rhetorical strategies across two speeches or talks from different cultural or institutional contexts." },
  { grade: "8", id: "L-8.2", text: "Listen to a scholarly or intellectual argument and identify the underlying ideological assumptions that shape the speaker's position." },
  { grade: "8", id: "S-8.1", text: "Engage in high-level intellectual discourse on a complex academic topic, sustaining a position and revising based on evidence." },
  { grade: "8", id: "S-8.4", text: "Consciously code-switch between formal academic English and personal/cultural voice across different speaking contexts." },
  { grade: "8", id: "R-8.1", text: "Apply two or more critical reading lenses (e.g., feminist, postcolonial, Marxist, psychological) to a single complex text." },
  { grade: "8", id: "R-8.2", text: "Analyze how power relationships and ideological positions are encoded in the language of a literary text." },
  { grade: "8", id: "W-8.1", text: "Write a fully developed critical essay of 8–10 paragraphs that applies a named critical framework to a literary text." },
  { grade: "8", id: "W-8.5", text: "Write an extended creative piece that engages meaningfully with a social, political, or cultural theme using sophisticated craft." },

  // 11th Grade 
  { grade: "11", id: "L-11.1", text: "Demonstrate mastery-level critical listening across professional, academic, and civic contexts, analyzing rhetorical strategies and bias." },
  { grade: "11", id: "S-11.1", text: "Demonstrate full mastery of academic and professional oral communication, engaging with authority and intellectual confidence." },
  { grade: "11", id: "R-11.1", text: "Demonstrate a fully developed, theoretically sophisticated, and personally distinctive critical reading practice applying multiple frameworks." }
];

const SAMPLE_LESSON_TEXT = `Colegio Bilingüe Ciudad Blanca - Lesson Plan
Instructor: English Department
Grade Level: Grade 8 
Unit: Advanced Rhetoric & Critical Perspectives

OBJECTIVE: SWBAT compare the use of rhetorical strategies across two speeches from different cultures.
OBJECTIVE: I can apply two or more critical reading lenses (like Marxist or feminist) to our current classroom novel.
ACTIVITY: Pair Interviews: Students will record a 5-minute scholarly discussion about ideological assumptions found in the guest speaker's talk.
ACTIVITY: Instructional Sequence: Teacher models how to write a fully developed critical essay of 8-10 paragraphs focusing on word choice and focalization.
ASSESSMENT: Formative check: Draft a creative piece that engages meaningfully with a social theme using symbolism and characterization.`;

const PEDAGOGICAL_FOCUS_OPTIONS = [
  { id: 'peer-feedback', label: 'Peer Feedback Structure', description: 'Embed formal protocols for peer-review and constructive critique.' },
  { id: 'formative-assessment', label: 'Formative Assessment Milestones', description: 'Add quick checking strategies like exit tickets and check-ins.' },
  { id: 'differentiation', label: 'Differentiated Learning Paths', description: 'Include adaptations for advanced learners and students needing scaffolding.' },
  { id: 'vocabulary-scaffold', label: 'Academic Vocabulary Anchors', description: 'Scaffold complex subject-specific words throughout the lesson flow.' },
  { id: 'esl-support', label: 'Bilingual / ESL Supports', description: 'Provide visual models and speaking frames specifically for language learners.' }
];

export default function AlignIntelDashboard() {
  // --- States ---
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [engineMode, setEngineMode] = useState<'ai' | 'local'>('ai');

  // Input states
  const [standardsType, setStandardsType] = useState<'default' | 'paste' | 'file'>('default');
  const [customStandardsText, setCustomStandardsText] = useState<string>('');
  const [lessonPlanType, setLessonPlanType] = useState<'paste' | 'file'>('paste');
  const [lessonPlanText, setLessonPlanText] = useState<string>('');
  const [standardsFileName, setStandardsFileName] = useState<string>('');
  const [lessonPlanFileName, setLessonPlanFileName] = useState<string>('');

  // Multimodal Scanned File/Image states
  const [lessonPlanFileBase64, setLessonPlanFileBase64] = useState<string>('');
  const [lessonPlanFileMimeType, setLessonPlanFileMimeType] = useState<string>('');
  const [isScannedFile, setIsScannedFile] = useState<boolean>(false);
  const [scannedNotification, setScannedNotification] = useState<string>('');

  // SQLite DB History states
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [isSavingReport, setIsSavingReport] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const [isParsingStandards, setIsParsingStandards] = useState<boolean>(false);
  const [isParsingLesson, setIsParsingLesson] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [isExtractingOCR, setIsExtractingOCR] = useState<boolean>(false);
  const [isExtractingStandardsOCR, setIsExtractingStandardsOCR] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Symmetrical standards visual OCR states
  const [isScannedStandards, setIsScannedStandards] = useState<boolean>(false);
  const [standardsFileBase64, setStandardsFileBase64] = useState<string>('');
  const [standardsFileMimeType, setStandardsFileMimeType] = useState<string>('');
  const [scannedStandardsNotification, setScannedStandardsNotification] = useState<string>('');

  // Inline API key state
  const [tempApiKey, setTempApiKey] = useState<string>('');

  // Results states
  const [hasResults, setHasResults] = useState<boolean>(false);
  const [detectedGrade, setDetectedGrade] = useState<string>('--');
  const [extractedComponents, setExtractedComponents] = useState<Array<{ type: string; text: string }>>([]);
  const [alignments, setAlignments] = useState<Array<{
    type: string;
    elementText: string;
    matchedStandardId: string | null;
    matchedStandardText: string | null;
    score: number;
    evidence: string;
  }>>([]);
  const [gapAnalysis, setGapAnalysis] = useState<Array<{
    standardId: string;
    standardText: string;
    issue: string;
  }>>([]);
  const [suggestedImprovements, setSuggestedImprovements] = useState<Array<{
    area: string;
    problem: string;
    suggestion: string;
  }>>([]);

  // Rewrite / Revision assistant states
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>([]);
  const [rewrittenPlan, setRewrittenPlan] = useState<string>('');
  const [changesMade, setChangesMade] = useState<Array<{
    element: string;
    whatWasChanged: string;
    pedagogicalReason: string;
  }>>([]);
  const [activeTab, setActiveTab] = useState<'alignment' | 'gaps' | 'improvements' | 'rewriter'>('alignment');

  const [localConfidenceThreshold, setLocalConfidenceThreshold] = useState<number>(35);
  const [showRawText, setShowRawText] = useState<boolean>(false);

  // File Inputs
  const standardsFileRef = useRef<HTMLInputElement>(null);
  const lessonFileRef = useRef<HTMLInputElement>(null);

  // --- Load API Key (Session-Only sessionStorage) & DB History ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Wiped on tab/browser close for session security
      const sessionKey = sessionStorage.getItem('align_intel_api_key') || '';
      setApiKey(sessionKey);
      if (!sessionKey) {
        setEngineMode('local'); // Default to local if no key is entered
      }
      
      // Load alignment reports history from SQLite
      fetchHistory();
    }
  }, []);

  useEffect(() => {
    // Dynamically adjust OCR message if engine mode changes
    if (isScannedFile) {
      if (engineMode === 'local') {
        setScannedNotification('⚠️ Scanned file loaded! The Local Offline Engine cannot read scanned image files. Switch to Gemini AI Mode in settings and supply an API key to enable OCR analysis.');
      } else {
        setScannedNotification('✨ Scanned document/image loaded! Gemini Multimodal AI will run OCR visual extraction and alignment checking simultaneously.');
      }
    }
  }, [engineMode]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    sessionStorage.setItem('align_intel_api_key', key);
    if (key) {
      setEngineMode('ai');
    } else {
      setEngineMode('local');
    }
    setShowSettings(false);
  };

  // --- SQLite History API Helpers ---
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setHistoryList(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load sqlite reports history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSaveReport = async () => {
    if (!hasResults) return;
    setIsSavingReport(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        lessonPlanName: lessonPlanFileName || 'Pasted_Lesson_Plan.txt',
        lessonPlanText: lessonPlanText || '(Image-only/Scanned lesson plan processed via Multimodal AI)',
        standardsName: standardsType === 'default' ? 'Colegio Bilingüe ELA Standards' : standardsFileName || 'Pasted_Standards.txt',
        standardsText: standardsType === 'default' ? JSON.stringify(DEFAULT_STANDARDS) : customStandardsText,
        detectedGrade,
        stats: {
          total: extractedComponents.length,
          high: alignments.filter(a => a.score >= localConfidenceThreshold).length,
          low: alignments.filter(a => a.score < localConfidenceThreshold).length
        },
        extractions: extractedComponents,
        alignments,
        gaps: gapAnalysis,
        suggestions: suggestedImprovements,
        rewrittenPlan,
        changesMade
      };

      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Server error saving alignment report');
      }

      setSuccessMsg('Alignment report saved successfully to SQLite database!');
      fetchHistory(); // Refresh history listing
      
      // Auto clear success message after 4s
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(`Database Save Error: ${err.message}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleLoadReport = async (id: number) => {
    setErrorMsg('');
    setSuccessMsg('');
    setProgressMsg('Loading report from database...');
    setIsAnalyzing(true); // Loading overlay

    try {
      const response = await fetch(`/api/history/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report from SQLite.');
      }

      const report = data.report;
      
      // Restore page state variables
      setDetectedGrade(report.detectedGrade);
      setLessonPlanFileName(report.lessonPlanName);
      setLessonPlanText(report.lessonPlanText);
      setLessonPlanFileBase64(''); // Reset active buffers
      setLessonPlanFileMimeType('');
      setIsScannedFile(false);
      setScannedNotification('');
      
      if (report.standardsText) {
        setStandardsType('paste');
        setCustomStandardsText(report.standardsText);
        setStandardsFileName(report.standardsName);
      } else {
        setStandardsType('default');
      }

      setExtractedComponents(report.extractions);
      setAlignments(report.alignments);
      setGapAnalysis(report.gaps);
      setSuggestedImprovements(report.suggestions);
      setRewrittenPlan(report.rewrittenPlan);
      setChangesMade(report.changesMade);
      setHasResults(true);
      setActiveTab('alignment');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Load Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteReport = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row load
    if (!confirm('Are you sure you want to delete this report from your history database?')) return;

    try {
      const response = await fetch(`/api/history/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchHistory(); // Refresh DB list
      } else {
        const data = await response.json();
        alert(`Delete failed: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  // --- Load Sample Lesson Helper ---
  const handleLoadSample = () => {
    setLessonPlanType('paste');
    setLessonPlanText(SAMPLE_LESSON_TEXT);
    setLessonPlanFileName('Sample_Lesson_Grade8.txt');
    setLessonPlanFileBase64('');
    setLessonPlanFileMimeType('');
    setIsScannedFile(false);
    setScannedNotification('');
    setErrorMsg('');
  };

  // --- Toggle Pedagogical Focus Areas ---
  const handleToggleFocus = (id: string) => {
    setSelectedFocuses(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  // --- File Reader helper for Multimodal base64 ---
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // --- Client-side PDF / Word extraction loaders ---
  const extractTextFromPDF = async (file: File): Promise<string> => {
    if (typeof window === 'undefined' || !window.pdfjsLib) {
      throw new Error('PDF parsing library is still loading. Please try again in a moment.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n\n';
    }
    return text;
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    if (typeof window === 'undefined' || !window.mammoth) {
      throw new Error('Word document parsing library is still loading. Please try again in a moment.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  // --- Standards File Upload Handler ---
  const handleStandardsFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStandardsFileName(file.name);
    setIsParsingStandards(true);
    setErrorMsg('');
    setScannedStandardsNotification('');
    setStandardsFileBase64('');
    setStandardsFileMimeType('');
    setIsScannedStandards(false);

    try {
      let text = '';
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') {
        text = await extractTextFromPDF(file);
      } else if (ext === 'docx') {
        text = await extractTextFromDocx(file);
      } else {
        text = await file.text();
      }

      if (!text || text.trim().length < 50) {
        if (ext === 'pdf') {
          setIsScannedStandards(true);
          setStandardsFileMimeType(file.type || 'application/pdf');
          
          const base64 = await fileToBase64(file);
          setStandardsFileBase64(base64);
          setCustomStandardsText('');
          
          if (engineMode === 'local') {
            setScannedStandardsNotification('⚠️ Scanned PDF/Image detected for Standards! Switch to Gemini AI Mode in Settings and enter an API Key to enable visual OCR.');
          } else {
            setScannedStandardsNotification('✨ Scanned PDF detected! Gemini Multimodal AI will visually OCR your curriculum standards.');
          }
        } else {
          throw new Error('No readable text found. Please upload a structured, text-based PDF or Word file.');
        }
      } else {
        setCustomStandardsText(text);
        setIsScannedStandards(false);
        setScannedStandardsNotification('');
        setSuccessMsg(`Text extracted successfully from standards: ${file.name}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Standards Upload Error: ${err.message}`);
      setStandardsFileName('');
    } finally {
      setIsParsingStandards(false);
    }
  };

  // --- Lesson Plan File Upload Handler (Multimodal Enabled) ---
  const handleLessonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLessonPlanFileName(file.name);
    setIsParsingLesson(true);
    setErrorMsg('');
    setSuccessMsg('');
    setScannedNotification('');
    setLessonPlanFileBase64('');
    setLessonPlanFileMimeType('');
    setIsScannedFile(false);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        // PNG/JPEG/WebP direct image file
        setIsScannedFile(true);
        setLessonPlanFileMimeType(file.type);
        
        const base64 = await fileToBase64(file);
        setLessonPlanFileBase64(base64);
        setLessonPlanText(''); // Clear textual inputs
        
        if (engineMode === 'local') {
          setScannedNotification('⚠️ Scanned photo loaded! The Local Offline Engine cannot read image files. Switch to Gemini AI Mode in Settings and enter an API Key to run OCR.');
        } else {
          setScannedNotification('✨ Scanned photo loaded! Gemini Multimodal AI will visually OCR and align this lesson plan directly.');
        }
      } else if (ext === 'pdf') {
        // Check if PDF has selectable text
        let text = await extractTextFromPDF(file);
        
        if (!text || text.trim().length < 50) {
          // Scanned PDF (0 text characters extracted)
          setIsScannedFile(true);
          setLessonPlanFileMimeType(file.type || 'application/pdf');
          
          const base64 = await fileToBase64(file);
          setLessonPlanFileBase64(base64);
          setLessonPlanText('');
          
          if (engineMode === 'local') {
            setScannedNotification('⚠️ Scanned PDF detected (no text elements found)! The Local Offline Engine cannot read scanned image documents. Switch to Gemini AI Mode in Settings and enter an API Key to enable visual OCR.');
          } else {
            setScannedNotification('✨ Scanned PDF detected! Gemini Multimodal AI will run OCR visual extraction and check ELA standards alignment directly.');
          }
        } else {
          // Standard text-based PDF
          setLessonPlanText(text);
          setSuccessMsg(`Text extracted successfully from PDF: ${file.name}`);
        }
      } else if (ext === 'docx') {
        let text = await extractTextFromDocx(file);
        
        if (!text || text.trim().length < 50) {
          // A flat scanned DOCX is highly non-standard. Suggest conversion or copy-pasting.
          throw new Error('Word Document contains scanned image snapshots rather than actual text characters. Please export this document as a PDF file to run visual OCR, or copy-paste the text directly using the PASTE tab.');
        }
        
        setLessonPlanText(text);
        setSuccessMsg(`Text extracted successfully from Word doc: ${file.name}`);
      } else {
        // Plain text file
        let text = await file.text();
        if (!text || text.trim().length < 10) {
          throw new Error('The plain text file is empty.');
        }
        setLessonPlanText(text);
        setSuccessMsg(`Text extracted successfully: ${file.name}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Lesson Plan Upload Error: ${err.message}`);
      setLessonPlanFileName('');
    } finally {
      setIsParsingLesson(false);
    }
  };

  // --- Local / Offline Alignment Engine (Fuse.js & Regex fallback) ---
  const runLocalOfflineEngine = (lessonText: string, standardsDB: typeof DEFAULT_STANDARDS) => {
    setProgressMsg('Extracting elements locally...');
    
    // 1. Grade detection
    const gradeMatch = lessonText.match(/(?:grade|level|cycle)\s*[:\-]?\s*([0-9]{1,2}(?:th|st|nd|rd)?|PK|K|PP|Prepa|Kindergarten)/i);
    const gradeRaw = gradeMatch ? gradeMatch[1].toUpperCase() : "--";
    const normalizedGrade = gradeRaw.replace(/(ST|ND|RD|TH)/g, "");

    // 2. Extract Components using Regex
    const elements: Array<{ type: string; text: string }> = [];

    const extractWithKeywords = (keywords: string[], type: string) => {
      const regexStr = "(?:" + keywords.join("|") + ")\\s*[:\\-]?\\s*([^\\n]{10,1500}?)(?=\\n\\s*(?:objective|activity|assessment|step|procedure|SWBAT|I can|grade|level|cycle|task|grade:|[A-Z]{4,}:)|\\n\\n|$)";
      const regex = new RegExp(regexStr, "gi");
      let m;
      while ((m = regex.exec(lessonText)) !== null) {
        let cleaned = m[1].replace(/\n/g, ' ').replace(/\s\s+/g, ' ').trim();
        if (cleaned.length > 5 && !elements.some(e => e.text === cleaned)) {
          elements.push({ type, text: cleaned });
        }
      }
    };

    extractWithKeywords(["objective", "SWBAT", "I can", "learning goal", "learning target", "competency", "outcome"], "Objective");
    extractWithKeywords(["activity", "procedure", "step", "task", "methodology", "instructional sequence", "development"], "Activity");
    extractWithKeywords(["assessment", "check", "quiz", "formative", "summative", "evaluation", "exit ticket"], "Assessment");

    // Fallback if no elements
    if (elements.length === 0) {
      const candidateLines = lessonText.split(/\n/).filter(line => line.trim().length > 30 && !line.includes("|"));
      candidateLines.forEach(line => {
        if (!line.toLowerCase().includes("page") && !line.toLowerCase().includes("curriculum")) {
          elements.push({ type: 'Possible Element', text: line.trim() });
        }
      });
    }

    setProgressMsg('Performing local fuzzy alignment matrix...');
    // 3. Setup Fuse
    const fuse = new Fuse(standardsDB, {
      keys: ['text'],
      includeScore: true,
      threshold: 0.6,
      ignoreLocation: true,
      useExtendedSearch: true,
      findAllMatches: true
    });

    const localAlignments = elements.map(el => {
      const results = fuse.search(el.text);
      const bestMatch = results[0];
      
      let score = 0;
      let standard = null;
      if (bestMatch) {
        score = Math.round((1 - bestMatch.score!) * 100);
        
        // Specific penalty/bonus for Grade Alignment
        if (normalizedGrade !== "--") {
          const standardGrade = bestMatch.item.grade.toUpperCase().replace(/(ST|ND|RD|TH)/g, "");
          if (standardGrade === normalizedGrade) {
            score = Math.min(100, score + 15); // Grade match bonus
          } else {
            score = Math.max(0, score - 20); // Grade mismatch penalty
          }
        }
        standard = bestMatch.item;
      }

      return {
        type: el.type,
        elementText: el.text,
        matchedStandardId: standard ? standard.id : null,
        matchedStandardText: standard ? standard.text : null,
        score: score,
        evidence: score > 35 
          ? `Local Match Engine identified alignment based on fuzzy keyword correlation (${score}% confidence).` 
          : 'Low semantic alignment detected in local evaluation.'
      };
    });

    // 4. Gap analysis
    const alignedIds = new Set(localAlignments.map(a => a.matchedStandardId).filter(Boolean));
    const localGaps = standardsDB
      .filter(st => {
        if (normalizedGrade !== '--') {
          return st.grade.toUpperCase().replace(/(ST|ND|RD|TH)/g, "") === normalizedGrade && !alignedIds.has(st.id);
        }
        return !alignedIds.has(st.id);
      })
      .slice(0, 4) // Show up to 4 gaps
      .map(st => ({
        standardId: st.id,
        standardText: st.text,
        issue: `This standards objective (${st.id}) is not explicitly addressed in the lesson plan objectives or activities.`
      }));

    // 5. Improvements
    const localImprovements = [
      {
        area: 'Semantic Standards Integration',
        problem: 'Explicit standard codes are not noted in objectives.',
        suggestion: `Annotate your lesson plan with clear standard identifiers (e.g. ${standardsDB[0]?.id || 'ELA.1'}) directly in your objectives list.`
      },
      {
        area: 'Formative Assessment Alignment',
        problem: 'Assessments might not explicitly measure all target objectives.',
        suggestion: 'Create an exit ticket specifically designed to test the critical skill described in the lesson objectives.'
      }
    ];

    setDetectedGrade(gradeRaw);
    setExtractedComponents(elements);
    setAlignments(localAlignments);
    setGapAnalysis(localGaps);
    setSuggestedImprovements(localImprovements);
    setHasResults(true);
    setActiveTab('alignment');
    setRewrittenPlan(''); // Clear old rewritten plans
    setChangesMade([]);
  };

  // --- Main Run Alignment Action ---
  const handleCheckAlignment = async () => {
    if ((!lessonPlanText || !lessonPlanText.trim()) && !lessonPlanFileBase64) {
      setErrorMsg('Please paste a lesson plan or upload a lesson document (PDF, DOCX, or Image) first.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsAnalyzing(true);
    setProgressMsg(isScannedFile ? 'Extracting text via Gemini visual OCR...' : 'Preparing analysis engine...');

    // Select the active standards database
    let activeStandardsDB = DEFAULT_STANDARDS;
    if (standardsType === 'paste' && customStandardsText) {
      // Parse custom standards if pasted
      const lines = customStandardsText.split('\n').filter(l => l.trim().length > 10);
      activeStandardsDB = lines.map((l, idx) => ({
        grade: 'Custom',
        id: `Custom-${idx + 1}`,
        text: l.trim()
      }));
    }

    // Check if we are running AI or Local mode
    if (engineMode === 'local') {
      if (isScannedFile) {
        setErrorMsg('The Local Offline Matching Engine cannot process scanned image files directly. Please switch to Gemini AI Mode in Settings and supply a Gemini API Key to run visual OCR.');
        setIsAnalyzing(false);
        return;
      }

      setTimeout(() => {
        try {
          runLocalOfflineEngine(lessonPlanText, activeStandardsDB);
        } catch (err: any) {
          setErrorMsg(`Local Engine error: ${err.message}`);
        } finally {
          setIsAnalyzing(false);
        }
      }, 800);
      return;
    }

    // AI Mode - Hit API Route
    try {
      setProgressMsg(isScannedFile ? 'Running Gemini visual OCR & semantic standards check...' : 'Aligning curriculum semantically with Gemini AI...');
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardsText: standardsType === 'default' ? JSON.stringify(DEFAULT_STANDARDS) : customStandardsText,
          lessonPlanText,
          customApiKey: apiKey,
          lessonPlanFileBase64,
          lessonPlanFileMimeType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server returned an error');
      }

      setDetectedGrade(data.detectedGrade || '--');
      setExtractedComponents(data.extractedComponents || []);
      setAlignments(data.alignments || []);
      setGapAnalysis(data.gapAnalysis || []);
      setSuggestedImprovements(data.suggestedImprovements || []);
      setHasResults(true);
      setActiveTab('alignment');
      setRewrittenPlan(''); // Clear previous rewrites
      setChangesMade([]);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`AI Alignment Error: ${err.message}. Toggling back to local mode...`);
      // Fallback to local if not scanned file
      if (!isScannedFile) {
        setEngineMode('local');
        runLocalOfflineEngine(lessonPlanText, activeStandardsDB);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Main Rewrite Lesson Action ---
  const handleRewriteLesson = async () => {
    // If it was a scanned file, we must have parsed text already to trigger rewrite
    if (!lessonPlanText || !lessonPlanText.trim()) {
      if (extractedComponents.length > 0) {
        // Set reconstructed lesson plan text from extracted components
        const reconstructedText = extractedComponents.map(e => `${e.type.toUpperCase()}: ${e.text}`).join('\n');
        setLessonPlanText(reconstructedText);
      } else {
        setErrorMsg('Please run the initial alignment check first to extract lesson plan details.');
        return;
      }
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsRewriting(true);
    setProgressMsg('Redesigning curriculum & resolving standards gaps with Gemini AI...');

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardsText: standardsType === 'default' ? JSON.stringify(DEFAULT_STANDARDS) : customStandardsText,
          lessonPlanText,
          gapAnalysis,
          suggestedImprovements,
          focusAreas: selectedFocuses.map(f => {
            const match = PEDAGOGICAL_FOCUS_OPTIONS.find(o => o.id === f);
            return match ? match.label : f;
          }),
          customApiKey: apiKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server failed to rewrite lesson plan.');
      }

      setRewrittenPlan(data.rewrittenLessonPlan);
      setChangesMade(data.changesMade || []);
      setActiveTab('rewriter');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Revision Assistant Error: ${err.message}`);
    } finally {
      setIsRewriting(false);
    }
  };

  // --- Clear / Reset Action ---
  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear your current progress?')) {
      setLessonPlanText('');
      setLessonPlanFileName('');
      setCustomStandardsText('');
      setStandardsFileName('');
      setLessonPlanFileBase64('');
      setLessonPlanFileMimeType('');
      setIsScannedFile(false);
      setScannedNotification('');
      setHasResults(false);
      setExtractedComponents([]);
      setAlignments([]);
      setGapAnalysis([]);
      setSuggestedImprovements([]);
      setRewrittenPlan('');
      setChangesMade([]);
      setErrorMsg('');
      setSuccessMsg('');
    }
  };

  // --- Scanned OCR Extraction Action ---
  const handleExtractOCR = async () => {
    if (!lessonPlanFileBase64 || !lessonPlanFileMimeType) {
      setErrorMsg('No scanned file has been loaded. Please upload a file first.');
      return;
    }

    // Determine key eligibility
    const activeKey = apiKey || '';
    if (!activeKey && engineMode === 'ai') {
      setErrorMsg('Gemini API Key is not configured. Please supply an API key in the settings panel (gear icon) to run visual OCR.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsExtractingOCR(true);
    setProgressMsg('Gemini Multimodal AI is visually reading your pages and performing OCR...');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: lessonPlanFileBase64,
          mimeType: lessonPlanFileMimeType,
          customApiKey: activeKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'OCR extraction failed.');
      }

      setLessonPlanText(data.text);
      setLessonPlanType('paste'); // Toggle view to paste area so they see the text immediately
      setIsScannedFile(false);
      setScannedNotification('');
      setSuccessMsg('✨ Scanned lesson plan text extracted and pasted successfully! You can now edit it or run the alignment matrix.');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`OCR Extraction Error: ${err.message}`);
    } finally {
      setIsExtractingOCR(false);
    }
  };

  // --- Symmetrical Curriculum Standards OCR Action ---
  const handleExtractStandardsOCR = async () => {
    if (!standardsFileBase64 || !standardsFileMimeType) {
      setErrorMsg('No scanned standards file has been loaded. Please upload a file first.');
      return;
    }

    const activeKey = apiKey || '';
    if (!activeKey && engineMode === 'ai') {
      setErrorMsg('Gemini API Key is not configured. Please supply an API key in the settings panel (gear icon) to run visual OCR.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsExtractingStandardsOCR(true);
    setProgressMsg('Gemini Multimodal AI is visually reading your curriculum standards and performing OCR...');

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: standardsFileBase64,
          mimeType: standardsFileMimeType,
          customApiKey: activeKey
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Standards OCR extraction failed.');
      }

      setCustomStandardsText(data.text);
      setStandardsType('paste'); // Toggle view to paste area so they see the standards text immediately
      setIsScannedStandards(false);
      setScannedStandardsNotification('');
      setSuccessMsg('✨ Scanned curriculum standards text extracted and pasted successfully! You can now edit them or run alignment.');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Standards OCR Extraction Error: ${err.message}`);
    } finally {
      setIsExtractingStandardsOCR(false);
    }
  };

  // --- Copy Table Clipboard Helper ---
  const handleCopyTable = () => {
    const tableText = alignments
      .filter(a => a.score >= localConfidenceThreshold)
      .map(a => `${a.type}\t"${a.elementText}"\t${a.matchedStandardId || 'None'}: ${a.matchedStandardText || 'N/A'}\t${a.score}%`)
      .join('\n');
    
    navigator.clipboard.writeText(`Type\tLesson Element\tMatched Standard\tScore\n${tableText}`);
    alert('Alignment table copied to clipboard in tab-separated format! You can paste it into Excel or Google Sheets.');
  };

  // --- Export Report as PDF ---
  const handleExportPDF = () => {
    if (typeof window === 'undefined') return;

    try {
      const { jsPDF } = require('jspdf');
      require('jspdf-autotable');

      const doc = new jsPDF();
      
      // Header Style
      doc.setFillColor(49, 46, 129); // Indigo 900
      doc.rect(0, 0, 210, 40, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(255, 255, 255);
      doc.text("AlignIntel Curriculum Alignment", 15, 20);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(199, 210, 254);
      doc.text(`Target Institution: Colegio Bilingüe Ciudad Blanca  |  Engine Mode: ${engineMode === 'ai' ? 'Gemini Cognitive AI' : 'Local Fuzzy Engine'}`, 15, 30);

      // Report Info
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text("Analysis Metadata", 15, 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Detected Grade Level: ${detectedGrade}`, 15, 60);
      doc.text(`Extracted Elements: ${extractedComponents.length} components checked`, 15, 66);
      doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 72);

      // Alignment Table
      doc.setFont("helvetica", "bold");
      doc.text("Curriculum Standards Alignment Matrix", 15, 82);

      const tableHeaders = [['Type', 'Lesson Element', 'Matched Standard', 'Score']];
      const tableData = alignments
        .filter(a => a.score >= localConfidenceThreshold)
        .map(a => [
          a.type,
          a.elementText.substring(0, 60) + (a.elementText.length > 60 ? '...' : ''),
          a.matchedStandardId ? `[${a.matchedStandardId}] ${a.matchedStandardText?.substring(0, 50)}...` : 'No Match',
          `${a.score}%`
        ]);

      doc.autoTable({
        head: tableHeaders,
        body: tableData,
        startY: 88,
        styles: { fontSize: 8, font: 'helvetica' },
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
        theme: 'striped'
      });

      // Gap Analysis & Suggestions
      let currentY = (doc as any).lastAutoTable.finalY + 12;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Gap Analysis & Recommendation Logs", 15, currentY);
      currentY += 8;

      gapAnalysis.forEach((gap, idx) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(225, 29, 72); // Rose 600
        doc.text(`Gap #${idx + 1}: Missing Standard [${gap.standardId}]`, 15, currentY);
        currentY += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(doc.splitTextToSize(gap.standardText, 180), 15, currentY);
        currentY += 6;
        doc.setTextColor(15, 23, 42);
        doc.text(doc.splitTextToSize(`Insight: ${gap.issue}`, 180), 15, currentY);
        currentY += 10;
      });

      doc.save(`AlignIntel_Report_${new Date().getTime()}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert(`PDF generation failed: ${err.message}`);
    }
  };

  return (
    <>
      {/* External Library Scripts */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          }
        }}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js"
        strategy="lazyOnload"
      />

      {/* Main Page Layout */}
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased pb-12 selection:bg-indigo-500 selection:text-white">
        
        {/* Glow decorative spheres */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[20%] left-1/4 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '12s' }}></div>
        <div className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '10s' }}></div>

        {/* --- Header Section --- */}
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/10 flex items-center justify-center transform group-hover:rotate-6 transition-transform duration-300">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center font-bold text-lg text-white">
                  Ai
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white font-sans">AlignIntel</h1>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20 font-medium">
                    2027 Standards Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">
                  Curriculum Alignment Intelligence
                </p>
              </div>
            </div>

            {/* Header Control Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEngineMode(prev => prev === 'ai' ? 'local' : 'ai')}
                className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium tracking-wide transition-all ${
                  engineMode === 'ai'
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Mode: {engineMode === 'ai' ? 'Gemini AI Engine' : 'Local Fuzzy Engine'}
              </button>

              <button
                onClick={handleLoadSample}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-medium border border-white/5 hover:border-white/10 transition-all shadow-sm flex items-center gap-2"
              >
                <Compass className="w-4 h-4 text-emerald-400" />
                Try Sample Plan
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-indigo-500/30 text-slate-300 hover:text-indigo-400 transition-all shadow-sm relative group"
                title="Cognitive Engine Keys"
              >
                <Settings className="w-5 h-5" />
                {!apiKey && engineMode === 'ai' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
                )}
              </button>

              {hasResults && (
                <button
                  onClick={handleClearAll}
                  className="p-2.5 bg-slate-900 hover:bg-rose-950/20 border border-white/5 hover:border-rose-500/30 rounded-xl text-slate-400 hover:text-rose-400 transition-all shadow-sm"
                  title="Reset Workspace"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* --- Main Dashboard Container --- */}
        <div className="max-w-[1600px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 flex-1">
          
          {/* LEFT COLUMN: Controls & Input Workspace & Database History (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Inline Sleek API Key Entry Panel when key is missing */}
            {!apiKey && (
              <div className="glass-panel rounded-3xl p-5 border border-indigo-500/30 bg-indigo-950/20 shadow-lg shadow-indigo-500/5 flex flex-col gap-3.5 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Key className="w-5.5 h-5.5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">🔑 Link Gemini API Key</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mt-0.5">Paste your developer key here to unlock visual OCR & cognitive AI evaluation instantly:</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="AIzaSy... (Paste Gemini Key here)"
                    onChange={(e) => setTempApiKey(e.target.value)}
                    value={tempApiKey}
                    className="flex-1 bg-slate-950 border border-white/10 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs font-mono outline-none text-slate-200 transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => {
                      if (!tempApiKey || !tempApiKey.trim()) {
                        alert('Please enter a valid key first.');
                        return;
                      }
                      handleSaveApiKey(tempApiKey);
                      setSuccessMsg('✨ API key linked and synchronized successfully!');
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-95"
                  >
                    Link
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-white/5 pt-2">
                  <span>No credit card required. Secure session-only storage.</span>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:underline font-bold"
                  >
                    Get Free Key ↗
                  </a>
                </div>
              </div>
            )}

            {/* Section 1: Standards Upload Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-xl flex flex-col gap-5 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <BookOpen className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">1. Curriculum Standards</h3>
                    <p className="text-xs text-slate-400">Define the benchmark framework</p>
                  </div>
                </div>
                
                {/* Standards Type Selector */}
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setStandardsType('default')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                      standardsType === 'default'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Default
                  </button>
                  <button
                    onClick={() => setStandardsType('paste')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                      standardsType === 'paste'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paste
                  </button>
                  <button
                    onClick={() => setStandardsType('file')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                      standardsType === 'file'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    File
                  </button>
                </div>
              </div>

              {/* Standards Input Fields based on Type */}
              {standardsType === 'default' && (
                <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 text-slate-300">
                  <p className="text-xs font-semibold text-slate-400 mb-2 font-mono">Colegio Bilingüe Ciudad Blanca (CBCB) Standards</p>
                  <div className="text-xs space-y-2 max-h-24 overflow-y-auto pr-1">
                    <p><strong>Standards Matrix:</strong> 240+ Active curriculum objectives</p>
                    <p><strong>Strands Checked:</strong> Reading comprehension, Written exposition, Formal academic speaking, Rhetorical argumentation.</p>
                    <p><strong>Grade Coverage:</strong> Prekinder to Grade 11</p>
                    <p className="text-[10px] text-slate-500 italic mt-2 border-t border-white/5 pt-1.5">
                      Ready to automatically evaluate grade metrics, target standards, and alignment mapping.
                    </p>
                  </div>
                </div>
              )}

              {standardsType === 'paste' && (
                <textarea
                  value={customStandardsText}
                  onChange={(e) => setCustomStandardsText(e.target.value)}
                  placeholder="Paste custom learning standards here (one objective per line)..."
                  className="w-full h-24 bg-slate-900 rounded-2xl p-4 border border-white/5 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 text-slate-100 text-xs font-mono placeholder:text-slate-500 resize-none outline-none transition-all"
                />
              )}

              {standardsType === 'file' && (
                <div className="space-y-3">
                  <div
                    onClick={() => standardsFileRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/5 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 relative group"
                  >
                    <input
                      type="file"
                      ref={standardsFileRef}
                      onChange={handleStandardsFileChange}
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                    />
                    {isParsingStandards ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                        <p className="text-xs text-slate-400">Parsing documents and extracting text standards...</p>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                        <div>
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-white">
                            {standardsFileName || 'Upload Standards Document'}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Accepts PDF, DOCX or TXT files</p>
                        </div>
                      </>
                    )}
                  </div>

                  {scannedStandardsNotification && (
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-[11px] flex items-start gap-2 animate-fadeIn">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                      <div className="space-y-1">
                        <p className="font-semibold leading-relaxed">{scannedStandardsNotification}</p>
                      </div>
                    </div>
                  )}

                  {isScannedStandards && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExtractStandardsOCR();
                        }}
                        disabled={isExtractingStandardsOCR || isParsingStandards || (engineMode === 'local' && !apiKey)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-650 border border-indigo-500/30 disabled:border-white/5 text-white py-2.5 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all duration-300 hover:scale-[1.01]"
                      >
                        {isExtractingStandardsOCR ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            <span>Running AI OCR...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                            <span>Extract Standards Text via Gemini AI</span>
                          </>
                        )}
                      </button>
                      {engineMode === 'local' && !apiKey && (
                        <p className="text-[9px] text-amber-400 text-center italic mt-0.5 leading-relaxed">
                          * Supply your API key in settings (gear icon) and select Gemini mode to run visual OCR.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: Lesson Plan Input Card */}
            <div className="glass-panel rounded-3xl p-6 shadow-xl flex flex-col gap-5 border border-white/5 flex-1 min-h-[300px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <FileText className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">2. Lesson Plan Input</h3>
                    <p className="text-xs text-slate-400">Input plan content for alignment check</p>
                  </div>
                </div>
                
                {/* Lesson Plan Type Selector */}
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-white/5">
                  <button
                    onClick={() => setLessonPlanType('paste')}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                      lessonPlanType === 'paste'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paste
                  </button>
                  <button
                    onClick={() => setLessonPlanType('file')}
                    className={`px-3.5 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider transition-all ${
                      lessonPlanType === 'file'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    File
                  </button>
                </div>
              </div>

              {/* Lesson Input Fields */}
              {lessonPlanType === 'paste' && (
                <textarea
                  value={lessonPlanText}
                  onChange={(e) => setLessonPlanText(e.target.value)}
                  placeholder="Paste your classroom lesson plan here..."
                  className="w-full flex-1 min-h-[140px] bg-slate-900 rounded-2xl p-4 border border-white/5 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 text-slate-100 text-sm placeholder:text-slate-500 resize-none outline-none transition-all font-sans leading-relaxed"
                />
              )}

              {lessonPlanType === 'file' && (
                <div
                  onClick={() => lessonFileRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 relative group flex-1 min-h-[140px]"
                >
                  <input
                    type="file"
                    ref={lessonFileRef}
                    onChange={handleLessonFileChange}
                    className="hidden"
                    accept=".pdf,.docx,.txt,image/*"
                  />
                  {isParsingLesson ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                      <p className="text-xs text-slate-400">Extracting lesson plan structured outline...</p>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      <div>
                        <p className="text-sm font-semibold text-slate-200 group-hover:text-white">
                          {lessonPlanFileName || 'Upload Lesson Plan (PDF/DOCX/Image)'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Drag and drop or click to browse</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">PDFs, Word docs, PNG, JPG, or TXT supported</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Multimodal/OCR Notification Card */}
              {scannedNotification && (
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs flex items-start gap-2.5 animate-fadeIn">
                  <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                  <div className="space-y-1">
                    <p className="font-semibold leading-relaxed">{scannedNotification}</p>
                    {isScannedFile && engineMode === 'ai' && (
                      <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                        * Multimodal parsing visualizes PDF pages/images directly. Higher API tokens consume slightly more than direct text matching.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isScannedFile && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleExtractOCR}
                    disabled={isExtractingOCR || isParsingLesson || (engineMode === 'local' && !apiKey)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-650 border border-indigo-500/30 disabled:border-white/5 text-white py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all duration-300 hover:scale-[1.01]"
                  >
                    {isExtractingOCR ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                        <span>Running AI Visual OCR Extraction...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-indigo-450 animate-pulse" />
                        <span>Extract & Paste Text via Gemini AI</span>
                      </>
                    )}
                  </button>
                  {engineMode === 'local' && !apiKey && (
                    <p className="text-[10px] text-amber-400 text-center italic mt-0.5 leading-relaxed">
                      * Supply your API key in settings (gear icon) and select Gemini mode to run visual OCR.
                    </p>
                  )}
                </div>
              )}

              {/* Lower Actions / Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Advanced Threshold Settings */}
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
                    <span>Matching Sensitivity</span>
                    <span className="text-indigo-400 font-mono">{localConfidenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    step="5"
                    value={localConfidenceThreshold}
                    onChange={(e) => setLocalConfidenceThreshold(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-medium">
                    <span>Loose</span>
                    <span>Moderate</span>
                    <span>Strict</span>
                  </div>
                </div>

                {/* Primary alignment check button */}
                <button
                  onClick={handleCheckAlignment}
                  disabled={isAnalyzing || isParsingLesson || isParsingStandards}
                  className="w-full h-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:from-indigo-800 disabled:to-indigo-900 disabled:cursor-not-allowed text-white rounded-2xl font-semibold tracking-wide text-sm transition-all duration-300 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 py-4"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isScannedFile ? 'Extracting via AI...' : 'Checking Alignment...'}</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>{isScannedFile ? 'Run OCR & Align' : 'Analyze Alignment'}</span>
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            {/* Section 3: SQLite History Database Deck */}
            <div className="glass-panel rounded-3xl p-6 shadow-xl flex flex-col gap-4 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                    <DbIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Saved Alignments Database</h3>
                    <p className="text-[10px] text-slate-400">SQLite Server History Archive</p>
                  </div>
                </div>
                <button
                  onClick={fetchHistory}
                  className="p-1.5 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                  title="Reload database"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 text-xs">
                {isLoadingHistory && historyList.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 font-medium">Querying local SQLite files...</div>
                ) : historyList.length === 0 ? (
                  <div className="p-4 border border-white/5 bg-slate-950/60 rounded-xl text-center text-slate-500 italic">
                    SQLite history is currently empty. Run an alignment and click "Save to Database" in the toolbar to archive it.
                  </div>
                ) : (
                  historyList.map((rep) => (
                    <div
                      key={rep.id}
                      onClick={() => handleLoadReport(rep.id)}
                      className="p-3 bg-slate-900 hover:bg-slate-800/80 border border-white/5 hover:border-indigo-500/20 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-1.5 py-0.25 rounded font-bold uppercase tracking-wider font-mono">
                            {rep.detectedGrade}
                          </span>
                          <p className="font-semibold text-slate-200 truncate">{rep.lessonPlanName}</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                          <span className="truncate">Standards: {rep.standardsName}</span>
                          <span className="shrink-0">•</span>
                          <span className="text-emerald-400 font-mono font-bold">
                            {rep.stats.high} Aligned
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-mono shrink-0 hidden sm:inline">
                          {new Date(rep.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          onClick={(e) => handleDeleteReport(rep.id, e)}
                          className="p-1.5 bg-slate-950 hover:bg-rose-950/20 border border-white/5 hover:border-rose-500/25 rounded-lg text-slate-500 group-hover:text-rose-400 transition-colors"
                          title="Purge record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Results Dashboard Area (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {!hasResults ? (
              // Empty state dashboard - "Insanely Good and Professional" initial display
              <div className="glass-panel rounded-3xl p-12 shadow-xl border border-white/5 flex flex-col items-center justify-center text-center gap-6 min-h-[600px] relative overflow-hidden flex-1">
                
                {/* Floating glassmorphic grid background element */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.05),transparent_60%)] pointer-events-none"></div>

                <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-inner animate-bounce" style={{ animationDuration: '4s' }}>
                  <Sparkles className="w-10 h-10" />
                </div>

                <div className="space-y-3 max-w-lg">
                  <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl font-sans">
                    AlignIntel Analytics Board
                  </h2>
                  <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                    Ensure educational standards alignment seamlessly. Paste or upload your curriculum standards and lesson plan documents (including images or scanned PDFs!) to map alignments, run gap analysis, and explore the AI revision generator.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-6">
                  <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                    <Layers className="w-6 h-6 text-indigo-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">1. Extraction</h4>
                    <p className="text-[10px] text-slate-400">Isolate objectives, methods, & quizzes automatically.</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                    <Compass className="w-6 h-6 text-emerald-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">2. Alignment Matrix</h4>
                    <p className="text-[10px] text-slate-400">Match lesson objectives with provisional standards.</p>
                  </div>
                  <div className="p-4 bg-slate-900/60 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">3. AI Revision</h4>
                    <p className="text-[10px] text-slate-400">Remap objectives or trigger full curriculum rewrites.</p>
                  </div>
                </div>

                <button
                  onClick={handleLoadSample}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md shadow-indigo-600/20 hover:scale-105 transition-all flex items-center gap-2 border border-indigo-500/30"
                >
                  <Compass className="w-4 h-4" />
                  Load Grade 8 Demo Lesson
                </button>
              </div>
            ) : (
              // Results dashboard structure
              <div className="flex flex-col gap-6 flex-1">
                
                {/* Stats Dashboard Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 relative group">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Total Elements</span>
                    <p className="text-2xl font-extrabold text-indigo-400 mt-1">{extractedComponents.length}</p>
                    <div className="text-[9px] text-slate-500 mt-1">Extracted components checked</div>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Strong Match</span>
                    <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                      {alignments.filter(a => a.score >= localConfidenceThreshold).length}
                    </p>
                    <div className="text-[9px] text-slate-500 mt-1">Above {localConfidenceThreshold}% threshold</div>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Weak Alignment</span>
                    <p className="text-2xl font-extrabold text-rose-400 mt-1">
                      {alignments.filter(a => a.score > 0 && a.score < localConfidenceThreshold).length}
                    </p>
                    <div className="text-[9px] text-slate-500 mt-1">Below target confidence</div>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-white/5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Target Grade</span>
                    <p className="text-2xl font-extrabold text-purple-400 mt-1 uppercase">{detectedGrade}</p>
                    <div className="text-[9px] text-slate-500 mt-1">Identified curriculum cycle</div>
                  </div>
                </div>

                {/* Dashboard Tabs & Content Area */}
                <div className="glass-panel rounded-3xl shadow-xl flex flex-col border border-white/5 flex-1 overflow-hidden min-h-[500px]">
                  
                  {/* Tabs Header */}
                  <div className="border-b border-white/5 bg-slate-900/60 p-2.5 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setActiveTab('alignment')}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                          activeTab === 'alignment'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Alignment Matrix
                      </button>
                      <button
                        onClick={() => setActiveTab('gaps')}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                          activeTab === 'gaps'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Gap Analysis ({gapAnalysis.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('improvements')}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
                          activeTab === 'improvements'
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Improvement Logs
                      </button>
                      <button
                        onClick={() => setActiveTab('rewriter')}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                          activeTab === 'rewriter'
                            ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        AI Revision
                      </button>
                    </div>

                    {/* Quick Action Utilities */}
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={handleSaveReport}
                        disabled={isSavingReport}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 font-bold uppercase tracking-wider text-[10px] text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                        title="Save findings to SQLite"
                      >
                        {isSavingReport ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <DbIcon className="w-3.5 h-3.5" />
                        )}
                        <span>Save to DB</span>
                      </button>
                      <button
                        onClick={handleCopyTable}
                        className="p-2 bg-slate-950/80 border border-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy Alignment Table"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="p-2 bg-slate-950/80 border border-white/5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                        title="Export Report PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: ALIGNMENT MATRIX TABLE */}
                  {activeTab === 'alignment' && (
                    <div className="flex-1 overflow-auto p-6">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                              <th className="pb-3 pr-4" style={{ width: '15%' }}>Element</th>
                              <th className="pb-3 pr-4" style={{ width: '38%' }}>Plan Element text</th>
                              <th className="pb-3 pr-4" style={{ width: '37%' }}>Matched Curriculum Standard</th>
                              <th className="pb-3 text-center" style={{ width: '10%' }}>Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {alignments.filter(a => a.score >= localConfidenceThreshold).length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-8 text-center text-xs text-slate-400 italic">
                                  No alignments found above the active {localConfidenceThreshold}% matching threshold. Try reducing sensitivity in settings.
                                </td>
                              </tr>
                            ) : (
                              alignments
                                .filter(a => a.score >= localConfidenceThreshold)
                                .map((align, idx) => {
                                  let typeColor = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
                                  if (align.type === 'Activity') typeColor = 'bg-blue-500/10 text-blue-300 border-blue-500/20';
                                  if (align.type === 'Assessment') typeColor = 'bg-purple-500/10 text-purple-300 border-purple-500/20';

                                  let scoreColor = 'text-emerald-400 font-bold';
                                  if (align.score < 60) scoreColor = 'text-amber-400 font-semibold';
                                  if (align.score < 30) scoreColor = 'text-rose-400';

                                  return (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                      <td className="py-4 pr-4">
                                        <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${typeColor}`}>
                                          {align.type}
                                        </span>
                                      </td>
                                      <td className="py-4 pr-4 text-xs font-medium text-slate-200 italic leading-relaxed">
                                        "{align.elementText}"
                                      </td>
                                      <td className="py-4 pr-4 text-xs leading-relaxed text-slate-300">
                                        {align.matchedStandardId ? (
                                          <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <span className="text-[10px] bg-slate-900 border border-white/10 text-indigo-300 px-1.5 py-0.25 font-bold rounded font-mono">
                                                {align.matchedStandardId}
                                              </span>
                                              <span className="text-[9px] text-slate-400 font-semibold">Grade ELA standard</span>
                                            </div>
                                            <span className="text-slate-300">{align.matchedStandardText}</span>
                                            <p className="text-[10px] text-slate-500 italic mt-1 font-mono">{align.evidence}</p>
                                          </div>
                                        ) : (
                                          <span className="text-slate-500 italic">No curriculum standard match detected above threshold.</span>
                                        )}
                                      </td>
                                      <td className="py-4 text-center font-mono text-xs">
                                        <span className={scoreColor}>{align.score}%</span>
                                      </td>
                                    </tr>
                                  );
                                })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: GAP ANALYSIS */}
                  {activeTab === 'gaps' && (
                    <div className="flex-1 overflow-auto p-6 space-y-4">
                      {gapAnalysis.length === 0 ? (
                        <div className="text-center py-12">
                          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                          <h4 className="text-sm font-semibold text-slate-100">Zero Coverage Gaps Found</h4>
                          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                            Fantastic! Every core grade standard in the target standards block is covered cleanly in your lesson activities.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {gapAnalysis.map((gap, idx) => (
                            <div key={idx} className="p-4 bg-rose-500/5 border border-rose-500/15 rounded-2xl flex gap-3.5">
                              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-rose-500/10 border border-rose-500/25 text-rose-300 px-2 py-0.5 rounded font-bold font-mono">
                                    {gap.standardId}
                                  </span>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Target Standard Gap</span>
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed">{gap.standardText}</p>
                                <p className="text-[10px] text-rose-300 bg-rose-500/10 p-2 rounded-lg font-mono">{gap.issue}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: IMPROVEMENTS LOGS */}
                  {activeTab === 'improvements' && (
                    <div className="flex-1 overflow-auto p-6 space-y-4">
                      {suggestedImprovements.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-8">
                          No specific structural gaps identified. Your instruction alignment matches expectations perfectly!
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {suggestedImprovements.map((imp, idx) => (
                            <div key={idx} className="p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex gap-4">
                              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                <Sliders className="w-5 h-5" />
                              </div>
                              <div className="space-y-1.5">
                                <h4 className="text-sm font-bold text-indigo-300">{imp.area}</h4>
                                <p className="text-xs text-slate-400 italic leading-relaxed">
                                  <strong>Observation:</strong> {imp.problem}
                                </p>
                                <div className="p-3.5 bg-slate-900 border border-white/5 rounded-xl text-xs text-slate-300 leading-relaxed">
                                  <strong>Actionable recommendation:</strong> {imp.suggestion}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: REWRITER & REVISION ASSISTANT */}
                  {activeTab === 'rewriter' && (
                    <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                      
                      {/* Rewrite Engine Settings Header */}
                      <div className="p-5 bg-slate-900 border border-white/5 rounded-2xl space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                            Alignment revision assistant
                          </h4>
                          <p className="text-xs text-slate-400">
                            Re-synthesize your lesson plan. AI will automatically integrate curriculum standard targets and suggest structured alignments.
                          </p>
                        </div>

                        {/* Focus tag selectors */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            Optional Revision Focus Filters:
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {PEDAGOGICAL_FOCUS_OPTIONS.map((opt) => {
                              const isSel = selectedFocuses.includes(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => handleToggleFocus(opt.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                    isSel
                                      ? 'bg-emerald-600/25 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/5'
                                      : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-200'
                                  }`}
                                  title={opt.description}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Rewrite Trigger Button */}
                        <button
                          onClick={handleRewriteLesson}
                          disabled={isRewriting || engineMode === 'local'}
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs tracking-wider uppercase transition-all duration-300 shadow-lg shadow-emerald-500/5 flex items-center justify-center gap-2"
                        >
                          {isRewriting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Rewriting & Aligning...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Generate Fully-Aligned Revised Lesson Plan</span>
                            </>
                          )}
                        </button>
                        {engineMode === 'local' && (
                          <p className="text-[10px] text-amber-400 italic">
                            ⚠️ AI Redesign is unavailable in Local mode. Please supply a Gemini API Key in Settings to enable deep lesson rewriting.
                          </p>
                        )}
                      </div>

                      {/* Side by Side Display if rewritten plan available */}
                      {rewrittenPlan ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            
                            {/* Original Plan view */}
                            <div className="flex flex-col gap-2">
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Original plan</h5>
                              <div className="bg-slate-950 p-5 rounded-2xl border border-white/5 font-sans text-slate-300 text-xs leading-relaxed max-h-[420px] overflow-y-auto whitespace-pre-wrap">
                                {lessonPlanText || '(Image-only/Scanned lesson plan processed via Multimodal AI)'}
                              </div>
                            </div>

                            {/* Rewritten Plan view */}
                            <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center">
                                <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono text-emerald-400 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Fully-aligned rewritten plan
                                </h5>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(rewrittenPlan);
                                    alert('Rewritten lesson plan copied to clipboard!');
                                  }}
                                  className="text-[10px] text-indigo-400 hover:text-indigo-200 underline font-bold uppercase tracking-wider"
                                >
                                  Copy Text
                                </button>
                              </div>
                              <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-500/20 font-sans text-slate-200 text-xs leading-relaxed max-h-[420px] overflow-y-auto prose prose-invert prose-xs">
                                <div className="whitespace-pre-wrap">{rewrittenPlan}</div>
                              </div>
                            </div>

                          </div>

                          {/* Changes Logs list */}
                          {changesMade.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Revision Action Logs</h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {changesMade.map((chg, idx) => (
                                  <div key={idx} className="p-4 bg-slate-900 border border-white/5 rounded-xl space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider font-mono">
                                        {chg.element}
                                      </span>
                                    </div>
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
                      ) : (
                        <div className="p-8 border border-white/5 bg-slate-900/40 rounded-2xl text-center text-xs text-slate-400 italic">
                          Click the generate button above to run the deep revision synthesizer. Gaps, missing curriculum standards, and your selected focuses will be fully integrated.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw Extracted Text panel for advanced verification */}
                  <div className="bg-slate-950 p-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="chk-raw-text"
                        checked={showRawText}
                        onChange={(e) => setShowRawText(e.target.checked)}
                        className="w-3.5 h-3.5 accent-indigo-500 rounded border-white/5 bg-slate-900 cursor-pointer"
                      />
                      <label htmlFor="chk-raw-text" className="text-xs text-slate-400 font-semibold cursor-pointer">
                        Show raw extracted text
                      </label>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Target standards alignment verified
                    </div>
                  </div>

                  {showRawText && (
                    <div className="p-5 bg-slate-950 border-t border-white/5 font-mono text-[10px] text-slate-400 max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {lessonPlanText || '(Image-only/Scanned lesson plan processed via Multimodal AI)'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* --- SETTINGS / API KEY MODAL --- */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
            <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10 space-y-6 relative">
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-400" />
                  Cognitive Engine Settings
                </h3>
                <p className="text-xs text-slate-400">
                  Configure keys for advanced AI evaluation.
                </p>
              </div>

              {/* Engine Mode Toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Analysis Pipeline Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setEngineMode('ai')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      engineMode === 'ai'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Gemini AI Model
                  </button>
                  <button
                    onClick={() => setEngineMode('local')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      engineMode === 'local'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Local Regex & Fuzzy
                  </button>
                </div>
              </div>

              {/* API Key input */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Gemini API Key (Session-Only)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste your Gemini API Key..."
                  className="w-full bg-slate-950 rounded-xl p-3 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-xs placeholder:text-slate-500 outline-none transition-all font-mono"
                />
                <div className="text-[10px] text-slate-500 space-y-1.5">
                  <p>
                    Get a developer key free from the{' '}
                    <a
                      href="https://aistudio.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:underline font-bold"
                    >
                      Google AI Studio portal
                    </a>.
                  </p>
                  <p className="italic text-rose-400/90 font-medium">
                    * Wiped immediately when you close this browser tab/window for maximum security.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end border-t border-white/5 pt-4">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveApiKey(apiKey)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-indigo-600/10"
                >
                  Save and Sync
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Loading overlay during async check */}
        {(isAnalyzing || isRewriting || isExtractingOCR || isExtractingStandardsOCR) && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
            <div className="p-8 glass-panel border border-white/10 rounded-3xl max-w-sm w-full flex flex-col items-center justify-center text-center gap-6 shadow-2xl relative">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-slate-900 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-indigo-400 animate-pulse">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">Cognitive Processing</h4>
                <p className="text-xs text-indigo-300 font-medium animate-pulse">{progressMsg}</p>
                <p className="text-[10px] text-slate-500 italic mt-3 border-t border-white/5 pt-2">
                  "Alignment intelligence streamlines education standards parity checking."
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
