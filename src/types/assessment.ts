// ============================================================
// SchoolOS — Contrato de Datos de la Pasarela de Preguntas
// Modelos para resolución online, estado de sesión y API payloads
// ============================================================

import type { BlockType } from './content';

export type AssessmentQuestionType = 'multiple_choice' | 'true_false' | 'open_text' | 'matching';

export interface AssessmentReferenceBlock {
  id: string;
  order: number;
  type: BlockType;
  title?: string;
  content: string;
  caption?: string;
}

export interface AssessmentQuestion {
  id: string;
  order: number;
  type: AssessmentQuestionType;
  prompt: string;
  options?: string[];
  correctAnswerIndex: number;
  explanation?: string;
  imageUrl?: string;
  imageCaption?: string;
  referencedBlockId?: string;
  referencedBlock?: AssessmentReferenceBlock;
  points?: number;
}

export interface AssessmentData {
  id: string;
  guideId: string;
  guideTitle: string;
  courseId: string;
  courseName: string;
  teacherName?: string;
  schoolName?: string;
  description?: string;
  timeLimitMinutes?: number; // ej: 25 min (0 o undefined = sin límite)
  passingScore: number;      // ej: 70 (sobre 100)
  allowRetries?: boolean;
  showInstantFeedback?: boolean;
  blocks: AssessmentReferenceBlock[];
  questions: AssessmentQuestion[];
}

export interface StudentAnswerItem {
  questionId: string;
  selectedOptionIndex?: number;
  textAnswer?: string;
  isFlagged?: boolean;
  timeSpentSeconds?: number;
}

export type AssessmentSessionStatus = 'intro' | 'in_progress' | 'reviewing' | 'completed' | 'timeout';

export interface StudentAttemptState {
  attemptId: string;
  assessmentId: string;
  guideId: string;
  studentId: string;
  studentName?: string;
  startedAt: string;
  submittedAt?: string;
  currentQuestionIndex: number;
  timeRemainingSeconds: number;
  answers: Record<string, StudentAnswerItem>;
  flaggedQuestionIds: string[];
  status: AssessmentSessionStatus;
}

// ── PAYLOAD DE ENVÍO A LA API (POST /api/evaluations/submit) ──

export interface AssessmentSubmissionPayload {
  attemptId: string;
  assessmentId: string;
  guideId: string;
  studentId: string;
  startedAt: string;
  submittedAt: string;
  totalTimeSpentSeconds: number;
  answers: {
    questionId: string;
    selectedOptionIndex?: number;
    textAnswer?: string;
    timeSpentSeconds?: number;
  }[];
}

// ── RESULTADO EVALUADO RETORNADO POR LA API O MOTOR LOCAL ──

export interface QuestionGradingDetail {
  questionId: string;
  order: number;
  prompt: string;
  questionType: AssessmentQuestionType;
  options?: string[];
  selectedOptionIndex?: number;
  correctAnswerIndex: number;
  isCorrect: boolean;
  explanation?: string;
  imageUrl?: string;
  imageCaption?: string;
  referencedBlockId?: string;
  referencedBlock?: AssessmentReferenceBlock;
}

export interface AssessmentResultSummary {
  attemptId: string;
  assessmentId: string;
  guideTitle: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number; // 0 - 100
  passingScore: number;
  passed: boolean;
  totalTimeSpentSeconds: number;
  submittedAt: string;
  details: QuestionGradingDetail[];
}
