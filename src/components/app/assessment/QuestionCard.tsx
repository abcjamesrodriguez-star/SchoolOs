import React, { useState } from 'react';
import type { AssessmentQuestion, StudentAnswerItem } from '../../../types/assessment';
import { PedagogicalReferenceDrawer } from './PedagogicalReferenceDrawer';

interface Props {
  question: AssessmentQuestion;
  currentAnswer?: StudentAnswerItem;
  onSelectOption: (optionIndex: number) => void;
  onToggleFlag: () => void;
  isFlagged: boolean;
  onNext: () => void;
  onPrev: () => void;
  onFinish?: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  totalQuestions: number;
}

export const QuestionCard: React.FC<Props> = ({
  question,
  currentAnswer,
  onSelectOption,
  onToggleFlag,
  isFlagged,
  onNext,
  onPrev,
  onFinish,
  hasPrev,
  hasNext,
  totalQuestions,
}) => {
  const [showTheory, setShowTheory] = useState(false);
  const selectedIndex = currentAnswer?.selectedOptionIndex;

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '2.5px solid var(--ink)',
        boxShadow: '6px 6px 0 rgba(18,17,14,0.08)',
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {/* 1. Barra de metadatos de la pregunta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1.5px solid var(--line-strong)', paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 900, background: 'var(--ink)', color: '#fff', padding: '3px 10px' }}>
            PREGUNTA {question.order} / {totalQuestions}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', background: 'var(--cream)', padding: '3px 8px', border: '1px solid var(--line)' }}>
            {question.type === 'true_false' ? 'Verdadero / Falso' : 'Selección Múltiple'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Botón para ver teoría / bloque § */}
          {question.referencedBlock && (
            <button
              type="button"
              onClick={() => setShowTheory(!showTheory)}
              style={{
                padding: '4px 10px',
                border: '1.5px solid var(--rust)',
                background: showTheory ? '#FFF8F5' : '#fff',
                color: 'var(--rust)',
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Consultar la sección teórica donde se explica este concepto"
            >
              <span>📖 {showTheory ? 'Cerrar Teoría' : `Ver Teoría § ${question.referencedBlock.order}`}</span>
            </button>
          )}

          {/* Botón Marcar para Revisar */}
          <button
            type="button"
            onClick={onToggleFlag}
            style={{
              padding: '4px 10px',
              border: isFlagged ? '1.5px solid var(--rust)' : '1.5px solid var(--line-strong)',
              background: isFlagged ? '#FEE2E2' : '#fff',
              color: isFlagged ? '#B91C1C' : 'var(--ink-soft)',
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="Marcar esta pregunta para revisarla antes de entregar"
          >
            <span>{isFlagged ? '🚩 Marcada' : '🏳 Marcar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Cajón colapsable de fundamentación didáctica */}
      <PedagogicalReferenceDrawer
        block={question.referencedBlock}
        isOpen={showTheory}
        onClose={() => setShowTheory(false)}
      />

      {/* 3. Enunciado / Prompt */}
      <div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 700, lineHeight: 1.4, color: '#12110E', margin: '0 0 14px 0' }}>
          {question.prompt}
        </h2>

        {/* Imagen o Diagrama vinculado a la pregunta */}
        {question.imageUrl && (
          <div style={{ border: '2px solid var(--ink)', background: '#FAF9F6', padding: '12px', textAlign: 'center', marginBottom: 16 }}>
            <img
              src={question.imageUrl}
              alt={question.imageCaption || 'Figura o diagrama de la pregunta'}
              style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
            />
            {question.imageCaption && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 8, fontStyle: 'italic' }}>
                Figura: {question.imageCaption}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Opciones de Respuesta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {question.type === 'multiple_choice' && question.options && (
          question.options.map((opt, optIdx) => {
            const isSelected = selectedIndex === optIdx;
            const letter = optionLetters[optIdx] || `${optIdx + 1}`;

            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => onSelectOption(optIdx)}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  border: isSelected ? '2px solid var(--rust)' : '1.5px solid var(--ink)',
                  background: isSelected ? '#FFF8F5' : '#FAF9F6',
                  color: '#12110E',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '3px 3px 0 var(--rust)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--rust)' : 'var(--ink)',
                    color: '#fff',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {letter}
                </div>
                <div style={{ flex: 1, fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.5, paddingTop: 2 }}>
                  {opt}
                </div>
              </button>
            );
          })
        )}

        {question.type === 'true_false' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button
              type="button"
              onClick={() => onSelectOption(0)}
              style={{
                padding: '14px 18px',
                border: selectedIndex === 0 ? '2px solid var(--rust)' : '1.5px solid var(--ink)',
                background: selectedIndex === 0 ? '#FFF8F5' : '#FAF9F6',
                cursor: 'pointer',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                fontWeight: 900,
                color: selectedIndex === 0 ? 'var(--rust)' : 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: selectedIndex === 0 ? '3px 3px 0 var(--rust)' : 'none',
              }}
            >
              <span style={{ fontSize: 16 }}>{selectedIndex === 0 ? '🔘' : '⚪'}</span>
              <span>VERDADERO</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectOption(1)}
              style={{
                padding: '14px 18px',
                border: selectedIndex === 1 ? '2px solid var(--rust)' : '1.5px solid var(--ink)',
                background: selectedIndex === 1 ? '#FFF8F5' : '#FAF9F6',
                cursor: 'pointer',
                fontFamily: 'var(--mono)',
                fontSize: 13,
                fontWeight: 900,
                color: selectedIndex === 1 ? 'var(--rust)' : 'var(--ink)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: selectedIndex === 1 ? '3px 3px 0 var(--rust)' : 'none',
              }}
            >
              <span style={{ fontSize: 16 }}>{selectedIndex === 1 ? '🔘' : '⚪'}</span>
              <span>FALSO</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Pie de Navegación (Anterior / Siguiente / Completar) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1.5px solid var(--line-strong)', paddingTop: 16, marginTop: 10 }}>
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          style={{
            padding: '8px 16px',
            border: '1.5px solid var(--ink)',
            background: hasPrev ? '#fff' : 'var(--line)',
            color: hasPrev ? 'var(--ink)' : 'var(--ink-soft)',
            fontFamily: 'var(--mono)',
            fontSize: 11.5,
            fontWeight: 800,
            cursor: hasPrev ? 'pointer' : 'not-allowed',
            opacity: hasPrev ? 1 : 0.6,
          }}
        >
          ← Anterior
        </button>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
          {selectedIndex !== undefined ? (
            <span style={{ color: '#16A34A', fontWeight: 800 }}>✓ Guardada</span>
          ) : (
            <span>Pendiente por responder</span>
          )}
        </div>

        {hasNext ? (
          <button
            type="button"
            onClick={onNext}
            style={{
              padding: '8px 20px',
              border: '2px solid var(--ink)',
              background: 'var(--ink)',
              color: '#fff',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Siguiente →
          </button>
        ) : (
          <button
            type="button"
            onClick={onFinish || onNext}
            style={{
              padding: '9px 22px',
              border: '2px solid var(--ink)',
              background: 'var(--rust)',
              color: '#fff',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '3px 3px 0 var(--ink)',
            }}
            title="Has llegado a la última pregunta. Haz clic para revisar y completar la evaluación"
          >
            <span>🚀 Completar y Entregar Evaluación</span>
          </button>
        )}
      </div>
    </div>
  );
};
