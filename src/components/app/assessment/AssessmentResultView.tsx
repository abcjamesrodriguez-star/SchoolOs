import React from 'react';
import type { AssessmentResultSummary } from '../../../types/assessment';

interface Props {
  result: AssessmentResultSummary;
  onRetry?: () => void;
  onClose?: () => void;
}

export const AssessmentResultView: React.FC<Props> = ({ result, onRetry, onClose }) => {
  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const minutes = Math.floor(result.totalTimeSpentSeconds / 60);
  const seconds = result.totalTimeSpentSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;

  return (
    <div
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* 1. Tarjeta Principal de Puntuación */}
      <div
        style={{
          background: result.passed ? '#F0FDF4' : '#FEF2F2',
          border: `3px solid ${result.passed ? '#16A34A' : '#DC2626'}`,
          boxShadow: '8px 8px 0 rgba(18,17,14,0.08)',
          padding: '28px 32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: result.passed ? '#15803D' : '#B91C1C', marginBottom: 6 }}>
          {result.passed ? ' ¡EVALUACIÓN APROBADA EXITOSAMENTE!' : ' EVALUACIÓN FINALIZADA'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '10px 0' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 54, fontWeight: 900, color: result.passed ? '#15803D' : '#B91C1C', lineHeight: 1 }}>
            {result.score}%
          </div>
        </div>

        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: '#12110E', maxWidth: 500, margin: '0 auto 18px auto' }}>
          Has obtenido <strong>{result.correctCount} aciertos</strong> de un total de <strong>{result.totalQuestions} preguntas</strong>.
          {result.passed
            ? ` Superaste la nota mínima requerida (${result.passingScore}%).`
            : ` La nota mínima aprobatoria es ${result.passingScore}%. Te recomendamos repasar los bloques teóricos señalados.`}
        </div>

        {/* Métricas clave */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, maxWidth: 640, margin: '0 auto' }}>
          <div style={{ background: '#FFFFFF', border: '1.5px solid var(--line-strong)', padding: '10px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: '#16A34A' }}>{result.correctCount}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Aciertos</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1.5px solid var(--line-strong)', padding: '10px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: '#DC2626' }}>{result.wrongCount}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Fallos</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1.5px solid var(--line-strong)', padding: '10px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: 'var(--ink)' }}>{result.unansweredCount}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>En blanco</div>
          </div>
          <div style={{ background: '#FFFFFF', border: '1.5px solid var(--line-strong)', padding: '10px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 900, color: 'var(--rust)' }}>{timeFormatted}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>Tiempo</div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: '10px 18px',
                border: '2px solid var(--ink)',
                background: '#FFFFFF',
                color: 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
               Reintentar Evaluación
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '10px 22px',
                border: '2px solid var(--ink)',
                background: 'var(--rust)',
                color: '#FFFFFF',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '3px 3px 0 var(--ink)',
              }}
            >
              ✓ Salir / Volver
            </button>
          )}
        </div>
      </div>

      {/* 2. Desglose Pedagógico Pregunta por Pregunta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--ink)', paddingBottom: 8 }}>
          <h3 style={{ fontFamily: 'var(--serif)', fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--ink)' }}>
            Solucionario y Retroalimentación Pedagógica
          </h3>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
            {result.details.length} preguntas analizadas
          </span>
        </div>

        {result.details.map((item) => (
          <div
            key={item.questionId}
            style={{
              background: '#FFFFFF',
              border: `2px solid ${item.isCorrect ? '#16A34A' : '#DC2626'}`,
              boxShadow: '4px 4px 0 rgba(18,17,14,0.06)',
              padding: '18px 22px',
            }}
          >
            {/* Cabecera del ítem */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 900,
                    padding: '2px 8px',
                    background: item.isCorrect ? '#16A34A' : '#DC2626',
                    color: '#fff',
                  }}
                >
                  {item.isCorrect ? '✓ CORRECTA' : item.selectedOptionIndex === undefined ? ' EN BLANCO' : '✕ INCORRECTA'}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, color: 'var(--ink-soft)' }}>
                  Pregunta {item.order}
                </span>
              </div>

              {item.referencedBlock && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: 'var(--rust)', background: 'var(--cream)', padding: '2px 6px', border: '1px solid var(--line)' }}>
                  Fundamentada en § {item.referencedBlock.order}
                </span>
              )}
            </div>

            {/* Enunciado */}
            <h4 style={{ fontFamily: 'var(--serif)', fontSize: 15.5, fontWeight: 700, margin: '0 0 12px 0', color: 'var(--ink)' }}>
              {item.prompt}
            </h4>

            {/* Imagen vinculada a la pregunta */}
            {item.imageUrl && (
              <div style={{ border: '1.5px solid var(--line-strong)', background: '#FAF9F6', padding: '8px', textAlign: 'center', marginBottom: 12 }}>
                <img
                  src={item.imageUrl}
                  alt={item.imageCaption || 'Figura de la pregunta'}
                  style={{ maxWidth: '100%', maxHeight: '220px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                />
                {item.imageCaption && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)', marginTop: 4, fontStyle: 'italic' }}>
                    Figura: {item.imageCaption}
                  </div>
                )}
              </div>
            )}

            {/* Opciones */}
            {item.questionType === 'multiple_choice' && item.options && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {item.options.map((opt, optIdx) => {
                  const isStudentChoice = item.selectedOptionIndex === optIdx;
                  const isCorrectChoice = item.correctAnswerIndex === optIdx;

                  let optBg = '#FAF9F6';
                  let optBorder = '1px solid var(--line)';
                  let optColor = '#12110E';

                  if (isCorrectChoice) {
                    optBg = '#DCFCE7';
                    optBorder = '1.5px solid #16A34A';
                    optColor = '#166534';
                  } else if (isStudentChoice && !item.isCorrect) {
                    optBg = '#FEE2E2';
                    optBorder = '1.5px solid #DC2626';
                    optColor = '#991B1B';
                  }

                  return (
                    <div
                      key={optIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: optBg,
                        border: optBorder,
                        color: optColor,
                        fontFamily: 'var(--sans)',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{optionLetters[optIdx]}.</strong>
                        <span>{opt}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800 }}>
                        {isCorrectChoice && '✓ Opción Correcta'}
                        {isStudentChoice && !isCorrectChoice && '✕ Tu Respuesta'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {item.questionType === 'true_false' && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                {[0, 1].map((val) => {
                  const label = val === 0 ? 'Verdadero' : 'Falso';
                  const isStudentChoice = item.selectedOptionIndex === val;
                  const isCorrectChoice = item.correctAnswerIndex === val;

                  let bg = '#FAF9F6';
                  let border = '1px solid var(--line)';
                  if (isCorrectChoice) {
                    bg = '#DCFCE7';
                    border = '1.5px solid #16A34A';
                  } else if (isStudentChoice && !item.isCorrect) {
                    bg = '#FEE2E2';
                    border = '1.5px solid #DC2626';
                  }

                  return (
                    <div
                      key={val}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        background: bg,
                        border,
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        fontWeight: 800,
                        textAlign: 'center',
                      }}
                    >
                      {label} {isCorrectChoice ? '✓' : isStudentChoice ? '✕' : ''}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Justificación pedagógica */}
            {item.explanation && (
              <div style={{ background: 'var(--cream)', borderLeft: '3px solid var(--rust)', padding: '8px 12px', marginTop: 8 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--rust)', textTransform: 'uppercase', marginBottom: 2 }}>
                   JUSTIFICACIÓN DIDÁCTICA:
                </div>
                <p style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: '#3A362D', margin: 0, lineHeight: 1.45 }}>
                  {item.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
