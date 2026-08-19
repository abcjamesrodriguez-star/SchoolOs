// ============================================================
// SchoolOS — GuideWizard.tsx (React Island)
// Fase 3 | Wizard de 5 pasos para crear guías con bloques
// Estado: local (useState) — sin persistencia en esta fase
// ============================================================

import { useState } from 'react';
import type { GuideBlock, BlockType, Question, QuestionType } from '../../../types/content';

// ── TIPOS LOCALES DEL WIZARD ──────────────────────────────────

interface WizardBlock extends Omit<GuideBlock, 'guideId'> {}

interface WizardQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  options: string[];
  correctAnswerIndex: number;
  referencedBlockIds: string[];
}

interface WizardState {
  // Paso 1
  title: string;
  description: string;
  estimatedMinutes: number;
  // Paso 2
  blocks: WizardBlock[];
  // Paso 3
  addEvaluation: boolean;
  evalTitle: string;
  evalMode: 'virtual' | 'in_person';
  evalPassingScore: number;
  evalTimeLimit: number;
  evalMaxAttempts: number;
  questions: WizardQuestion[];
  // Paso 5
  publishStatus: 'draft' | 'published';
}

interface Props {
  courseId: string;
  courseName: string;
  lang: string;
  returnUrl: string;
}

// ── CONSTANTES ────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Metadatos', short: '1. Metadatos' },
  { id: 2, label: 'Bloques de Contenido', short: '2. Bloques' },
  { id: 3, label: 'Evaluación (Opcional)', short: '3. Evaluación' },
  { id: 4, label: 'Vista Previa', short: '4. Vista Previa' },
  { id: 5, label: 'Publicar', short: '5. Publicar' },
];

const INITIAL_STATE: WizardState = {
  title: '',
  description: '',
  estimatedMinutes: 20,
  blocks: [],
  addEvaluation: false,
  evalTitle: '',
  evalMode: 'virtual',
  evalPassingScore: 70,
  evalTimeLimit: 45,
  evalMaxAttempts: 2,
  questions: [],
  publishStatus: 'draft',
};

// ── UTILIDADES ────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────

