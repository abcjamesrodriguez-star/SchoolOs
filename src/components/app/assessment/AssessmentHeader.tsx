import React from 'react';

interface Props {
  guideTitle: string;
  courseName: string;
  currentIndex: number;
  totalQuestions: number;
  timeRemainingSeconds: number;
  isTimed: boolean;
  answeredCount: number;
  onFinishClick: () => void;
  onClose?: () => void;
}

export const AssessmentHeader: React.FC<Props> = ({
  guideTitle,
  courseName,
  currentIndex,
  totalQuestions,
  timeRemainingSeconds,
  isTimed,
  answeredCount,
  onFinishClick,
  onClose,
}) => {
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isUrgent = isTimed && timeRemainingSeconds < 180; // Menos de 3 minutos

  const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + 1) / totalQuestions) * 100) : 0;
  const answeredPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <header
      style={{
        background: '#12110E',
        color: '#FFFFFF',
        borderBottom: '3px solid var(--rust)',
        padding: '12px 18px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        {/* Lado izquierdo: Metadatos del Curso y Guía */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '4px 8px',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Cerrar vista de resolución"
            >
              ← Salir
            </button>
          )}

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 900, background: 'var(--rust)', color: '#fff', padding: '1px 6px', textTransform: 'uppercase' }}>
                {courseName || 'Curso'}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                MODALIDAD ONLINE
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, margin: '2px 0 0 0', color: '#fff' }}>
              {guideTitle}
            </h1>
          </div>
        </div>

        {/* Centro: Progreso de preguntas */}
        <div style={{ minWidth: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, fontFamily: 'var(--mono)', fontSize: 10.5, color: 'rgba(255,255,255,0.85)' }}>
            <span>Pregunta <strong>{currentIndex + 1}</strong> de {totalQuestions}</span>
            <span><strong>{answeredCount}</strong> de {totalQuestions} respondidas</span>
          </div>
          {/* Barra de progreso */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', width: '100%', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${answeredPercent}%`,
                background: 'var(--rust)',
                transition: 'width 0.25s ease',
              }}
            />
          </div>
        </div>

        {/* Lado derecho: Cronómetro y Botón Entregar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isTimed && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                border: isUrgent ? '1.5px solid #EF4444' : '1px solid rgba(255,255,255,0.2)',
                background: isUrgent ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                fontWeight: 900,
                color: isUrgent ? '#FCA5A5' : '#FFFFFF',
              }}
              title="Tiempo restante para completar la evaluación"
            >
              <span></span>
              <span>{timeFormatted}</span>
            </div>
          )}

          <button
            onClick={onFinishClick}
            style={{
              padding: '6px 14px',
              background: 'var(--rust)',
              color: '#FFFFFF',
              border: '2px solid #FFFFFF',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '2px 2px 0 rgba(255,255,255,0.4)',
            }}
          >
            <span> Finalizar Evaluación</span>
          </button>
        </div>
      </div>
    </header>
  );
};
