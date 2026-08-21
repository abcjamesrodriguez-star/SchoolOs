import React from 'react';
import type { AssessmentQuestion, StudentAnswerItem } from '../../../types/assessment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  questions: AssessmentQuestion[];
  answers: Record<string, StudentAnswerItem>;
  flaggedQuestionIds: string[];
  onJumpToQuestion: (index: number) => void;
  isSubmitting?: boolean;
}

export const AssessmentSummaryModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirmSubmit,
  questions,
  answers,
  flaggedQuestionIds,
  onJumpToQuestion,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  const total = questions.length;
  const answered = Object.values(answers).filter((a) => a.selectedOptionIndex !== undefined).length;
  const unanswered = total - answered;
  const flagged = flaggedQuestionIds.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(18,17,14,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 11000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          border: '3px solid var(--ink)',
          boxShadow: '8px 8px 0 var(--ink)',
          maxWidth: 500,
          width: '100%',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '2px solid var(--ink)', paddingBottom: 10 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 900, color: 'var(--rust)', textTransform: 'uppercase' }}>
              Revisión Previa a la Entrega
            </div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 800, margin: '2px 0 0 0', color: 'var(--ink)' }}>
              ¿Listo para finalizar la evaluación?
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink)', fontWeight: 800 }}
          >
            ✕
          </button>
        </div>

        {/* Resumen numérico */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          <div style={{ background: '#DCFCE7', border: '1.5px solid #16A34A', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 900, color: '#166534' }}>{answered}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>Respondidas</div>
          </div>

          <div style={{ background: unanswered > 0 ? '#FEE2E2' : '#FAF9F6', border: unanswered > 0 ? '1.5px solid #EF4444' : '1.5px solid var(--line-strong)', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 900, color: unanswered > 0 ? '#991B1B' : 'var(--ink)' }}>{unanswered}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: unanswered > 0 ? '#991B1B' : 'var(--ink-soft)', textTransform: 'uppercase' }}>Sin responder</div>
          </div>

          <div style={{ background: flagged > 0 ? '#FEF3C7' : '#FAF9F6', border: flagged > 0 ? '1.5px solid #D97706' : '1.5px solid var(--line-strong)', padding: '10px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 900, color: flagged > 0 ? '#92400E' : 'var(--ink)' }}>{flagged}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: flagged > 0 ? '#92400E' : 'var(--ink-soft)', textTransform: 'uppercase' }}>Marcadas 🚩</div>
          </div>
        </div>

        {/* Advertencias pedagógicas */}
        {unanswered > 0 && (
          <div style={{ background: '#FFF8F5', borderLeft: '4px solid var(--rust)', padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 800, color: 'var(--rust)', textTransform: 'uppercase', marginBottom: 2 }}>
              ⚠️ Preguntas Pendientes:
            </div>
            <p style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--ink)', margin: 0 }}>
              Tienes <strong>{unanswered} pregunta(s)</strong> sin responder. Las preguntas en blanco se calificarán como incorrectas.
            </p>
          </div>
        )}

        {/* Lista de preguntas pendientes o marcadas para salto rápido */}
        {(unanswered > 0 || flagged > 0) && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 6 }}>
              Saltar rápidamente a una pregunta:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {questions.map((q, idx) => {
                const isAns = answers[q.id]?.selectedOptionIndex !== undefined;
                const isFlg = flaggedQuestionIds.includes(q.id);
                if (isAns && !isFlg) return null;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      onJumpToQuestion(idx);
                      onClose();
                    }}
                    style={{
                      padding: '4px 8px',
                      background: !isAns ? '#FEE2E2' : '#FEF3C7',
                      border: !isAns ? '1px solid #EF4444' : '1px solid #D97706',
                      color: !isAns ? '#991B1B' : '#92400E',
                      fontFamily: 'var(--mono)',
                      fontSize: 10.5,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Pregunta {q.order} {!isAns ? '(Pendiente)' : '🚩'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '2px solid var(--ink)',
              background: '#FFFFFF',
              color: 'var(--ink)',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ← Continuar Resolviendo
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            style={{
              flex: 1.3,
              padding: '10px 14px',
              border: '2px solid var(--ink)',
              background: 'var(--rust)',
              color: '#FFFFFF',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              fontWeight: 900,
              cursor: isSubmitting ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '3px 3px 0 var(--ink)',
            }}
          >
            <span>{isSubmitting ? '⏳ Calificando...' : '🚀 Sí, Entregar Ahora'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
