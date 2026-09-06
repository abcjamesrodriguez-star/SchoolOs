// ============================================================
// SchoolOS — EvaluationRunner.tsx
// Motor de examen interactivo para el Panel del Estudiante (Fase 4)
// Layout especial: SIN sidebar, pantalla completa de concentración
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import type { Evaluation, Question } from '../../../types/content';

// ── Tipos internos ──────────────────────────────────────────
type SessionStatus = 'intro' | 'in_progress' | 'reviewing' | 'submitted' | 'timeout';

interface QuestionResult {
  question: Question;
  selectedIndex: number | null;
  isCorrect: boolean;
}

interface EvaluationRunnerProps {
  evaluation: Evaluation;
  lang?: 'es' | 'en';
  guideId?: string;
}

// ── Helpers ─────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function gradeEvaluation(questions: Question[], answers: Record<string, number | null>): QuestionResult[] {
  return questions.map((q) => {
    const selected = answers[q.id] ?? null;
    const isCorrect = selected !== null && selected === q.correctAnswerIndex;
    return { question: q, selectedIndex: selected, isCorrect };
  });
}

// ── Componente Principal ─────────────────────────────────────
export default function EvaluationRunner({ evaluation, lang = 'es', guideId }: EvaluationRunnerProps) {
  const [status, setStatus] = useState<SessionStatus>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(
    (evaluation.timeLimitMinutes ?? 45) * 60
  );
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [startedAt] = useState(new Date().toISOString());

  const questions = evaluation.questions;
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const unansweredCount = totalQuestions - answeredCount;

  // ── Timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'in_progress') return;
    if (timeRemaining <= 0) {
      handleTimeout();
      return;
    }
    const interval = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, timeRemaining]);

  const handleTimeout = useCallback(() => {
    const graded = gradeEvaluation(questions, answers);
    setResults(graded);
    setStatus('timeout');
    saveResultToSession(graded, true);
  }, [questions, answers]);

  // ── Guardar resultado en sessionStorage ──────────────────────
  const saveResultToSession = (graded: QuestionResult[], timedOut = false) => {
    const correct = graded.filter((r) => r.isCorrect).length;
    const score = Math.round((correct / totalQuestions) * 100);
    const passed = score >= evaluation.passingScore;
    const timeSpent = (evaluation.timeLimitMinutes ?? 45) * 60 - timeRemaining;
    sessionStorage.setItem(
      `eval_result_${evaluation.id}`,
      JSON.stringify({
        evaluationId: evaluation.id,
        evaluationTitle: evaluation.title,
        score,
        passed,
        totalQuestions,
        correctCount: correct,
        wrongCount: graded.filter((r) => r.selectedIndex !== null && !r.isCorrect).length,
        unansweredCount: graded.filter((r) => r.selectedIndex === null).length,
        timeSpentSeconds: timeSpent,
        submittedAt: new Date().toISOString(),
        timedOut,
        details: graded.map((r) => ({
          questionId: r.question.id,
          prompt: r.question.prompt,
          options: r.question.options,
          selectedOptionIndex: r.selectedIndex,
          correctAnswerIndex: r.question.correctAnswerIndex,
          isCorrect: r.isCorrect,
          explanation: r.question.explanation,
          referencedBlockIds: r.question.referencedBlockIds,
        })),
      })
    );
  };

  // ── Seleccionar respuesta ────────────────────────────────────
  const selectAnswer = (questionId: string, optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  // ── Marcar para revisión ─────────────────────────────────────
  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  // ── Navegar preguntas ────────────────────────────────────────
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentIndex(index);
    }
  };

  // ── Iniciar examen ───────────────────────────────────────────
  const startExam = () => {
    const initialAnswers: Record<string, number | null> = {};
    questions.forEach((q) => { initialAnswers[q.id] = null; });
    setAnswers(initialAnswers);
    setStatus('in_progress');
  };

  // ── Intentar enviar ──────────────────────────────────────────
  const trySubmit = () => {
    if (unansweredCount > 0) {
      setShowSubmitModal(true);
    } else {
      submitExam();
    }
  };

  // ── Enviar examen ────────────────────────────────────────────
  const submitExam = () => {
    const graded = gradeEvaluation(questions, answers);
    setResults(graded);
    saveResultToSession(graded, false);
    setShowSubmitModal(false);
    setStatus('submitted');
    // Redirigir a la página de resultados
    setTimeout(() => {
      window.location.href = `/${lang}/app/student/evaluations/${evaluation.id}/result`;
    }, 1800);
  };

  // ── Timer color ──────────────────────────────────────────────
  const timerColor =
    timeRemaining <= 120 ? '#C3532C' : timeRemaining <= 300 ? '#C8860A' : '#12110E';

  // ═══════════════════════════════════════════════════════════
  // RENDER: INTRO
  // ═══════════════════════════════════════════════════════════
  if (status === 'intro') {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--cream, #F4EFE6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{
          background: 'var(--paper, #FCFAF7)',
          border: '2px solid #12110E',
          borderRadius: '12px',
          padding: '40px',
          maxWidth: '560px',
          width: '100%',
          boxShadow: '6px 6px 0 rgba(18,17,14,0.10)',
        }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#C3532C', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>
            {evaluation.guideTitle}
          </div>
          <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '26px', fontWeight: 900, margin: '0 0 16px 0', color: '#12110E', lineHeight: 1.2 }}>
            {evaluation.title}
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'Preguntas', value: String(totalQuestions) },
              { label: 'Tiempo límite', value: evaluation.timeLimitMinutes ? `${evaluation.timeLimitMinutes} min` : 'Sin límite' },
              { label: 'Puntaje mínimo', value: `${evaluation.passingScore}%` },
              { label: 'Intentos máx.', value: String(evaluation.maxAttempts) },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--cream, #F4EFE6)', border: '1.5px solid #E8E3DA', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9.5px', color: '#524E44', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '18px', fontWeight: 900, color: '#12110E' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FFF8F6', border: '1.5px solid #F5C6BC', borderRadius: '8px', padding: '14px 16px', marginBottom: '24px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 800, color: '#C3532C', marginBottom: '6px' }}> INSTRUCCIONES</div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#524E44', lineHeight: 1.7 }}>
              <li>Lee cada pregunta con calma antes de seleccionar tu respuesta.</li>
              <li>Puedes marcar preguntas para revisarlas antes de enviar.</li>
              <li>No cierres esta pestaña durante el examen.</li>
              <li>El temporizador comenzará al hacer clic en "Iniciar".</li>
            </ul>
          </div>

          <button
            onClick={startExam}
            style={{
              width: '100%', padding: '14px', background: '#C3532C', border: '2px solid #C3532C',
              borderRadius: '8px', color: '#FFFFFF', fontSize: '14px', fontWeight: 800,
              cursor: 'pointer', letterSpacing: '0.04em',
            }}
          >
             Iniciar Evaluación
          </button>
          <a
            href={`/${lang}/app/student${guideId ? `/guides/${guideId}` : ''}`}
            style={{ display: 'block', textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#524E44', textDecoration: 'none' }}
          >
            ← Volver a la guía de estudio
          </a>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: TIMEOUT / SUBMITTED (pantalla de espera)
  // ═══════════════════════════════════════════════════════════
  if (status === 'timeout' || status === 'submitted') {
    const graded = gradeEvaluation(questions, answers);
    const correct = graded.filter((r) => r.isCorrect).length;
    const score = Math.round((correct / totalQuestions) * 100);
    const passed = score >= evaluation.passingScore;
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--cream, #F4EFE6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{
          background: 'var(--paper, #FCFAF7)', border: '2px solid #12110E',
          borderRadius: '12px', padding: '40px', maxWidth: '400px', width: '100%',
          boxShadow: '6px 6px 0 rgba(18,17,14,0.10)', textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {status === 'timeout' ? '' : passed ? '' : ''}
          </div>
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '22px', fontWeight: 900, margin: '0 0 8px 0' }}>
            {status === 'timeout' ? '¡Tiempo agotado!' : 'Evaluación enviada'}
          </h2>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '38px', fontWeight: 900, color: passed ? '#4A7C59' : '#C3532C', margin: '16px 0' }}>
            {score}%
          </div>
          <p style={{ fontSize: '13px', color: '#524E44', marginBottom: '24px' }}>
            Redirigiendo a tus resultados…
          </p>
          <div style={{ width: '100%', height: '4px', background: '#E8E3DA', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: '#C3532C', borderRadius: '2px', animation: 'progress 1.8s linear forwards' }} />
          </div>
        </div>
        <style>{`@keyframes progress { from { width:0 } to { width:100% } }`}</style>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: IN_PROGRESS
  // ═══════════════════════════════════════════════════════════
  const selectedAnswer = answers[currentQuestion?.id] ?? null;
  const isFlagged = flagged.has(currentQuestion?.id);

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--cream, #F4EFE6)',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* ── BARRA SUPERIOR FIJA ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--paper, #FCFAF7)', borderBottom: '2px solid #12110E',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        boxShadow: '0 2px 8px rgba(18,17,14,0.08)',
      }}>
        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', background: '#C3532C', color: '#FFFFFF', padding: '3px 8px', borderRadius: '3px', fontWeight: 800 }}>
            EVALUACIÓN
          </span>
          <span style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '15px', fontWeight: 700, color: '#12110E' }}>
            {evaluation.title}
          </span>
        </div>
        {/* Timer + Progreso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', fontWeight: 900, color: timerColor }}>
             {formatTime(timeRemaining)}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#524E44' }}>
            <span style={{ fontWeight: 800, color: '#12110E' }}>{answeredCount}</span>/{totalQuestions} respondidas
          </div>
        </div>
      </div>

      {/* ── CUERPO PRINCIPAL ── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 220px',
        gap: '0',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
        padding: '24px',
        alignItems: 'start',
        boxSizing: 'border-box',
      }}>

        {/* TARJETA DE PREGUNTA */}
        <div>
          {/* Progress bar */}
          <div style={{ height: '4px', background: '#E8E3DA', borderRadius: '2px', marginBottom: '20px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${((currentIndex + 1) / totalQuestions) * 100}%`, background: '#C3532C', borderRadius: '2px', transition: 'width 0.3s' }} />
          </div>

          <div style={{
            background: 'var(--paper, #FCFAF7)', border: '2px solid #12110E',
            borderRadius: '10px', padding: '28px 32px',
            boxShadow: '5px 5px 0 rgba(18,17,14,0.08)',
            marginRight: '20px',
          }}>
            {/* Número de pregunta */}
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10.5px', color: '#C3532C', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
              Pregunta {currentIndex + 1} de {totalQuestions}
              {isFlagged && <span style={{ marginLeft: '10px', color: '#C8860A' }}> Marcada para revisión</span>}
            </div>

            {/* Enunciado */}
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', fontWeight: 800, color: '#12110E', margin: '0 0 24px 0', lineHeight: 1.4 }}>
              {currentQuestion?.prompt}
            </h2>

            {/* Opciones */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {currentQuestion?.options?.map((option, idx) => {
                const isSelected = selectedAnswer === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => selectAnswer(currentQuestion.id, idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 18px',
                      background: isSelected ? '#FFF0EE' : '#FCFAF7',
                      border: `2px solid ${isSelected ? '#C3532C' : '#E8E3DA'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      fontFamily: "'Inter', -apple-system, sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#C3532C';
                        (e.currentTarget as HTMLButtonElement).style.background = '#FFF8F6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8E3DA';
                        (e.currentTarget as HTMLButtonElement).style.background = '#FCFAF7';
                      }
                    }}
                  >
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '28px', height: '28px', flexShrink: 0,
                      borderRadius: '50%',
                      border: `2px solid ${isSelected ? '#C3532C' : '#B8B3AA'}`,
                      background: isSelected ? '#C3532C' : 'transparent',
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px', fontWeight: 800,
                      color: isSelected ? '#FFFFFF' : '#524E44',
                    }}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span style={{ fontSize: '14px', color: '#12110E', fontWeight: isSelected ? 700 : 400 }}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controles de Navegación */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginRight: '20px' }}>
            <button
              onClick={() => goToQuestion(currentIndex - 1)}
              disabled={currentIndex === 0}
              style={{
                padding: '10px 18px', background: currentIndex === 0 ? '#F4EFE6' : 'var(--paper, #FCFAF7)',
                border: '2px solid #12110E', borderRadius: '6px',
                fontSize: '13px', fontWeight: 700, cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                color: currentIndex === 0 ? '#B8B3AA' : '#12110E',
              }}
            >
              ← Anterior
            </button>

            <button
              onClick={() => toggleFlag(currentQuestion.id)}
              style={{
                padding: '10px 16px',
                background: isFlagged ? '#FFF8E1' : 'var(--paper, #FCFAF7)',
                border: `2px solid ${isFlagged ? '#C8860A' : '#E8E3DA'}`,
                borderRadius: '6px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', color: isFlagged ? '#C8860A' : '#524E44',
              }}
            >
              {isFlagged ? ' Marcada' : ' Marcar'}
            </button>

            {currentIndex < totalQuestions - 1 ? (
              <button
                onClick={() => goToQuestion(currentIndex + 1)}
                style={{
                  padding: '10px 18px', background: 'var(--paper, #FCFAF7)',
                  border: '2px solid #12110E', borderRadius: '6px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Siguiente →
              </button>
            ) : (
              <button
                onClick={trySubmit}
                style={{
                  padding: '10px 20px', background: '#C3532C', border: '2px solid #C3532C',
                  borderRadius: '6px', color: '#FFFFFF', fontSize: '13px', fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Finalizar y Enviar →
              </button>
            )}
          </div>
        </div>

        {/* PANEL DE NAVEGACIÓN DE PREGUNTAS */}
        <div style={{ position: 'sticky', top: '80px' }}>
          <div style={{
            background: 'var(--paper, #FCFAF7)', border: '2px solid #12110E',
            borderRadius: '10px', padding: '16px',
            boxShadow: '4px 4px 0 rgba(18,17,14,0.07)',
          }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 800, color: '#12110E', marginBottom: '12px', textTransform: 'uppercase' }}>
              Preguntas
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '14px' }}>
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined;
                const isCurrent = idx === currentIndex;
                const isQuestionFlagged = flagged.has(q.id);
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    style={{
                      width: '32px', height: '32px',
                      borderRadius: '6px',
                      border: `2px solid ${isCurrent ? '#C3532C' : isAnswered ? '#4A7C59' : '#E8E3DA'}`,
                      background: isCurrent ? '#C3532C' : isAnswered ? '#E8F5E9' : '#FCFAF7',
                      color: isCurrent ? '#FFFFFF' : isAnswered ? '#4A7C59' : '#524E44',
                      fontSize: '11px', fontWeight: 800,
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    title={`Pregunta ${idx + 1}${isQuestionFlagged ? ' (marcada)' : ''}`}
                  >
                    {idx + 1}
                    {isQuestionFlagged && (
                      <span style={{
                        position: 'absolute', top: '-4px', right: '-4px',
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: '#C8860A', border: '1px solid white',
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Leyenda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px' }}>
              {[
                { color: '#C3532C', bg: '#C3532C', label: 'Actual' },
                { color: '#4A7C59', bg: '#E8F5E9', label: 'Respondida' },
                { color: '#E8E3DA', bg: '#FCFAF7', label: 'Sin responder' },
              ].map(({ color, bg, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: '#524E44' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: bg, border: `1.5px solid ${color}`, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>

            <button
              onClick={trySubmit}
              style={{
                width: '100%', padding: '12px', background: '#C3532C',
                border: '2px solid #C3532C', borderRadius: '8px',
                color: '#FFFFFF', fontSize: '12px', fontWeight: 800,
                cursor: 'pointer',
              }}
            >
               Enviar Evaluación
            </button>
            {unansweredCount > 0 && (
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '9.5px', color: '#C8860A', textAlign: 'center', marginTop: '6px' }}>
                {unansweredCount} sin responder
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL DE CONFIRMACIÓN ── */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(18,17,14,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '24px',
        }}>
          <div style={{
            background: 'var(--paper, #FCFAF7)', border: '2px solid #12110E',
            borderRadius: '12px', padding: '32px', maxWidth: '400px', width: '100%',
            boxShadow: '8px 8px 0 rgba(18,17,14,0.15)',
          }}>
            <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', fontWeight: 800, margin: '0 0 12px 0' }}>
              ¿Enviar evaluación?
            </h3>
            {unansweredCount > 0 && (
              <div style={{ background: '#FFF8E1', border: '1.5px solid #F4C150', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', fontWeight: 800, color: '#C8860A', marginBottom: '4px' }}> ADVERTENCIA</div>
                <p style={{ fontSize: '13.5px', color: '#12110E', margin: 0 }}>
                  Tienes <strong>{unansweredCount}</strong> pregunta{unansweredCount > 1 ? 's' : ''} sin responder. Las preguntas sin responder contarán como incorrectas.
                </p>
              </div>
            )}
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', color: '#524E44', marginBottom: '20px' }}>
              Respondidas: {answeredCount}/{totalQuestions} · Tiempo restante: {formatTime(timeRemaining)}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{
                  flex: 1, padding: '12px', background: 'transparent',
                  border: '2px solid #12110E', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                Continuar examen
              </button>
              <button
                onClick={submitExam}
                style={{
                  flex: 1, padding: '12px', background: '#C3532C',
                  border: '2px solid #C3532C', borderRadius: '8px',
                  color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                }}
              >
                Enviar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
