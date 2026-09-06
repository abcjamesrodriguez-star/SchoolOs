import React, { useState, useEffect, useRef } from 'react';
import type {
  AssessmentData,
  AssessmentResultSummary,
  AssessmentSessionStatus,
  StudentAnswerItem,
} from '../../../types/assessment';
import { submitAssessmentToApi } from '../../../lib/assessment-api';
import { AssessmentHeader } from './AssessmentHeader';
import { QuestionCard } from './QuestionCard';
import { QuestionNavigationGrid } from './QuestionNavigationGrid';
import { AssessmentSummaryModal } from './AssessmentSummaryModal';
import { AssessmentResultView } from './AssessmentResultView';

interface Props {
  assessmentData: AssessmentData;
  onClose?: () => void;
  isModal?: boolean;
}

export const AssessmentRunner: React.FC<Props> = ({
  assessmentData,
  onClose,
  isModal = false,
}) => {
  const [status, setStatus] = useState<AssessmentSessionStatus>('intro');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, StudentAnswerItem>>({});
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number>(
    (assessmentData.timeLimitMinutes || 25) * 60
  );
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<AssessmentResultSummary | null>(null);

  const startTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);

  const totalQuestions = assessmentData.questions.length;
  const isTimed = !!(assessmentData.timeLimitMinutes && assessmentData.timeLimitMinutes > 0);
  const currentQuestion = assessmentData.questions[currentIndex];

  // Iniciar temporizador cuando el estado cambia a 'in_progress'
  useEffect(() => {
    if (status === 'in_progress' && isTimed) {
      timerIntervalRef.current = setInterval(() => {
        setTimeRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            handleAutoSubmitOnTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [status, isTimed]);

  // Manejar selección de opción
  function handleSelectOption(optionIndex: number) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        questionId: currentQuestion.id,
        selectedOptionIndex: optionIndex,
        timeSpentSeconds: 0,
      },
    }));
  }

  // Alternar banderín de marcar para revisión
  function handleToggleFlag() {
    if (!currentQuestion) return;
    setFlaggedQuestionIds((prev) =>
      prev.includes(currentQuestion.id)
        ? prev.filter((id) => id !== currentQuestion.id)
        : [...prev, currentQuestion.id]
    );
  }

  // Navegación
  function handleNext() {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowSummaryModal(true);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }

  // Auto-entrega por tiempo agotado
  async function handleAutoSubmitOnTimeout() {
    setStatus('timeout');
    await executeSubmission();
  }

  // Ejecución del envío
  async function executeSubmission() {
    setIsSubmitting(true);
    const totalTimeSpentSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    const payload = {
      attemptId: `att-${Date.now()}`,
      assessmentId: assessmentData.id,
      guideId: assessmentData.guideId,
      studentId: 'std-current-user',
      startedAt: new Date(startTimeRef.current).toISOString(),
      submittedAt: new Date().toISOString(),
      totalTimeSpentSeconds,
      answers: Object.values(answers).map((a) => ({
        questionId: a.questionId,
        selectedOptionIndex: a.selectedOptionIndex,
        textAnswer: a.textAnswer,
        timeSpentSeconds: a.timeSpentSeconds || 0,
      })),
    };

    try {
      const gradingResult = await submitAssessmentToApi(payload, assessmentData);
      setResult(gradingResult);
      setStatus('completed');
      setShowSummaryModal(false);
    } catch (err) {
      alert('Ocurrió un error al enviar la evaluación. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Reiniciar evaluación
  function handleRetry() {
    setAnswers({});
    setFlaggedQuestionIds([]);
    setCurrentIndex(0);
    setTimeRemainingSeconds((assessmentData.timeLimitMinutes || 25) * 60);
    startTimeRef.current = Date.now();
    setResult(null);
    setStatus('in_progress');
  }

  const answeredCount = Object.values(answers).filter((a) => a.selectedOptionIndex !== undefined).length;

  return (
    <div
      style={{
        background: '#FAF9F6',
        color: '#12110E',
        minHeight: isModal ? 'auto' : '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── 1. PANTALLA INTRODUCTORIA ── */}
      {status === 'intro' && (
        <div style={{ maxWidth: 680, margin: '40px auto', padding: '32px 24px', background: '#FFFFFF', border: '3px solid var(--ink)', boxShadow: '8px 8px 0 rgba(18,17,14,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 900, background: 'var(--rust)', color: '#fff', padding: '2px 8px', textTransform: 'uppercase' }}>
              {assessmentData.courseName} · EVALUACIÓN ONLINE
            </span>
            {onClose && (
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', fontWeight: 800 }}>
                ✕
              </button>
            )}
          </div>

          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 800, color: 'var(--ink)', margin: '0 0 10px 0' }}>
            {assessmentData.guideTitle}
          </h1>

          {assessmentData.description && (
            <p style={{ fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 20 }}>
              {assessmentData.description}
            </p>
          )}

          {/* Parámetros de la Evaluación */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, background: 'var(--cream)', border: '1.5px solid var(--ink)', padding: '14px', marginBottom: 22 }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Preguntas</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 900, color: 'var(--ink)' }}>{totalQuestions} reactivos</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Tiempo Límite</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 900, color: 'var(--ink)' }}>{assessmentData.timeLimitMinutes || 'Sin límite'} min</div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Aprobación</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 900, color: 'var(--rust)' }}>{assessmentData.passingScore}% mínimo</div>
            </div>
          </div>

          {/* Instrucciones Pedagógicas */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 8 }}>
               Instrucciones Didácticas:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontFamily: 'var(--sans)', fontSize: 13, color: '#3A362D', lineHeight: 1.6 }}>
              <li>Lee atentamente cada enunciado antes de seleccionar tu respuesta.</li>
              <li>Puedes marcar preguntas con  para revisarlas antes de finalizar.</li>
              <li>En cualquier momento puedes consultar la <strong>sección teórica (§)</strong> de la guía haciendo clic en "Ver Teoría".</li>
              <li>Al finalizar, recibirás tu calificación inmediata y la retroalimentación pedagógica de cada punto.</li>
            </ul>
          </div>

          {/* Botón de inicio */}
          <button
            type="button"
            onClick={() => {
              startTimeRef.current = Date.now();
              setStatus('in_progress');
            }}
            disabled={totalQuestions === 0}
            style={{
              width: '100%',
              padding: '14px',
              background: totalQuestions > 0 ? 'var(--rust)' : 'var(--line)',
              color: '#FFFFFF',
              border: '2px solid var(--ink)',
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 900,
              cursor: totalQuestions > 0 ? 'pointer' : 'not-allowed',
              boxShadow: '4px 4px 0 var(--ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span> Comenzar Resolución Online</span>
          </button>

          {totalQuestions === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--rust)', fontFamily: 'var(--mono)', fontSize: 11, marginTop: 8 }}>
              (No hay preguntas añadidas a esta guía todavía).
            </div>
          )}
        </div>
      )}

      {/* ── 2. PANTALLA DE RESOLUCIÓN EN VIVO ── */}
      {(status === 'in_progress' || status === 'timeout') && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <AssessmentHeader
            guideTitle={assessmentData.guideTitle}
            courseName={assessmentData.courseName}
            currentIndex={currentIndex}
            totalQuestions={totalQuestions}
            timeRemainingSeconds={timeRemainingSeconds}
            isTimed={isTimed}
            answeredCount={answeredCount}
            onFinishClick={() => setShowSummaryModal(true)}
            onClose={onClose}
          />

          <div style={{ maxWidth: 1100, width: '100%', margin: '20px auto', padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>
            {/* Columna Principal: Tarjeta de la Pregunta */}
            <div>
              {currentQuestion ? (
                <QuestionCard
                  question={currentQuestion}
                  currentAnswer={answers[currentQuestion.id]}
                  onSelectOption={handleSelectOption}
                  onToggleFlag={handleToggleFlag}
                  isFlagged={flaggedQuestionIds.includes(currentQuestion.id)}
                  onNext={handleNext}
                  onPrev={handlePrev}
                  onFinish={() => setShowSummaryModal(true)}
                  hasPrev={currentIndex > 0}
                  hasNext={currentIndex < totalQuestions - 1}
                  totalQuestions={totalQuestions}
                />
              ) : (
                <div style={{ padding: 40, textAlign: 'center' }}>No hay pregunta seleccionada</div>
              )}
            </div>

            {/* Columna Lateral: Matriz de Navegación */}
            <div>
              <QuestionNavigationGrid
                questions={assessmentData.questions}
                currentIndex={currentIndex}
                answers={answers}
                flaggedQuestionIds={flaggedQuestionIds}
                onSelectQuestion={(idx) => setCurrentIndex(idx)}
              />
            </div>
          </div>

          {/* Modal de confirmación previa a la entrega */}
          <AssessmentSummaryModal
            isOpen={showSummaryModal}
            onClose={() => setShowSummaryModal(false)}
            onConfirmSubmit={executeSubmission}
            questions={assessmentData.questions}
            answers={answers}
            flaggedQuestionIds={flaggedQuestionIds}
            onJumpToQuestion={(idx) => setCurrentIndex(idx)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* ── 3. PANTALLA DE RESULTADOS Y SOLUCIONARIO ── */}
      {status === 'completed' && result && (
        <AssessmentResultView
          result={result}
          onRetry={assessmentData.allowRetries ? handleRetry : undefined}
          onClose={onClose}
        />
      )}
    </div>
  );
};
