import React from 'react';
import type { AssessmentQuestion, StudentAnswerItem } from '../../../types/assessment';

interface Props {
  questions: AssessmentQuestion[];
  currentIndex: number;
  answers: Record<string, StudentAnswerItem>;
  flaggedQuestionIds: string[];
  onSelectQuestion: (index: number) => void;
}

export const QuestionNavigationGrid: React.FC<Props> = ({
  questions,
  currentIndex,
  answers,
  flaggedQuestionIds,
  onSelectQuestion,
}) => {
  return (
    <div
      style={{
        background: '#FAF9F6',
        border: '2px solid var(--ink)',
        boxShadow: '4px 4px 0 rgba(18,17,14,0.06)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', color: 'var(--ink)', borderBottom: '1.5px solid var(--line-strong)', paddingBottom: 6 }}>
        🗺️ Navegación de Preguntas
      </div>

      {/* Matriz de Burbujas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))', gap: 8 }}>
        {questions.map((q, idx) => {
          const isCurrent = currentIndex === idx;
          const isAnswered = answers[q.id]?.selectedOptionIndex !== undefined;
          const isFlagged = flaggedQuestionIds.includes(q.id);

          let bg = '#FFFFFF';
          let color = '#12110E';
          let border = '1.5px solid var(--line-strong)';

          if (isAnswered) {
            bg = '#DCFCE7';
            color = '#166534';
            border = '1.5px solid #16A34A';
          }

          if (isFlagged) {
            bg = '#FEE2E2';
            color = '#991B1B';
            border = '1.5px solid #EF4444';
          }

          if (isCurrent) {
            border = '2.5px solid var(--rust)';
            bg = '#FFF8F5';
            color = 'var(--rust)';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectQuestion(idx)}
              style={{
                height: 38,
                background: bg,
                color,
                border,
                fontFamily: 'var(--mono)',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.15s ease',
                boxShadow: isCurrent ? '2px 2px 0 var(--rust)' : 'none',
              }}
              title={`Ir a pregunta ${q.order}${isFlagged ? ' (Marcada para revisión)' : ''}`}
            >
              {q.order}
              {isFlagged && (
                <span style={{ position: 'absolute', top: -4, right: -4, fontSize: 10 }}>
                  🚩
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-soft)', borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: '#DCFCE7', border: '1px solid #16A34A', display: 'inline-block' }} />
          <span>Respondida</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: '#FFFFFF', border: '1px solid var(--line-strong)', display: 'inline-block' }} />
          <span>Pendiente</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: '#FEE2E2', border: '1px solid #EF4444', display: 'inline-block' }} />
          <span>Marcada 🚩</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, background: '#FFF8F5', border: '2px solid var(--rust)', display: 'inline-block' }} />
          <span>Actual</span>
        </div>
      </div>
    </div>
  );
};