export default function GuideWizard({ courseId, courseName, lang, returnUrl }: Props) {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [saved, setSaved] = useState(false);

  // ── Actualizar campo plano ──
  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  // ── BLOQUES ──

  function addBlock(type: BlockType) {
    const newBlock: WizardBlock = {
      id: genId('blk'),
      order: state.blocks.length + 1,
      type,
      title: type === 'heading' ? 'Nuevo Título de Sección' : type === 'callout' ? '¡Dato importante!' : '',
      content: type === 'paragraph' ? 'Escribe el contenido aquí...' : type === 'image' ? '' : '',
    };
    setState((prev) => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
  }

  function updateBlock(id: string, field: keyof WizardBlock, value: string) {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    }));
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    const blocks = [...state.blocks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
    setState((prev) => ({ ...prev, blocks: blocks.map((b, i) => ({ ...b, order: i + 1 })) }));
  }

  function removeBlock(id: string) {
    setState((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i + 1 })),
    }));
  }

  // ── PREGUNTAS ──

  function addQuestion() {
    const q: WizardQuestion = {
      id: genId('q'),
      prompt: '',
      type: 'multiple_choice',
      options: ['', '', '', ''],
      correctAnswerIndex: 0,
      referencedBlockIds: [],
    };
    setState((prev) => ({ ...prev, questions: [...prev.questions, q] }));
  }

  function updateQuestion(id: string, field: keyof WizardQuestion, value: unknown) {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    }));
  }

  function updateOption(qId: string, optIndex: number, value: string) {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => {
        if (q.id !== qId) return q;
        const options = [...q.options];
        options[optIndex] = value;
        return { ...q, options };
      }),
    }));
  }

  function removeQuestion(id: string) {
    setState((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== id) }));
  }

  // ── GUARDAR ──

  function handleSave(status: 'draft' | 'published') {
    update('publishStatus', status);
    setSaved(true);
  }

  // ── VALIDACIÓN POR PASO ──
  const canProceed = [
    step === 1 ? state.title.trim().length > 0 : true,
    step === 2 ? state.blocks.length > 0 : true,
    true, // paso 3 es opcional
    true, // paso 4 es solo lectura
    true,
  ][step - 1];

  // ── RENDER PRINCIPAL ──

  if (saved) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--rust)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
          {state.publishStatus === 'published' ? '✅ GUÍA PUBLICADA' : '💾 GUÍA GUARDADA COMO BORRADOR'}
        </div>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, color: 'var(--ink)', margin: '0 0 8px 0' }}>
          {state.title}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 24 }}>
          {state.blocks.length} bloques · {state.estimatedMinutes} min estimados · Curso: {courseName}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={returnUrl} style={{ padding: '10px 20px', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '2px solid var(--ink)' }}>
            ← Volver al Curso
          </a>
          <button
            onClick={() => { setState(INITIAL_STATE); setSaved(false); setStep(1); }}
            style={{ padding: '10px 20px', background: 'transparent', color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, border: '2px solid var(--ink)', cursor: 'pointer' }}
          >
            + Crear Otra Guía
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── STEPPER ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  background: step === s.id ? 'var(--ink)' : step > s.id ? 'var(--rust)' : 'var(--paper)',
                  border: '2px solid var(--ink)',
                  color: step >= s.id ? '#fff' : 'var(--ink)',
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  cursor: step > s.id ? 'pointer' : 'default',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                onClick={() => { if (step > s.id) setStep(s.id); }}
              >
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: step > s.id ? 'rgba(255,255,255,0.3)' : step === s.id ? 'rgba(255,255,255,0.2)' : 'var(--cream)', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0 }}>
                  {step > s.id ? '✓' : s.id}
                </span>
                <span className="stepper-label">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: step > s.id ? 'var(--rust)' : 'var(--ink)', minWidth: 20 }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── PASO 1: METADATOS ── */}
      {step === 1 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 4 }}>PASO 1 — INFORMACIÓN DE LA GUÍA</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px 0' }}>¿De qué trata esta guía?</h2>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>Define el título y la descripción que verán los alumnos.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 6 }}>
                Título de la Guía *
              </label>
              <input
                type="text"
                value={state.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder="ej: Estructura y Función de la Célula Eucariota"
                style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--ink)', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 6 }}>
                Descripción breve
              </label>
              <textarea
                value={state.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Una oración que resume el objetivo pedagógico de esta guía..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--sans, Inter)', fontSize: 14, color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 6 }}>
                Tiempo estimado de lectura (minutos)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={state.estimatedMinutes}
                onChange={(e) => update('estimatedMinutes', Number(e.target.value))}
                style={{ width: 120, padding: '10px 14px', border: '2px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 16, color: 'var(--ink)', outline: 'none' }}
              />
            </div>

            <div style={{ padding: '12px 16px', background: 'var(--cream)', border: '1.5px solid var(--ink-soft)' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>Curso asignado</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{courseName}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── PASO 2: EDITOR DE BLOQUES ── */}
      {step === 2 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 4 }}>PASO 2 — EDITOR DE BLOQUES</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px 0' }}>Estructura el contenido</h2>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: 0 }}>Agrega bloques en orden. Cada bloque tendrá una referencia única (§ N) para vincular preguntas en el paso siguiente.</p>
          </div>

          {/* Botones de agregar bloque */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {([
              { type: 'heading' as BlockType, label: '+ Título de Sección', icon: 'H' },
              { type: 'paragraph' as BlockType, label: '+ Párrafo / Texto', icon: '¶' },
              { type: 'image' as BlockType, label: '+ Imagen con Pie', icon: '▣' },
              { type: 'callout' as BlockType, label: '+ Recuadro Destacado', icon: '!' },
            ] as { type: BlockType; label: string; icon: string }[]).map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                style={{ padding: '8px 14px', background: 'var(--paper)', border: '2px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink)' }}
              >
                <span style={{ fontSize: 14 }}>{icon}</span> {label}
              </button>
            ))}
          </div>

          {/* Lista de bloques */}
          {state.blocks.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', border: '2px dashed var(--ink-soft)', background: 'var(--paper)', color: 'var(--ink-soft)' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 18, marginBottom: 8 }}>Sin bloques todavía</div>
              <p style={{ fontSize: 12.5, margin: 0 }}>Usa los botones de arriba para agregar tu primer bloque de contenido.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {state.blocks.map((block, index) => (
                <div key={block.id} style={{ background: 'var(--paper)', border: '2px solid var(--ink)', padding: '14px 16px' }}>
                  {/* Header del bloque */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, background: 'var(--ink)', color: '#fff', padding: '2px 8px', textTransform: 'uppercase' }}>
                        Bloque § {block.order}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                        {block.type === 'heading' ? 'Título' : block.type === 'paragraph' ? 'Párrafo' : block.type === 'image' ? 'Imagen' : 'Recuadro'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} style={{ padding: '4px 8px', border: '1.5px solid var(--ink)', background: 'transparent', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.4 : 1 }}>▲</button>
                      <button onClick={() => moveBlock(index, 'down')} disabled={index === state.blocks.length - 1} style={{ padding: '4px 8px', border: '1.5px solid var(--ink)', background: 'transparent', cursor: index === state.blocks.length - 1 ? 'not-allowed' : 'pointer', opacity: index === state.blocks.length - 1 ? 0.4 : 1 }}>▼</button>
                      <button onClick={() => removeBlock(block.id)} style={{ padding: '4px 8px', border: '1.5px solid var(--rust)', background: 'transparent', color: 'var(--rust)', cursor: 'pointer', fontWeight: 700 }}>✕</button>
                    </div>
                  </div>

                  {/* Campos del bloque según tipo */}
                  {(block.type === 'heading' || block.type === 'callout') && (
                    <input
                      type="text"
                      value={block.title ?? ''}
                      onChange={(e) => updateBlock(block.id, 'title', e.target.value)}
                      placeholder={block.type === 'heading' ? 'Título de la sección...' : 'Título del recuadro...'}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--line-strong, #ccc)', background: 'var(--cream)', fontFamily: block.type === 'heading' ? 'var(--serif)' : 'var(--mono)', fontSize: block.type === 'heading' ? 18 : 12, fontWeight: 700, color: 'var(--ink)', outline: 'none', marginBottom: block.type === 'callout' ? 8 : 0 }}
                    />
                  )}
                  {block.type !== 'heading' && (
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(block.id, 'content', e.target.value)}
                      placeholder={block.type === 'paragraph' ? 'Escribe el texto del párrafo...' : block.type === 'image' ? 'URL de la imagen o descripción...' : 'Contenido del recuadro destacado...'}
                      rows={block.type === 'paragraph' ? 4 : 2}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--line-strong, #ccc)', background: block.type === 'callout' ? '#FFF8F5' : 'var(--paper)', fontFamily: 'var(--sans, Inter)', fontSize: 13.5, color: 'var(--ink)', outline: 'none', resize: 'vertical' }}
                    />
                  )}
                  {block.type === 'image' && (
                    <input
                      type="text"
                      value={block.caption ?? ''}
                      onChange={(e) => updateBlock(block.id, 'caption', e.target.value)}
                      placeholder="Pie de foto (opcional)..."
                      style={{ width: '100%', marginTop: 8, padding: '6px 12px', border: '1.5px solid var(--line-strong, #ccc)', background: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', outline: 'none' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PASO 3: EVALUACIÓN ── */}
      {step === 3 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 4 }}>PASO 3 — EVALUACIÓN (OPCIONAL)</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px 0' }}>¿Agregas evaluación ahora?</h2>
          </div>

          {/* Toggle agregar evaluación */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => update('addEvaluation', true)}
              style={{ padding: '10px 20px', background: state.addEvaluation ? 'var(--ink)' : 'var(--paper)', color: state.addEvaluation ? '#fff' : 'var(--ink)', border: '2px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              ✓ Sí, agregar evaluación
            </button>
            <button
              onClick={() => { update('addEvaluation', false); update('questions', []); }}
              style={{ padding: '10px 20px', background: !state.addEvaluation ? 'var(--ink)' : 'var(--paper)', color: !state.addEvaluation ? '#fff' : 'var(--ink)', border: '2px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              × Saltar, lo haré después
            </button>
          </div>

          {state.addEvaluation && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Config de la evaluación */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 4 }}>Título de la Evaluación</label>
                  <input type="text" value={state.evalTitle} onChange={(e) => update('evalTitle', e.target.value)} placeholder="ej: Cuestionario de Biología Celular" style={{ width: '100%', padding: '8px 12px', border: '2px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--serif)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 4 }}>Modalidad</label>
                  <select value={state.evalMode} onChange={(e) => update('evalMode', e.target.value as 'virtual' | 'in_person')} style={{ width: '100%', padding: '8px 12px', border: '2px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)', outline: 'none' }}>
                    <option value="virtual">Virtual</option>
                    <option value="in_person">Presencial</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 4 }}>Nota Mínima (%)</label>
                  <input type="number" min={0} max={100} value={state.evalPassingScore} onChange={(e) => update('evalPassingScore', Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', border: '2px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 4 }}>Intentos</label>
                  <input type="number" min={1} max={5} value={state.evalMaxAttempts} onChange={(e) => update('evalMaxAttempts', Number(e.target.value))} style={{ width: '100%', padding: '8px 12px', border: '2px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--ink)', outline: 'none' }} />
                </div>
              </div>

              {/* Preguntas */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ink)' }}>
                    PREGUNTAS ({state.questions.length})
                  </div>
                  <button onClick={addQuestion} style={{ padding: '7px 14px', background: 'var(--ink)', color: '#fff', border: '2px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    + Agregar Pregunta
                  </button>
                </div>

                {state.questions.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', border: '2px dashed var(--ink-soft)', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 12 }}>
                    Aún no has agregado preguntas. Haz clic en "+ Agregar Pregunta".
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {state.questions.map((q, qi) => (
                      <div key={q.id} style={{ background: 'var(--paper)', border: '2px solid var(--ink)', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, background: 'var(--rust)', color: '#fff', padding: '2px 8px' }}>PREGUNTA {qi + 1}</span>
                          <button onClick={() => removeQuestion(q.id)} style={{ padding: '3px 8px', border: '1.5px solid var(--rust)', background: 'transparent', color: 'var(--rust)', cursor: 'pointer', fontFamily: 'var(--mono)', fontSize: 11 }}>✕ Eliminar</button>
                        </div>

                        <input type="text" value={q.prompt} onChange={(e) => updateQuestion(q.id, 'prompt', e.target.value)} placeholder="Escribe el enunciado de la pregunta..." style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--line-strong, #ccc)', background: 'var(--cream)', fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)', outline: 'none', marginBottom: 10 }} />

                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                          <select value={q.type} onChange={(e) => updateQuestion(q.id, 'type', e.target.value)} style={{ padding: '6px 10px', border: '1.5px solid var(--ink)', background: 'var(--paper)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)', outline: 'none' }}>
                            <option value="multiple_choice">Opción Múltiple</option>
                            <option value="true_false">Verdadero / Falso</option>
                          </select>
                          <select
                            value={q.referencedBlockIds[0] ?? ''}
                            onChange={(e) => updateQuestion(q.id, 'referencedBlockIds', e.target.value ? [e.target.value] : [])}
                            style={{ padding: '6px 10px', border: '1.5px solid var(--ink)', background: '#FFF8F5', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink)', outline: 'none' }}
                          >
                            <option value="">¿Qué bloque fundamenta esta pregunta?</option>
                            {state.blocks.map((b) => (
                              <option key={b.id} value={b.id}>§ {b.order} — {b.type === 'heading' ? b.title : b.type === 'callout' ? `[Recuadro] ${b.title}` : `Párrafo ${b.order}`}</option>
                            ))}
                          </select>
                        </div>

                        {q.type === 'multiple_choice' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {q.options.map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswerIndex === oi} onChange={() => updateQuestion(q.id, 'correctAnswerIndex', oi)} style={{ accentColor: 'var(--rust)', flexShrink: 0 }} />
                                <input type="text" value={opt} onChange={(e) => updateOption(q.id, oi, e.target.value)} placeholder={`Opción ${String.fromCharCode(65 + oi)}...`} style={{ flex: 1, padding: '6px 10px', border: `1.5px solid ${q.correctAnswerIndex === oi ? 'var(--rust)' : 'var(--line-strong, #ccc)'}`, background: q.correctAnswerIndex === oi ? '#FFF8F5' : 'var(--paper)', fontFamily: 'var(--sans, Inter)', fontSize: 12.5, color: 'var(--ink)', outline: 'none' }} />
                              </div>
                            ))}
                          </div>
                        )}

                        {q.type === 'true_false' && (
                          <div style={{ display: 'flex', gap: 16 }}>
                            {['Verdadero', 'Falso'].map((label, oi) => (
                              <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                <input type="radio" name={`tf-${q.id}`} checked={q.correctAnswerIndex === oi} onChange={() => updateQuestion(q.id, 'correctAnswerIndex', oi)} style={{ accentColor: 'var(--rust)' }} />
                                {label} {q.correctAnswerIndex === oi && <span style={{ color: 'var(--rust)' }}>✓ Correcta</span>}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PASO 4: VISTA PREVIA ── */}
      {step === 4 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 4 }}>PASO 4 — VISTA PREVIA EDITORIAL</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px 0' }}>Así verán la guía tus alumnos</h2>
          </div>

          <div style={{ background: '#fff', border: '2px solid var(--ink)', padding: '32px 40px', maxWidth: 720, boxShadow: '8px 8px 0 rgba(18,17,14,0.08)' }}>
            {/* Header del documento */}
            <div style={{ borderBottom: '3px solid var(--ink)', paddingBottom: 16, marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 4 }}>{courseName} · {state.estimatedMinutes} min · Colegio Norte</div>
              <h1 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 6px 0' }}>{state.title || '[Sin título]'}</h1>
              {state.description && <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0, lineHeight: 1.5 }}>{state.description}</p>}
            </div>

            {/* Bloques */}
            {state.blocks.length === 0 ? (
              <div style={{ color: 'var(--ink-soft)', fontStyle: 'italic', fontSize: 13 }}>No hay bloques de contenido todavía.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {state.blocks.map((block) => (
                  <div key={block.id}>
                    {block.type === 'heading' && (
                      <div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rust)', fontWeight: 800, marginBottom: 4 }}>§ {block.order}</div>
                        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0, borderBottom: '1.5px solid var(--ink)', paddingBottom: 4 }}>{block.title}</h2>
                      </div>
                    )}
                    {block.type === 'paragraph' && (
                      <div style={{ borderLeft: '3px solid var(--line, #E8E2D9)', paddingLeft: 14 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-soft)', marginBottom: 4 }}>§ {block.order}</div>
                        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--ink)', margin: 0 }}>{block.content}</p>
                      </div>
                    )}
                    {block.type === 'callout' && (
                      <div style={{ background: 'var(--cream)', border: '2px solid var(--rust)', padding: '12px 16px', borderLeft: '6px solid var(--rust)' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, color: 'var(--rust)', marginBottom: 4 }}>§ {block.order} · {block.title}</div>
                        <p style={{ fontSize: 13, margin: 0, color: 'var(--ink)', lineHeight: 1.5 }}>{block.content}</p>
                      </div>
                    )}
                    {block.type === 'image' && (
                      <div style={{ border: '2px dashed var(--ink-soft)', padding: '20px', textAlign: 'center', background: 'var(--cream)' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>§ {block.order} · [Imagen: {block.content || 'Sin URL'}]</div>
                        {block.caption && <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 6, fontStyle: 'italic' }}>{block.caption}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Resumen de evaluación */}
            {state.addEvaluation && state.questions.length > 0 && (
              <div style={{ marginTop: 28, borderTop: '2px solid var(--ink)', paddingTop: 20 }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 8 }}>EVALUACIÓN ADJUNTA</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>{state.evalTitle || 'Sin título'}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
                  {state.questions.length} preguntas · Modalidad {state.evalMode === 'virtual' ? 'Virtual' : 'Presencial'} · Aprobación {state.evalPassingScore}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PASO 5: PUBLICAR ── */}
      {step === 5 && (
        <div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--rust)', marginBottom: 4 }}>PASO 5 — CONFIRMAR Y PUBLICAR</div>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px 0' }}>¿Todo listo?</h2>
          </div>

          {/* Resumen */}
          <div style={{ background: 'var(--paper)', border: '2px solid var(--ink)', padding: '20px 24px', marginBottom: 24, maxWidth: 560 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ink)', marginBottom: 12, borderBottom: '1.5px solid var(--ink)', paddingBottom: 8 }}>RESUMEN DE LA GUÍA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 140, color: 'var(--ink-soft)' }}>Título:</span><span style={{ color: 'var(--ink)', fontFamily: 'var(--serif)', fontSize: 14 }}>{state.title || '—'}</span></div>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 140, color: 'var(--ink-soft)' }}>Curso:</span><span>{courseName}</span></div>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 140, color: 'var(--ink-soft)' }}>Bloques:</span><span>{state.blocks.length} bloques de contenido</span></div>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 140, color: 'var(--ink-soft)' }}>Tiempo estimado:</span><span>{state.estimatedMinutes} min</span></div>
              <div style={{ display: 'flex', gap: 8 }}><span style={{ fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 140, color: 'var(--ink-soft)' }}>Evaluación:</span><span>{state.addEvaluation ? `${state.questions.length} preguntas · ${state.evalMode === 'virtual' ? 'Virtual' : 'Presencial'}` : 'Sin evaluación (se puede agregar después)'}</span></div>
            </div>
          </div>

          {/* Botones de guardado */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSave('published')}
              style={{ padding: '12px 24px', background: 'var(--rust)', color: '#fff', border: '2px solid var(--rust)', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
            >
              🚀 Publicar al Curso
            </button>
            <button
              onClick={() => handleSave('draft')}
              style={{ padding: '12px 24px', background: 'transparent', color: 'var(--ink)', border: '2px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              💾 Guardar como Borrador
            </button>
          </div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 12 }}>
            Al publicar, los {'{N}'} alumnos inscritos podrán acceder inmediatamente a la guía.
          </p>
        </div>
      )}

      {/* ── NAVEGACIÓN ENTRE PASOS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 20, borderTop: '2px solid var(--ink)' }}>
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          style={{ padding: '10px 20px', background: 'transparent', color: step === 1 ? 'var(--ink-soft)' : 'var(--ink)', border: '2px solid currentColor', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, cursor: step === 1 ? 'not-allowed' : 'pointer', opacity: step === 1 ? 0.5 : 1 }}
        >
          ← Anterior
        </button>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)' }}>
          Paso {step} de {STEPS.length}
        </div>

        {step < 5 ? (
          <button
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            disabled={!canProceed}
            style={{ padding: '10px 20px', background: canProceed ? 'var(--ink)' : 'var(--ink-soft)', color: '#fff', border: '2px solid currentColor', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, cursor: canProceed ? 'pointer' : 'not-allowed' }}
          >
            Siguiente →
          </button>
        ) : (
          <div style={{ width: 110 }} />
        )}
      </div>
    </div>
  );
}
