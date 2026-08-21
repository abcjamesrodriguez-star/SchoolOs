// ============================================================
// SchoolOS — Motor de Evaluación y API Adapter (Assessment API)
// Transformación, auto-calificación y simulación de endpoints
// ============================================================

import type {
  AssessmentData,
  AssessmentQuestion,
  AssessmentReferenceBlock,
  AssessmentResultSummary,
  AssessmentSubmissionPayload,
  QuestionGradingDetail,
  StudentAnswerItem,
} from '../types/assessment';

/**
 * Convierte el estado del editor de guías (StudioGuideState) a la estructura limpia AssessmentData
 */
export function buildAssessmentDataFromStudio(guide: {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  estimatedMinutes?: number;
  blocks: {
    id: string;
    order: number;
    type: any;
    title?: string;
    content: string;
    caption?: string;
  }[];
  questions: {
    id: string;
    prompt: string;
    type: any;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
    referencedBlockId: string;
  }[];
}): AssessmentData {
  const blocksMap = new Map<string, AssessmentReferenceBlock>();
  const blocks: AssessmentReferenceBlock[] = guide.blocks.map((b) => {
    const blk: AssessmentReferenceBlock = {
      id: b.id,
      order: b.order,
      type: b.type,
      title: b.title,
      content: b.content,
      caption: b.caption,
    };
    blocksMap.set(b.id, blk);
    return blk;
  });

  const questions: AssessmentQuestion[] = guide.questions.map((q, idx) => ({
    id: q.id || `q-${idx + 1}`,
    order: idx + 1,
    type: q.type || 'multiple_choice',
    prompt: q.prompt || `Pregunta ${idx + 1}`,
    options: q.options && q.options.length > 0 ? q.options : ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
    correctAnswerIndex: q.correctAnswerIndex ?? 0,
    explanation: q.explanation || '',
    imageUrl: (q as any).imageUrl || undefined,
    imageCaption: (q as any).imageCaption || undefined,
    referencedBlockId: q.referencedBlockId || undefined,
    referencedBlock: q.referencedBlockId ? blocksMap.get(q.referencedBlockId) : undefined,
    points: 10,
  }));

  return {
    id: `eval-${guide.id}`,
    guideId: guide.id,
    guideTitle: guide.title || 'Guía de Aprendizaje Pedagógico',
    courseId: guide.courseId,
    courseName: guide.courseName,
    description: guide.description,
    timeLimitMinutes: guide.estimatedMinutes || 25,
    passingScore: 70,
    allowRetries: true,
    showInstantFeedback: true,
    blocks,
    questions,
  };
}

/**
 * Motor de calificación determinístico puro
 */
export function gradeAssessmentAttempt(
  assessment: AssessmentData,
  answers: Record<string, StudentAnswerItem>,
  attemptId: string,
  totalTimeSpentSeconds: number
): AssessmentResultSummary {
  let correctCount = 0;
  let answeredCount = 0;
  const details: QuestionGradingDetail[] = [];

  assessment.questions.forEach((q) => {
    const ans = answers[q.id];
    const isAnswered = ans && ans.selectedOptionIndex !== undefined;
    if (isAnswered) answeredCount++;

    const isCorrect = isAnswered && ans.selectedOptionIndex === q.correctAnswerIndex;
    if (isCorrect) correctCount++;

    details.push({
      questionId: q.id,
      order: q.order,
      prompt: q.prompt,
      questionType: q.type,
      options: q.options,
      selectedOptionIndex: ans?.selectedOptionIndex,
      correctAnswerIndex: q.correctAnswerIndex,
      isCorrect,
      explanation: q.explanation,
      imageUrl: q.imageUrl,
      imageCaption: q.imageCaption,
      referencedBlockId: q.referencedBlockId,
      referencedBlock: q.referencedBlock,
    });
  });

  const totalQuestions = assessment.questions.length;
  const wrongCount = answeredCount - correctCount;
  const unansweredCount = totalQuestions - answeredCount;
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = score >= assessment.passingScore;

  return {
    attemptId,
    assessmentId: assessment.id,
    guideTitle: assessment.guideTitle,
    totalQuestions,
    answeredCount,
    correctCount,
    wrongCount,
    unansweredCount,
    score,
    passingScore: assessment.passingScore,
    passed,
    totalTimeSpentSeconds,
    submittedAt: new Date().toISOString(),
    details,
  };
}

/**
 * Simulación de llamada a API de entrega (POST /api/evaluations/submit)
 * Preparado para reemplazar con fetch() a endpoint REST o GraphQL real.
 */
export async function submitAssessmentToApi(
  payload: AssessmentSubmissionPayload,
  assessmentData: AssessmentData
): Promise<AssessmentResultSummary> {
  // Simular latencia de red de 400ms
  await new Promise((resolve) => setTimeout(resolve, 400));

  const answersMap: Record<string, StudentAnswerItem> = {};
  payload.answers.forEach((a) => {
    answersMap[a.questionId] = {
      questionId: a.questionId,
      selectedOptionIndex: a.selectedOptionIndex,
      textAnswer: a.textAnswer,
      timeSpentSeconds: a.timeSpentSeconds,
    };
  });

  const result = gradeAssessmentAttempt(
    assessmentData,
    answersMap,
    payload.attemptId,
    payload.totalTimeSpentSeconds
  );

  // Guardar en historial local como backup
  try {
    const historyKey = `schoolos_eval_history_${payload.assessmentId}`;
    const previous = JSON.parse(localStorage.getItem(historyKey) || '[]');
    previous.push(result);
    localStorage.setItem(historyKey, JSON.stringify(previous));
  } catch (_) {}

  return result;
}
