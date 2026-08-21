import React from 'react';
import type { AssessmentReferenceBlock } from '../../../types/assessment';

interface Props {
  block?: AssessmentReferenceBlock;
  isOpen: boolean;
  onClose: () => void;
}

export const PedagogicalReferenceDrawer: React.FC<Props> = ({ block, isOpen, onClose }) => {
  if (!isOpen || !block) return null;

  return (
    <div
      style={{
        background: '#FFFDF9',
        border: '2px solid var(--ink)',
        boxShadow: '4px 4px 0 rgba(18,17,14,0.08)',
        padding: '16px 20px',
        margin: '16px 0',
        position: 'relative',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1.5px solid var(--line-strong)', paddingBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 900, background: 'var(--rust)', color: '#fff', padding: '2px 8px', textTransform: 'uppercase' }}>
            📖 FUNDAMENTACIÓN DIDÁCTICA · SECCIÓN § {block.order}
          </span>
          {block.title && (
            <strong style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)' }}>
              {block.title}
            </strong>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--rust)',
            cursor: 'pointer',
          }}
        >
          ✕ Ocultar Teoría
        </button>
      </div>

      <div style={{ fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.6, color: '#2B2720', whiteSpace: 'pre-line' }}>
        {block.content}
      </div>

      {block.caption && (
        <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
          Fuente: {block.caption}
        </div>
      )}
    </div>
  );
};
