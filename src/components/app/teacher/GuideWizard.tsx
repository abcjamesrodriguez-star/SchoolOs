// ============================================================
// SchoolOS — GuideWizard.tsx (React Island)
// Estudio Editorial de Autoría Pedagógica con Vista Dividida y Hoja PDF en Vivo
// ============================================================

import React, { useState, useEffect } from 'react';
import type { BlockType, QuestionType } from '../../../types/content';
import { AssessmentRunner } from '../assessment/AssessmentRunner';
import { buildAssessmentDataFromStudio } from '../../../lib/assessment-api';

// ── TIPOS ─────────────────────────────────────────────────────

export type CalloutVariant = 'idea' | 'warning' | 'activity' | 'vocabulary';

export interface StudioBlock {
  id: string;
  order: number;
  type: BlockType;
  title?: string;
  content: string;
  caption?: string;
  calloutVariant?: CalloutVariant;
}

export interface StudioQuestion {
  id: string;
  prompt: string;
  type: QuestionType;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  referencedBlockId: string;
  imageUrl?: string;
  imageCaption?: string;
}

export interface StudioGuideState {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: 'draft' | 'published';
  blocks: StudioBlock[];
  questions: StudioQuestion[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  courseId: string;
  courseName: string;
  lang: string;
  returnUrl: string;
}

// ── UTILIDADES ────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── ESCUDO / LOGO INSTITUCIONAL OFICIAL ────────────────────────

export const COLEGIO_NORTE_CREST_SVG = (
  <svg viewBox="0 0 100 100" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Escudo exterior */}
    <path d="M50 8 L84 20 V52 C84 72 50 92 50 92 C50 92 16 72 16 52 V20 Z" fill="#FFF8F5" stroke="#12110E" strokeWidth="2.5" />
    <path d="M50 13 L78 24 V50 C78 66 50 84 50 84 C50 84 22 66 22 50 V24 Z" fill="#FBF8F2" stroke="#C3532C" strokeWidth="1.5" />
    {/* Línea central */}
    <line x1="50" y1="13" x2="50" y2="84" stroke="#C3532C" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />
    {/* Antorcha del Conocimiento */}
    <path d="M46 30 C46 23 50 18 50 18 C50 18 54 23 54 30 C52 33 48 33 46 30 Z" fill="#C3532C" stroke="#12110E" strokeWidth="0.8" />
    <path d="M47 30 L45 38 H55 L53 30 Z" fill="#12110E" />
    {/* Libro abierto del saber */}
    <path d="M30 46 Q40 42 50 46 Q60 42 70 46 V62 Q60 58 50 62 Q40 58 30 62 Z" fill="#FFFFFF" stroke="#12110E" strokeWidth="1.8" />
    <line x1="50" y1="46" x2="50" y2="62" stroke="#12110E" strokeWidth="1.8" />
    {/* Rayas de texto en el libro */}
    <line x1="34" y1="50" x2="46" y2="49" stroke="#524E44" strokeWidth="1" />
    <line x1="34" y1="54" x2="46" y2="53" stroke="#524E44" strokeWidth="1" />
    <line x1="34" y1="58" x2="46" y2="57" stroke="#524E44" strokeWidth="1" />
    <line x1="54" y1="49" x2="66" y2="50" stroke="#524E44" strokeWidth="1" />
    <line x1="54" y1="53" x2="66" y2="54" stroke="#524E44" strokeWidth="1" />
    <line x1="54" y1="57" x2="66" y2="58" stroke="#524E44" strokeWidth="1" />
    {/* Estrellas académicas */}
    <circle cx="34" cy="28" r="2.2" fill="#C3532C" />
    <circle cx="66" cy="28" r="2.2" fill="#C3532C" />
    <circle cx="50" cy="72" r="2.8" fill="#C3532C" />
  </svg>
);

// ── ESQUEMAS Y DIAGRAMAS PEDAGÓGICOS PREDEFINIDOS ────────────

export interface PedagogicalImagePreset {
  id: string;
  name: string;
  icon: string;
  caption: string;
  src: string;
}

export const PRESET_PEDAGOGICAL_IMAGES: PedagogicalImagePreset[] = [
  {
    id: 'osmosis',
    name: 'Ósmosis & Plasmólisis',
    icon: '',
    caption: 'Comportamiento osmótico en células vegetales: Turgencia (Hipotónico), Normal (Isotónico) y Plasmólisis (Hipertónico).',
    src: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 170" width="100%" height="100%">
  <rect width="560" height="170" fill="#FCFAF7" rx="6" stroke="#12110E" stroke-width="1.5"/>
  <g transform="translate(15, 12)">
    <rect width="160" height="110" fill="#EBF3E8" stroke="#2D4327" stroke-width="2" rx="4"/>
    <rect x="8" y="8" width="144" height="94" fill="#CDE5C7" stroke="#2D4327" stroke-width="1.5" stroke-dasharray="3,3" rx="3"/>
    <ellipse cx="80" cy="55" rx="58" ry="40" fill="#A4D49B" opacity="0.85"/>
    <text x="80" y="58" font-family="sans-serif" font-size="11" font-weight="bold" fill="#1B3016" text-anchor="middle">Vacuola Turgente</text>
    <text x="80" y="132" font-family="monospace" font-size="9.5" font-weight="bold" fill="#2D4327" text-anchor="middle">1. MEDIO HIPOTÓNICO</text>
    <text x="80" y="144" font-family="sans-serif" font-size="8.5" fill="#524E44" text-anchor="middle">Turgencia (+H₂O)</text>
  </g>
  <g transform="translate(198, 12)">
    <rect width="160" height="110" fill="#F8F6F0" stroke="#12110E" stroke-width="2" rx="4"/>
    <rect x="10" y="10" width="140" height="90" fill="#EDE8DC" stroke="#524E44" stroke-width="1.5" rx="3"/>
    <ellipse cx="80" cy="55" rx="42" ry="30" fill="#D7CEBA" opacity="0.85"/>
    <text x="80" y="58" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2E2B23" text-anchor="middle">Vacuola Normal</text>
    <text x="80" y="132" font-family="monospace" font-size="9.5" font-weight="bold" fill="#12110E" text-anchor="middle">2. MEDIO ISOTÓNICO</text>
    <text x="80" y="144" font-family="sans-serif" font-size="8.5" fill="#524E44" text-anchor="middle">Equilibrio Dinámico (⇌)</text>
  </g>
  <g transform="translate(382, 12)">
    <rect width="160" height="110" fill="#FDF5EE" stroke="#C1571A" stroke-width="2" rx="4"/>
    <rect x="25" y="22" width="110" height="66" fill="#FBDDC8" stroke="#C1571A" stroke-width="2" rx="12"/>
    <ellipse cx="80" cy="55" rx="26" ry="18" fill="#F6BC96"/>
    <text x="80" y="58" font-family="sans-serif" font-size="10" font-weight="bold" fill="#7C2D12" text-anchor="middle">Plasmólisis</text>
    <text x="80" y="132" font-family="monospace" font-size="9.5" font-weight="bold" fill="#C1571A" text-anchor="middle">3. MEDIO HIPERTÓNICO</text>
    <text x="80" y="144" font-family="sans-serif" font-size="8.5" fill="#524E44" text-anchor="middle">Membrana retraída (-H₂O)</text>
  </g>
</svg>
`)}`,
  },
  {
    id: 'microscope',
    name: 'Microscopio Óptico',
    icon: '',
    caption: 'Esquema de microscopio óptico compuesto con objetivos de 10x y 40x para análisis histológico.',
    src: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 160" width="100%" height="100%">
  <rect width="480" height="160" fill="#FCFAF7" rx="6" stroke="#12110E" stroke-width="1.5"/>
  <g transform="translate(30, 15)">
    <rect x="50" y="10" width="20" height="30" fill="#3A362D" rx="2"/>
    <rect x="40" y="35" width="40" height="12" fill="#12110E"/>
    <path d="M 60 47 L 60 80" stroke="#12110E" stroke-width="8"/>
    <rect x="25" y="80" width="70" height="6" fill="#C1571A"/>
    <circle cx="60" cy="95" r="12" fill="#EAE5D9" stroke="#12110E" stroke-width="2"/>
    <rect x="20" y="115" width="80" height="12" fill="#12110E" rx="3"/>
  </g>
  <g transform="translate(160, 25)">
    <text x="0" y="20" font-family="serif" font-size="14" font-weight="bold" fill="#12110E">Microscopio Óptico Compuesto</text>
    <text x="0" y="42" font-family="sans-serif" font-size="11" fill="#524E44">• Ocular y Tubo Óptico (Aumento base 10x)</text>
    <text x="0" y="62" font-family="sans-serif" font-size="11" fill="#524E44">• Revólver con objetivos de 10x y 40x</text>
    <text x="0" y="82" font-family="sans-serif" font-size="11" fill="#524E44">• Platina mecánica para montaje de portaobjetos</text>
    <text x="0" y="102" font-family="sans-serif" font-size="11" fill="#524E44">• Tornillo micrométrico de enfoque fino</text>
  </g>
</svg>
`)}`,
  },
  {
    id: 'dna',
    name: 'Estructura ADN',
    icon: '',
    caption: 'Doble hélice de ADN con emparejamiento de bases nitrogenadas A-T y G-C.',
    src: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 150" width="100%" height="100%">
  <rect width="480" height="150" fill="#FCFAF7" rx="6" stroke="#12110E" stroke-width="1.5"/>
  <g transform="translate(25, 20)">
    <path d="M 10 20 Q 50 80, 90 20 T 170 20 T 250 20 T 330 20" fill="none" stroke="#C1571A" stroke-width="3"/>
    <path d="M 10 80 Q 50 20, 90 80 T 170 80 T 250 80 T 330 80" fill="none" stroke="#1D4ED8" stroke-width="3"/>
    <line x1="50" y1="50" x2="50" y2="50" stroke="#2D4327" stroke-width="4"/>
    <line x1="90" y1="20" x2="90" y2="80" stroke="#2D4327" stroke-width="2.5" stroke-dasharray="3,3"/>
    <line x1="130" y1="50" x2="130" y2="50" stroke="#2D4327" stroke-width="4"/>
    <line x1="170" y1="20" x2="170" y2="80" stroke="#2D4327" stroke-width="2.5" stroke-dasharray="3,3"/>
    <line x1="210" y1="50" x2="210" y2="50" stroke="#2D4327" stroke-width="4"/>
    <line x1="250" y1="20" x2="250" y2="80" stroke="#2D4327" stroke-width="2.5" stroke-dasharray="3,3"/>
    <line x1="290" y1="50" x2="290" y2="50" stroke="#2D4327" stroke-width="4"/>
    <line x1="330" y1="20" x2="330" y2="80" stroke="#2D4327" stroke-width="2.5" stroke-dasharray="3,3"/>
    <text x="170" y="115" font-family="monospace" font-size="10" font-weight="bold" fill="#12110E" text-anchor="middle">Bases Nitrogenadas: A-T (Doble enlace) · G-C (Triple enlace)</text>
  </g>
</svg>
`)}`,
  },
  {
    id: 'cell',
    name: 'Célula Vegetal',
    icon: '',
    caption: 'Estructura anatómica de la célula vegetal: Pared celulósica, membrana plasmática, vacuola y cloroplastos.',
    src: `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 160" width="100%" height="100%">
  <rect width="500" height="160" fill="#FCFAF7" rx="6" stroke="#12110E" stroke-width="1.5"/>
  <g transform="translate(20, 15)">
    <polygon points="20,10 160,10 180,115 40,115" fill="#E8F5E9" stroke="#2E7D32" stroke-width="3"/>
    <polygon points="28,18 152,18 168,107 48,107" fill="#C8E6C9" stroke="#388E3C" stroke-width="1.5"/>
    <ellipse cx="100" cy="62" rx="42" ry="28" fill="#81C784" opacity="0.8"/>
    <circle cx="55" cy="45" r="10" fill="#66BB6A"/>
    <circle cx="140" cy="75" r="8" fill="#43A047"/>
    <circle cx="70" cy="85" r="7" fill="#43A047"/>
    <ellipse cx="130" cy="40" rx="12" ry="9" fill="#9C27B0" opacity="0.85"/>
  </g>
  <g transform="translate(210, 25)">
    <text x="0" y="18" font-family="serif" font-size="14" font-weight="bold" fill="#1B5E20">Anatomía de la Célula Vegetal</text>
    <text x="0" y="42" font-family="sans-serif" font-size="11" fill="#333">• Pared Celular Rígida (Celulosa)</text>
    <text x="0" y="62" font-family="sans-serif" font-size="11" fill="#333">• Membrana Plasmática Semipermeable</text>
    <text x="0" y="82" font-family="sans-serif" font-size="11" fill="#333">• Gran Vacuola Central Osmorreguladora</text>
    <text x="0" y="102" font-family="sans-serif" font-size="11" fill="#333">• Cloroplastos Fotosintéticos con Clorofila</text>
  </g>
</svg>
`)}`,
  }
];

// ── PLANTILLAS PEDAGÓGICAS (SMART STARTERS) ───────────────────

interface TemplatePreset {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  getState: (courseId: string, courseName: string) => Partial<StudioGuideState>;
}

const TEMPLATES: TemplatePreset[] = [
  {
    id: 'lab',
    name: 'Guía de Laboratorio / Práctica',
    icon: '',
    badge: 'Experimental',
    description: 'Protocolo de observación, materiales, hipótesis y análisis de resultados con esquema visual.',
    getState: (courseId, courseName) => {
      const b1 = genId('blk');
      const b2 = genId('blk');
      const b3 = genId('blk');
      const b4 = genId('blk');
      const b5 = genId('blk');
      const b6 = genId('blk');
      const b7 = genId('blk');
      return {
        title: 'Práctica de Laboratorio: Permeabilidad Celular y Ósmosis',
        description: 'Observación microscópica de fenómenos osmóticos en células vegetales (elodea y cebolla) bajo diferentes concentraciones de soluto.',
        estimatedMinutes: 45,
        blocks: [
          {
            id: b1,
            order: 1,
            type: 'heading',
            title: '1. Objetivos de Aprendizaje e Hipótesis',
            content: '',
          },
          {
            id: b2,
            order: 2,
            type: 'paragraph',
            content: 'En esta sesión experimental comprenderemos cómo la membrana celular regula el paso de agua mediante transporte pasivo y comprobaremos los estados de turgencia y plasmólisis celular.',
          },
          {
            id: b3,
            order: 3,
            type: 'callout',
            calloutVariant: 'activity',
            title: 'Materiales y Reactivos Requeridos',
            content: '• Microscopio óptico compuesto (10x y 40x)\n• Portaobjetos y cubreobjetos limpios\n• Muestra de tejido de Elodea sp. o catáfilo de cebolla\n• Solución salina (NaCl 5%) y agua destilada con gotero',
          },
          {
            id: b4,
            order: 4,
            type: 'heading',
            title: '2. Procedimiento Paso a Paso',
            content: '',
          },
          {
            id: b5,
            order: 5,
            type: 'paragraph',
            content: 'Paso 1: Monta el tejido vegetal con una gota de agua destilada y enfoca a 40x. Observa la distribución de los cloroplastos.\nPaso 2: Añade una gota de solución salina en el borde del cubreobjetos y absorbe por el lado opuesto con papel filtro. Registra los cambios morfológicos durante 3 minutos.',
          },
          {
            id: b6,
            order: 6,
            type: 'image',
            content: PRESET_PEDAGOGICAL_IMAGES[0].src,
            caption: PRESET_PEDAGOGICAL_IMAGES[0].caption,
          },
          {
            id: b7,
            order: 7,
            type: 'callout',
            calloutVariant: 'idea',
            title: 'Principio Físico-Químico Clave',
            content: 'La ósmosis ocurre cuando el agua se desplaza desde un medio con menor concentración de soluto (hipotónico) hacia uno con mayor concentración (hipertónico), a través de una bicapa lipídica semipermeable.',
          },
        ],
        questions: [
          {
            id: genId('q'),
            prompt: '¿Qué fenómeno celular ocurre cuando el tejido vegetal se expone a la solución salina al 5%?',
            type: 'multiple_choice',
            options: [
              'Turgencia máxima por ingreso de agua',
              'Plasmólisis por salida osmótica de agua de la vacuola',
              'Lisis celular inmediata por rotura de pared',
              'Duplicación acelerada de cloroplastos',
            ],
            correctAnswerIndex: 1,
            explanation: 'Al estar en un medio hipertónico (NaCl 5%), el agua sale de la vacuola central, reduciendo el volumen celular y separando la membrana de la pared celular.',
            referencedBlockId: b7,
          },
          {
            id: genId('q'),
            prompt: 'La pared celular de las plantas impide que la membrana plasmática se contraiga durante la plasmólisis.',
            type: 'true_false',
            options: ['Verdadero', 'Falso'],
            correctAnswerIndex: 1,
            explanation: 'Falso: La pared celular mantiene su forma externa rígida, pero la membrana plasmática interna sí se retrae y se desprende de la pared.',
            referencedBlockId: b7,
          },
        ],
      };
    },
  },
  {
    id: 'theory',
    name: 'Guía Teórica y Comprensión',
    icon: '',
    badge: 'Conceptual',
    description: 'Exposición temática con vocabulario clave, recuadros de profundización y test formativo.',
    getState: (courseId, courseName) => {
      const b1 = genId('blk');
      const b2 = genId('blk');
      const b3 = genId('blk');
      const b4 = genId('blk');
      const b5 = genId('blk');
      return {
        title: 'Biología Celular: Estructura y Función de los Organelos Eucariotas',
        description: 'Una exploración detallada sobre la compartimentación celular, la síntesis de proteínas y el flujo bioenergético en células animales y vegetales.',
        estimatedMinutes: 30,
        blocks: [
          {
            id: b1,
            order: 1,
            type: 'heading',
            title: '1. La Arquitectura de la Célula Eucariota',
            content: '',
          },
          {
            id: b2,
            order: 2,
            type: 'paragraph',
            content: 'A diferencia de las células procariotas, los eucariotas presentan un sistema complejo de endomembranas que delimita compartimentos especializados. Esta compartimentación permite que reacciones bioquímicas incompatibles ocurran simultáneamente en el mismo citoplasma.',
          },
          {
            id: b3,
            order: 3,
            type: 'callout',
            calloutVariant: 'vocabulary',
            title: 'Glosario Esencial: Mitocondria & ATP',
            content: 'Mitocondria: Organelo con doble membrana donde ocurre la respiración celular y la fosforilación oxidativa para sintetizar ATP (Adenosín Trifosfato).',
          },
          {
            id: b4,
            order: 4,
            type: 'heading',
            title: '2. El Sistema de Endomembranas',
            content: '',
          },
          {
            id: b5,
            order: 5,
            type: 'callout',
            calloutVariant: 'warning',
            title: 'Distinción Crucial: Retículo Liso vs. Rugoso',
            content: 'El RER posee ribosomas adheridos dedicados a la síntesis y plegamiento de proteínas de secreción; el REL carece de ribosomas y sintetiza lípidos además de detoxificar la célula.',
          },
        ],
        questions: [
          {
            id: genId('q'),
            prompt: '¿Cuál es la ventaja adaptativa principal de la compartimentación en células eucariotas?',
            type: 'multiple_choice',
            options: [
              'Permitir reacciones metabólicas simultáneas en microambientes óptimos',
              'Eliminar la necesidad de ribosomas y ARN mensajero',
              'Hacer que la célula dependa exclusivamente de fotosíntesis',
              'Reducir el tamaño total de la membrana plasmática',
            ],
            correctAnswerIndex: 0,
            explanation: 'Los organelos aislados permiten mantener pHs y concentraciones enzimáticas óptimas para rutas metabólicas específicas.',
            referencedBlockId: b2,
          },
        ],
      };
    },
  },
  {
    id: 'case',
    name: 'Estudio de Caso / Taller Práctico',
    icon: '',
    badge: 'Aplicado',
    description: 'Análisis de un problema del mundo real, preguntas de indagación y debate guiado.',
    getState: (courseId, courseName) => {
      const b1 = genId('blk');
      const b2 = genId('blk');
      const b3 = genId('blk');
      return {
        title: 'Estudio de Caso: Mutaciones Mitocondriales y Terapia de Reemplazo',
        description: 'Análisis bioético y genético de las enfermedades hereditarias de herencia materna y las técnicas modernas de transferencia pronuclear.',
        estimatedMinutes: 35,
        blocks: [
          {
            id: b1,
            order: 1,
            type: 'heading',
            title: '1. El Caso Clínico de la Familia Gómez',
            content: '',
          },
          {
            id: b2,
            order: 2,
            type: 'paragraph',
            content: 'Se presenta un paciente de 14 años con fatiga muscular crónica, intolerancia al ejercicio y niveles elevados de ácido láctico. El diagnóstico genético confirma el Síndrome de MERRF, una mutación en el ADN mitocondrial (ADNmt).',
          },
          {
            id: b3,
            order: 3,
            type: 'callout',
            calloutVariant: 'activity',
            title: 'Pregunta de Indagación en Equipo',
            content: '¿Por qué las enfermedades mitocondriales se transmiten exclusivamente por vía materna y cómo afecta el grado de heteroplasmia a la severidad de los síntomas?',
          },
        ],
        questions: [
          {
            id: genId('q'),
            prompt: 'El ADN mitocondrial humano se hereda casi en su totalidad por vía materna debido a que los espermatozoides pierden o degradan sus mitocondrias tras la fecundación.',
            type: 'true_false',
            options: ['Verdadero', 'Falso'],
            correctAnswerIndex: 0,
            explanation: 'Correcto: El óvulo aporta prácticamente la totalidad del citoplasma y organelos al cigoto.',
            referencedBlockId: b2,
          },
        ],
      };
    },
  },
  {
    id: 'blank',
    name: 'Lienzo en Blanco',
    icon: '',
    badge: 'Desde cero',
    description: 'Estructura mínima limpia para redactar tu guía paso a paso a tu manera.',
    getState: () => ({
      title: '',
      description: '',
      estimatedMinutes: 20,
      blocks: [
        {
          id: genId('blk'),
          order: 1,
          type: 'heading',
          title: 'Título de la Primera Sección',
          content: '',
        },
        {
          id: genId('blk'),
          order: 2,
          type: 'paragraph',
          content: 'Escribe aquí la introducción o el primer concepto pedagógico de tu guía...',
        },
      ],
      questions: [],
    }),
  },
];

// ── COMPONENTE PRINCIPAL: GUIDE WIZARD STUDIO ─────────────────

export default function GuideWizard({ courseId, courseName, lang, returnUrl }: Props) {
  // Estado principal de la guía
  const [guide, setGuide] = useState<StudioGuideState>(() => {
    const defaultTemplate = TEMPLATES[0].getState(courseId, courseName);
    return {
      id: genId('gd'),
      courseId,
      courseName,
      title: defaultTemplate.title ?? '',
      description: defaultTemplate.description ?? '',
      estimatedMinutes: defaultTemplate.estimatedMinutes ?? 25,
      status: 'draft',
      blocks: (defaultTemplate.blocks as StudioBlock[]) ?? [],
      questions: (defaultTemplate.questions as StudioQuestion[]) ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  // Modos de visualización:
  // 'split' (Editor + Hoja PDF en vivo) | 'editor' (Solo Editor) | 'pdf' (Solo Hoja PDF)
  const [viewLayout, setViewLayout] = useState<'split' | 'editor' | 'pdf'>('split');
  const [activeTab, setActiveTab] = useState<'content' | 'questions'>('content');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [publishedSuccess, setPublishedSuccess] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Recién iniciado');
  const [showTeacherKeyInPdf, setShowTeacherKeyInPdf] = useState(true);
  // Modalidad de respuesta: 'inline' (En la misma guía) | 'icfes' (Hoja de respuestas ICFES al final) | 'both' (Ambas)
  const [answerSheetMode, setAnswerSheetMode] = useState<'inline' | 'icfes' | 'both'>('inline');
  // Marca de agua institucional y logo personalizado
  const [showWatermark, setShowWatermark] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(20);
  const [showLogoInHeader, setShowLogoInHeader] = useState<boolean>(true);
  const [showLogoModal, setShowLogoModal] = useState<boolean>(false);
  const [showAssessmentPreviewModal, setShowAssessmentPreviewModal] = useState<boolean>(false);
  const [customLogoUrl, setCustomLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('schoolos_custom_school_logo') || null;
    } catch (_) {
      return null;
    }
  });

  function handleUploadCustomLogo(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCustomLogoUrl(dataUrl);
      try {
        localStorage.setItem('schoolos_custom_school_logo', dataUrl);
      } catch (_) {}
      triggerToast(' Logo institucional personalizado cargado.');
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveCustomLogo() {
    setCustomLogoUrl(null);
    try {
      localStorage.removeItem('schoolos_custom_school_logo');
    } catch (_) {}
    triggerToast('Escudo predeterminado de Colegio Norte restaurado.');
  }

  // ── AUTOGUARDADO EN LOCALSTORAGE ──
  useEffect(() => {
    try {
      const draftKey = `schoolos_guide_draft_${courseId}`;
      localStorage.setItem(draftKey, JSON.stringify(guide));
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (_) {}
  }, [guide, courseId]);

  // Mostrar mensaje efímero
  function triggerToast(msg: string) {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  }

  // ── APLICAR PLANTILLA ──
  function applyTemplate(tpl: TemplatePreset) {
    const fresh = tpl.getState(courseId, courseName);
    setGuide((prev) => ({
      ...prev,
      title: fresh.title ?? prev.title,
      description: fresh.description ?? prev.description,
      estimatedMinutes: fresh.estimatedMinutes ?? prev.estimatedMinutes,
      blocks: (fresh.blocks as StudioBlock[]) ?? prev.blocks,
      questions: (fresh.questions as StudioQuestion[]) ?? [],
      updatedAt: new Date().toISOString(),
    }));
    setShowTemplateModal(false);
    triggerToast(` Plantilla "${tpl.name}" cargada en el editor.`);
  }

  // ── MANEJO DE BLOQUES ──

  function addBlock(type: BlockType, insertAtIndex?: number, calloutVariant: CalloutVariant = 'idea') {
    const newBlock: StudioBlock = {
      id: genId('blk'),
      order: 0,
      type,
      title: type === 'heading' ? 'Nueva Sección' : type === 'callout' ? (calloutVariant === 'activity' ? 'Actividad Práctica' : calloutVariant === 'warning' ? 'Atención / Error Común' : calloutVariant === 'vocabulary' ? 'Glosario de Términos' : 'Idea Clave') : '',
      content: type === 'paragraph' ? 'Escribe aquí el contenido...' : type === 'callout' ? 'Detalle explicativo destacado...' : '',
      calloutVariant: type === 'callout' ? calloutVariant : undefined,
    };

    setGuide((prev) => {
      let blocks = [...prev.blocks];
      if (typeof insertAtIndex === 'number' && insertAtIndex >= 0 && insertAtIndex <= blocks.length) {
        blocks.splice(insertAtIndex, 0, newBlock);
      } else {
        blocks.push(newBlock);
      }
      blocks = blocks.map((b, i) => ({ ...b, order: i + 1 }));
      return { ...prev, blocks, updatedAt: new Date().toISOString() };
    });
  }

  function updateBlock(id: string, updates: Partial<StudioBlock>) {
    setGuide((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeBlock(id: string) {
    setGuide((prev) => {
      const blocks = prev.blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i + 1 }));
      const questions = prev.questions.map((q) => (q.referencedBlockId === id ? { ...q, referencedBlockId: '' } : q));
      return { ...prev, blocks, questions, updatedAt: new Date().toISOString() };
    });
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= guide.blocks.length) return;

    setGuide((prev) => {
      const blocks = [...prev.blocks];
      [blocks[index], blocks[targetIndex]] = [blocks[targetIndex], blocks[index]];
      return {
        ...prev,
        blocks: blocks.map((b, i) => ({ ...b, order: i + 1 })),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  // ── MANEJO DE PREGUNTAS / CHECKPOINTS ──

  function addQuestionForBlock(blockId?: string) {
    const targetBlockId = blockId || (guide.blocks[0] ? guide.blocks[0].id : '');
    const newQ: StudioQuestion = {
      id: genId('q'),
      prompt: '',
      type: 'multiple_choice',
      options: ['Opción A', 'Opción B', 'Opción C', 'Opción D'],
      correctAnswerIndex: 0,
      explanation: 'Explicación pedagógica de por qué esta es la respuesta correcta...',
      referencedBlockId: targetBlockId,
    };
    setGuide((prev) => ({
      ...prev,
      questions: [...prev.questions, newQ],
      updatedAt: new Date().toISOString(),
    }));
    setActiveTab('questions');
    triggerToast(' Nueva pregunta vinculada.');
  }

  function updateQuestion(id: string, updates: Partial<StudioQuestion>) {
    setGuide((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeQuestion(id: string) {
    setGuide((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }

  // ── DESCARGA E IMPRESIÓN DEL PDF EDITORIAL ──
  function triggerDownloadPdf() {
    const originalTitle = document.title;
    const cleanGuideName = (guide.title || 'Guia-Pedagogica').trim().replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s-_]/g, '');
    document.title = `${cleanGuideName} — ${courseName} — Colegio Norte`;
    triggerToast(' Abriendo diálogo de impresión / descarga como PDF...');
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    }, 150);
  }

  // ── GUARDADO Y PUBLICACIÓN EN LOCALSTORAGE PERMANENTE ──

  function handleSave(status: 'draft' | 'published') {
    if (!guide.title.trim()) {
      alert('Por favor escribe un título para la guía antes de guardar.');
      return;
    }

    const updatedGuide: StudioGuideState = {
      ...guide,
      status,
      updatedAt: new Date().toISOString(),
    };

    try {
      const storageKey = 'schoolos_custom_guides';
      const existingRaw = localStorage.getItem(storageKey);
      let existingList: StudioGuideState[] = existingRaw ? JSON.parse(existingRaw) : [];

      const idx = existingList.findIndex((g) => g.id === updatedGuide.id);
      if (idx >= 0) {
        existingList[idx] = updatedGuide;
      } else {
        existingList.unshift(updatedGuide);
      }
      localStorage.setItem(storageKey, JSON.stringify(existingList));
      localStorage.removeItem(`schoolos_guide_draft_${courseId}`);
    } catch (e) {
      console.error('Error guardando en localStorage', e);
    }

    setGuide(updatedGuide);
    setPublishedSuccess(true);
  }

  // ── MODAL DE ÉXITO TRAS PUBLICAR O GUARDAR ──
  if (publishedSuccess) {
    return (
      <div style={{ maxWidth: 680, margin: '40px auto', background: 'var(--paper)', border: '2.5px solid var(--ink)', padding: '36px 32px', boxShadow: '8px 8px 0 var(--ink)' }}>
        <div style={{ display: 'inline-block', padding: '4px 10px', background: guide.status === 'published' ? 'var(--rust)' : 'var(--ink)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          {guide.status === 'published' ? ' ¡GUÍA PUBLICADA CON ÉXITO!' : ' BORRADOR GUARDADO CORRECTAMENTE'}
        </div>

        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 10px 0', lineHeight: 1.25 }}>
          {guide.title}
        </h2>

        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
          {guide.description || 'Sin descripción adicional.'}
        </p>

        <div style={{ background: 'var(--cream)', border: '1.5px solid var(--ink)', padding: '14px 18px', display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 28, fontSize: 12, fontFamily: 'var(--mono)' }}>
          <div><strong>Curso:</strong> {courseName}</div>
          <div><strong>Bloques:</strong> {guide.blocks.length}</div>
          <div><strong>Lectura:</strong> ~{guide.estimatedMinutes} min</div>
          <div><strong>Preguntas:</strong> {guide.questions.length}</div>
          <div><strong>Estado:</strong> <span style={{ color: guide.status === 'published' ? 'var(--rust)' : 'var(--ink)', fontWeight: 800 }}>{guide.status === 'published' ? 'DISPONIBLE PARA ALUMNOS' : 'BORRADOR PRIVADO'}</span></div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={triggerDownloadPdf}
            style={{
              padding: '12px 24px',
              background: 'var(--rust)',
              color: '#fff',
              fontFamily: 'var(--mono)',
              fontSize: 12.5,
              fontWeight: 900,
              border: '2px solid var(--rust)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '3px 3px 0 var(--ink)',
            }}
          >
             Descargar Guía en PDF
          </button>

          <a
            href={returnUrl}
            style={{
              padding: '12px 20px',
              background: 'var(--ink)',
              color: '#fff',
              fontFamily: 'var(--mono)',
              fontSize: 12.5,
              fontWeight: 800,
              textDecoration: 'none',
              border: '2px solid var(--ink)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ← Volver al Cuaderno del Curso
          </a>

          <button
            onClick={() => {
              setPublishedSuccess(false);
              setViewLayout('pdf');
            }}
            style={{
              padding: '12px 18px',
              background: 'var(--cream)',
              color: 'var(--ink)',
              fontFamily: 'var(--mono)',
              fontSize: 12.5,
              fontWeight: 800,
              border: '2px solid var(--ink)',
              cursor: 'pointer',
            }}
          >
             Ver Hoja PDF
          </button>

          <button
            onClick={() => setPublishedSuccess(false)}
            style={{
              padding: '12px 16px',
              background: 'transparent',
              color: 'var(--ink-soft)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              fontWeight: 700,
              border: '1.5px solid var(--line-strong)',
              cursor: 'pointer',
            }}
          >
            Seguir editando
          </button>
        </div>
      </div>
    );
  }

  // ── RENDER DE LA HOJA EDITORIAL PDF (DOCUMENTO EN VIVO) ───────

  const renderPdfSheet = (isFullWidth = false) => (
    <div
      id="printableGuidePdf"
      style={{
        background: '#FFFFFF',
        border: '2px solid var(--ink)',
        boxShadow: isFullWidth ? '8px 8px 0 rgba(18,17,14,0.08)' : '6px 6px 0 rgba(18,17,14,0.08)',
        padding: isFullWidth ? '45px 55px' : '32px 38px',
        color: '#12110E',
        fontFamily: 'var(--serif)',
        minHeight: '842px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── MARCA DE AGUA INSTITUCIONAL PERSONALIZABLE (CENTRAL EN TODAS LAS PÁGINAS) ── */}
      {showWatermark && (
        <div
          className="pdf-watermark"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '320px',
            height: '320px',
            opacity: watermarkOpacity / 100, // Opacidad dinámica configurable (ej: 20%)
            pointerEvents: 'none',
            zIndex: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {customLogoUrl ? (
              <img src={customLogoUrl} alt="Marca de agua institucional" style={{ maxWidth: 220, maxHeight: 220, objectFit: 'contain' }} />
            ) : (
              COLEGIO_NORTE_CREST_SVG
            )}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900, color: '#12110E', letterSpacing: '0.16em', marginTop: 8, textTransform: 'uppercase', textAlign: 'center' }}>
            {customLogoUrl ? 'EVALUACIÓN ACADÉMICA' : 'COLEGIO NORTE'}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--rust)', letterSpacing: '0.2em' }}>
            SAPIENTIA ET VIRTUS
          </div>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: 0, padding: 0, position: 'relative', zIndex: 1 }}>
        {/* 1. ENCABEZADO INSTITUCIONAL REPETITIVO CON LOGO OFICIAL (THEAD SE REPITE EN CADA PÁGINA) */}
        <thead style={{ display: 'table-header-group' }}>
          <tr>
            <th className="pdf-thead-cell" style={{ textAlign: 'left', fontWeight: 'normal', padding: 0, paddingBottom: 16, border: 'none' }}>
              <div className="pdf-running-header" style={{ borderBottom: '2.5px solid #12110E', paddingBottom: 10, width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  {/* Logo + Nombre Institucional */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {showLogoInHeader && (
                      <div style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Logo Institucional">
                        {customLogoUrl ? (
                          <img src={customLogoUrl} alt="Logo Institucional" style={{ maxWidth: 44, maxHeight: 44, objectFit: 'contain' }} />
                        ) : (
                          COLEGIO_NORTE_CREST_SVG
                        )}
                      </div>
                    )}
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 900, letterSpacing: '0.12em', color: 'var(--rust)', textTransform: 'uppercase' }}>
                        COLEGIO NORTE • DEPARTAMENTO DE CIENCIAS NATURALES
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginTop: 2 }}>
                        {courseName} · Grado 10° · Año Lectivo 2026
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-soft)' }}>
                    <div><strong>CÓDIGO:</strong> GD-BIO10C-2026</div>
                    <div><strong>DOCENTE:</strong> Prof. Diana Restrepo</div>
                    <div><strong>DURACIÓN:</strong> ~{guide.estimatedMinutes || 25} min</div>
                  </div>
                </div>
              </div>
            </th>
          </tr>
        </thead>

        {/* 2. CUERPO DEL DOCUMENTO */}
        <tbody>
          <tr>
            <td style={{ border: 'none', padding: 0 }}>
              {/* Título de la Guía y Objetivo Didáctico */}
              <div className="pdf-item" style={{ marginBottom: 20, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <h1 style={{ fontFamily: 'var(--serif)', fontSize: isFullWidth ? 28 : 22, fontWeight: 700, color: '#12110E', margin: '0 0 10px 0', lineHeight: 1.2 }}>
                  {guide.title || 'Guía de Aprendizaje Pedagógico'}
                </h1>

                {guide.description && (
                  <div style={{ background: 'var(--cream)', borderLeft: '4px solid var(--rust)', padding: '10px 14px', margin: '8px 0 0 0' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--rust)', textTransform: 'uppercase', marginBottom: 2 }}>
                      OBJETIVO DIDÁCTICO & ALCANCE:
                    </div>
                    <p style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: '#3A362D', margin: 0, lineHeight: 1.5 }}>
                      {guide.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Bloques de Contenido en Orden Editorial */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {guide.blocks.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 12, border: '1.5px dashed var(--line)' }}>
                    (La hoja PDF está vacía. Añade secciones, párrafos o imágenes en el editor para verla estructurarse en tiempo real).
                  </div>
                ) : (
                  guide.blocks.map((block) => (
                    <div key={block.id} className="pdf-item pdf-block" style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                      {/* Título de Sección */}
                      {block.type === 'heading' && (
                        <div style={{ marginTop: 8, marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: '1.5px solid #12110E', paddingBottom: 4 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, color: 'var(--rust)' }}>
                              § {block.order}
                            </span>
                            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 17, fontWeight: 700, color: '#12110E', margin: 0 }}>
                              {block.title || `Sección ${block.order}`}
                            </h2>
                          </div>
                        </div>
                      )}

                      {/* Párrafo Explicativo */}
                      {block.type === 'paragraph' && (
                        <div style={{ paddingLeft: 12, borderLeft: '2.5px solid var(--line)' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, color: 'var(--ink-soft)', marginBottom: 2 }}>
                            § {block.order}
                          </div>
                          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.7, color: '#12110E', margin: 0, whiteSpace: 'pre-line', textAlign: 'justify' }}>
                            {block.content || '...'}
                          </p>
                        </div>
                      )}

                      {/* Recuadro Destacado / Callout */}
                      {block.type === 'callout' && (
                        <div
                          style={{
                            background: block.calloutVariant === 'activity' ? '#F2F6F0' : block.calloutVariant === 'warning' ? '#FDF6E9' : block.calloutVariant === 'vocabulary' ? '#F6F3EC' : '#FFF8F5',
                            border: '1.5px solid #12110E',
                            borderLeft: `5px solid ${block.calloutVariant === 'warning' ? '#C1571A' : block.calloutVariant === 'activity' ? '#2D4327' : 'var(--rust)'}`,
                            padding: '12px 16px',
                          }}
                        >
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 900, color: block.calloutVariant === 'activity' ? '#2D4327' : 'var(--rust)', textTransform: 'uppercase', marginBottom: 4 }}>
                            § {block.order} · {block.calloutVariant === 'activity' ? ' ' : block.calloutVariant === 'warning' ? ' ' : block.calloutVariant === 'vocabulary' ? ' ' : ' '}
                            {block.title || 'Información Destacada'}
                          </div>
                          <p style={{ fontFamily: 'var(--sans)', fontSize: 12.5, color: '#12110E', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
                            {block.content || '...'}
                          </p>
                        </div>
                      )}

                      {/* Imagen / Figura con renderizado visual real */}
                      {block.type === 'image' && (
                        <div style={{ border: '1.5px solid #12110E', padding: '12px', background: '#FCFAF7', textAlign: 'center', margin: '6px 0' }}>
                          {block.content ? (
                            <img
                              src={block.content}
                              alt={block.caption || `Figura ${block.order}`}
                              style={{
                                maxHeight: isFullWidth ? 280 : 190,
                                maxWidth: '100%',
                                height: 'auto',
                                objectFit: 'contain',
                                display: 'block',
                                margin: '0 auto',
                                background: '#fff',
                              }}
                            />
                          ) : (
                            <div style={{ padding: '24px 12px', border: '1.5px dashed var(--line-strong)', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11 }}>
                              [ RECURSO VISUAL § {block.order} — Sin imagen cargada ]
                            </div>
                          )}
                          {block.caption && (
                            <div style={{ fontFamily: 'var(--sans)', fontSize: 11, fontStyle: 'italic', color: '#444', marginTop: 6, textAlign: 'center' }}>
                              Figura {block.order}. {block.caption}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* 3. Sección de Comprobación y Preguntas Formativas */}
              {guide.questions.length > 0 && (
                <div className="pdf-item" style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid #12110E', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 900, color: 'var(--rust)', textTransform: 'uppercase' }}>
                      ACTIVIDAD DE COMPROBACIÓN & EVALUACIÓN FORMATIVA
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-soft)' }}>
                      Total: {guide.questions.length} preguntas
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {guide.questions.map((q, qi) => (
                      <div
                        key={q.id}
                        className="pdf-item pdf-question-card"
                        style={{
                          background: '#FAF9F6',
                          border: '1.5px solid #D8D2C2',
                          padding: '14px 16px',
                          breakInside: 'avoid',
                          pageBreakInside: 'avoid',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, color: '#12110E' }}>
                            Pregunta {qi + 1}.
                          </span>
                          {q.referencedBlockId && (
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--rust)', fontWeight: 700 }}>
                              [Valida § {guide.blocks.find((b) => b.id === q.referencedBlockId)?.order ?? '?'}]
                            </span>
                          )}
                        </div>

                        <div style={{ fontFamily: 'var(--sans)', fontSize: 13.5, fontWeight: 600, color: '#12110E', marginBottom: 10, lineHeight: 1.45 }}>
                          {q.prompt || '(Sin enunciado)'}
                        </div>

                        {/* Imagen / Diagrama vinculado a la pregunta */}
                        {q.imageUrl && (
                          <div style={{ border: '1.5px solid #12110E', background: '#FAF9F6', padding: '8px', textAlign: 'center', margin: '8px 0 12px 0' }}>
                            <img
                              src={q.imageUrl}
                              alt={q.imageCaption || 'Figura'}
                              style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', display: 'block', margin: '0 auto' }}
                            />
                            {q.imageCaption && (
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-soft)', marginTop: 4, fontStyle: 'italic' }}>
                                Figura: {q.imageCaption}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Opciones Selección Múltiple con diseño estructurado y casillas alineadas */}
                        {q.type === 'multiple_choice' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {q.options.map((opt, oi) => (
                              <div
                                key={oi}
                                style={{
                                  display: 'flex',
                                  alignItems: 'baseline',
                                  gap: 10,
                                  fontSize: 12.5,
                                  fontFamily: 'var(--sans)',
                                  color: '#24211A',
                                  padding: '6px 10px',
                                  background: oi % 2 === 0 ? '#FFFFFF' : '#F6F3EC',
                                  border: '1px solid #E6E0D4',
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: 'var(--mono)',
                                    fontWeight: 900,
                                    fontSize: 11.5,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                  }}
                                >
                                  {answerSheetMode !== 'icfes' ? (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        width: 14,
                                        height: 14,
                                        border: '1.5px solid #12110E',
                                        borderRadius: 2,
                                        background: '#FFFFFF',
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        border: '1.5px solid #12110E',
                                        background: '#FFF8F5',
                                        fontSize: 10,
                                        fontWeight: 900,
                                        color: 'var(--rust)',
                                      }}
                                    >
                                      {String.fromCharCode(65 + oi)}
                                    </span>
                                  )}
                                  <strong>{String.fromCharCode(65 + oi)}.</strong>
                                </span>
                                <span style={{ lineHeight: 1.45 }}>{opt || `Opción ${String.fromCharCode(65 + oi)}`}</span>
                              </div>
                            ))}
                            {answerSheetMode === 'icfes' && (
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--rust)', fontStyle: 'italic', marginTop: 2 }}>
                                ⤷ Rellene la burbuja de su opción en la Hoja de Respuestas al final (Pregunta {qi + 1})
                              </div>
                            )}
                          </div>
                        )}

                        {/* Opciones Verdadero / Falso con casillas amplias e independientes */}
                        {q.type === 'true_false' && (
                          <div>
                            <div style={{ display: 'flex', gap: 14, marginTop: 4, flexWrap: 'wrap' }}>
                              {['VERDADERO', 'FALSO'].map((label, oi) => (
                                <div
                                  key={oi}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '7px 18px',
                                    border: '1.5px solid #12110E',
                                    background: '#FFFFFF',
                                    fontFamily: 'var(--mono)',
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    color: '#12110E',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  {answerSheetMode !== 'icfes' ? (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        width: 14,
                                        height: 14,
                                        border: '1.5px solid #12110E',
                                        borderRadius: 2,
                                        background: '#FFFFFF',
                                      }}
                                    />
                                  ) : (
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 18,
                                        height: 18,
                                        borderRadius: '50%',
                                        border: '1.5px solid #12110E',
                                        background: '#FFF8F5',
                                        fontSize: 10,
                                        fontWeight: 900,
                                        color: 'var(--rust)',
                                      }}
                                    >
                                      {label[0]}
                                    </span>
                                  )}
                                  <span>{label}</span>
                                </div>
                              ))}
                            </div>
                            {answerSheetMode === 'icfes' && (
                              <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--rust)', fontStyle: 'italic', marginTop: 4 }}>
                                ⤷ Rellene su opción V o F en la Hoja de Respuestas al final (Pregunta {qi + 1})
                              </div>
                            )}
                          </div>
                        )}

                        {/* Clave pedagógica para el docente (opcional en pantalla) */}
                        {showTeacherKeyInPdf && q.explanation && (
                          <div className="no-print" style={{ marginTop: 10, padding: '8px 12px', background: '#FFF8F5', borderLeft: '3px solid var(--rust)', fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--ink-soft)' }}>
                            <strong style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--rust)' }}>CLAVE DOCENTE: </strong>
                            Respuesta correcta: <strong>{q.type === 'multiple_choice' ? String.fromCharCode(65 + q.correctAnswerIndex) : q.correctAnswerIndex === 0 ? 'Verdadero' : 'Falso'}</strong> — {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </td>
          </tr>
        </tbody>

        {/* 4. PIE DE PÁGINA FORMAL REPETITIVO DE LA GUÍA */}
        <tfoot style={{ display: 'table-footer-group' }}>
          <tr>
            <td className="pdf-tfoot-cell" style={{ border: 'none', padding: 0, paddingTop: 16 }}>
              <div className="pdf-item pdf-footer" style={{ borderTop: '1.5px solid #12110E', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, fontSize: 9.5, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                <div>
                  <div>SchoolOS • Sistema Pedagógico Institucional</div>
                  <div>Documento pedagógico oficial para uso en aula y laboratorio.</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ borderBottom: '1px solid #12110E', width: 170, marginBottom: 3 }}></div>
                  <div>Firma del Estudiante / Fecha</div>
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 5. HOJA DE RESPUESTAS OFICIAL ESTILO ICFES / SABER — SIEMPRE EN PÁGINA INDEPENDIENTE */}
      {(answerSheetMode === 'icfes' || answerSheetMode === 'both') && guide.questions.length > 0 && (
        <div
          className="pdf-item pdf-icfes-sheet-page"
          style={{
            breakBefore: 'page',
            pageBreakBefore: 'always',
            marginTop: 40,
            paddingTop: 20,
            borderTop: '3px dashed var(--rust)',
            position: 'relative',
          }}
        >
          {/* Indicador visual en pantalla de hoja desprendible / nueva página */}
          <div
            className="no-print"
            style={{
              background: 'var(--ink)',
              color: '#fff',
              padding: '6px 12px',
              fontFamily: 'var(--mono)',
              fontSize: 10.5,
              fontWeight: 800,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <span> PÁGINA IMPRESA INDEPENDIENTE (HOJA DE RESPUESTAS DESPRENDIBLE)</span>
            <span style={{ color: 'var(--rust)', background: '#fff', padding: '1px 6px', borderRadius: 2 }}>TIPO ICFES / SABER</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', margin: 0, padding: 0 }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr>
                <th className="pdf-thead-cell" style={{ textAlign: 'left', fontWeight: 'normal', padding: 0, paddingBottom: 12, border: 'none' }}>
                  {/* Membrete de la Hoja de Respuestas con Escudo Institucional */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, borderBottom: '2.5px solid #12110E', paddingBottom: 10, marginBottom: 12 }}>
                    {showLogoInHeader && (
                      <div style={{ width: 46, height: 46, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {customLogoUrl ? (
                          <img src={customLogoUrl} alt="Logo Institucional" style={{ maxWidth: 46, maxHeight: 46, objectFit: 'contain' }} />
                        ) : (
                          COLEGIO_NORTE_CREST_SVG
                        )}
                      </div>
                    )}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 900, color: 'var(--rust)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                        COLEGIO NORTE • EVALUACIÓN ACADÉMICA INSTITUCIONAL
                      </div>
                      <div style={{ fontFamily: 'var(--serif)', fontSize: 19, fontWeight: 800, color: '#12110E', margin: '2px 0' }}>
                        HOJA DE RESPUESTAS OFICIAL — TIPO SABER / ICFES
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)' }}>
                        Guía: <strong>{guide.title || 'Evaluación Didáctica'}</strong> · Curso: {courseName} · Grado 10°
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: 'none', padding: 0 }}>
                  {/* Fila de Datos del Estudiante */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, background: '#FAF9F6', border: '1.5px solid #12110E', padding: '10px 14px', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>NOMBRE COMPLETO DEL ESTUDIANTE:</div>
                      <div style={{ borderBottom: '1px solid #12110E', height: 18, marginTop: 4 }}></div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>CÓDIGO / DOC:</div>
                      <div style={{ borderBottom: '1px solid #12110E', height: 18, marginTop: 4 }}></div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>CURSO / GRUPO:</div>
                      <div style={{ borderBottom: '1px solid #12110E', height: 18, marginTop: 4 }}></div>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>FECHA:</div>
                      <div style={{ borderBottom: '1px solid #12110E', height: 18, marginTop: 4 }}></div>
                    </div>
                  </div>

                  {/* Instrucciones de Marcado Tipo ICFES */}
                  <div style={{ background: '#FFFDF9', border: '1px solid #D8D2C2', padding: '8px 12px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 10, fontFamily: 'var(--sans)', color: '#333' }}>
                      <strong>INSTRUCCIONES:</strong> Rellene completamente el círculo de la opción elegida con lápiz de mina negra No. 2. No haga tachones ni marcas dobles.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 9.5, fontFamily: 'var(--mono)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <strong>CORRECTO:</strong>
                        <span style={{ display: 'inline-flex', width: 15, height: 15, borderRadius: '50%', background: '#12110E', color: '#fff', fontSize: 9, alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666' }}>
                        <strong>INCORRECTO:</strong>
                        <span>(  )</span>
                        <span>(  )</span>
                        <span>( ⭘ )</span>
                      </span>
                    </div>
                  </div>

                  {/* Rejilla de Burbujas / Matriz de Respuestas Ópticas */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: guide.questions.length > 5 ? '1fr 1fr' : '1fr',
                      gap: 12,
                      background: '#FFFFFF',
                      border: '1.5px solid #12110E',
                      padding: '14px',
                      marginBottom: 14,
                    }}
                  >
                    {guide.questions.map((q, qi) => (
                      <div
                        key={q.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          background: qi % 2 === 0 ? '#FAF9F6' : '#FFFFFF',
                          border: '1px solid #E5E0D5',
                        }}
                      >
                        {/* Número de pregunta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, background: '#12110E', color: '#fff', padding: '2px 6px', borderRadius: 2 }}>
                            {qi < 9 ? `0${qi + 1}` : qi + 1}
                          </span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink-soft)' }}>
                            {q.type === 'multiple_choice' ? 'Múltiple' : 'V / F'}
                          </span>
                        </div>

                        {/* Burbujas de Selección Múltiple (A, B, C, D) */}
                        {q.type === 'multiple_choice' && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {q.options.map((_, oi) => (
                              <div
                                key={oi}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  border: '1.5px solid #12110E',
                                  background: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontFamily: 'var(--mono)',
                                  fontSize: 10.5,
                                  fontWeight: 900,
                                  color: '#12110E',
                                }}
                              >
                                {String.fromCharCode(65 + oi)}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Burbujas de Verdadero / Falso (V, F) */}
                        {q.type === 'true_false' && (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {['V', 'F'].map((label, oi) => (
                              <div
                                key={oi}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: '50%',
                                  border: '1.5px solid #12110E',
                                  background: '#FFFFFF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontFamily: 'var(--mono)',
                                  fontSize: 10.5,
                                  fontWeight: 900,
                                  color: '#12110E',
                                }}
                              >
                                {label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resumen Docente / Calificación */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid #12110E', background: '#FAF9F6', padding: '10px 14px', fontSize: 10, fontFamily: 'var(--mono)' }}>
                    <div>
                      <strong>TOTAL ACIERTOS:</strong> [ &nbsp;&nbsp;&nbsp;&nbsp; / {guide.questions.length} ]
                    </div>
                    <div>
                      <strong>CALIFICACIÓN FINAL:</strong> [ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ]
                    </div>
                    <div>
                      <strong>FIRMA EVALUADOR:</strong> ______________________
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ── RENDERIZADOR DE EDICIÓN DE BLOQUE DE IMAGEN ─────────────

  const renderImageBlockEditor = (block: StudioBlock) => (
    <div style={{ background: '#FFF8F5', border: '1.5px solid var(--rust)', padding: '12px 14px', marginTop: 4 }}>
      {block.content ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{ position: 'relative', textAlign: 'center', background: '#fff', border: '1px solid var(--line-strong)', padding: 10 }}>
            <img
              src={block.content}
              alt={block.caption || 'Vista previa de la figura'}
              style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', display: 'block', margin: '0 auto' }}
            />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
              <label style={{ padding: '4px 10px', background: 'var(--ink)', color: '#fff', fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                 Cambiar Imagen
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        updateBlock(block.id, { content: ev.target?.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <button
                type="button"
                onClick={() => updateBlock(block.id, { content: '' })}
                style={{ padding: '4px 10px', background: 'transparent', color: 'var(--rust)', border: '1.5px solid var(--rust)', fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}
              >
                ✕ Quitar Imagen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10 }}>
          {/* Subir archivo local */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '14px 16px',
              background: '#fff',
              border: '2px dashed var(--rust)',
              color: 'var(--rust)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <span> Subir imagen desde tu computador</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    updateBlock(block.id, { content: ev.target?.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </label>

          {/* Galería de Esquemas Didácticos Predefinidos */}
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: 6 }}>
              O selecciona un esquema didáctico prediseñado:
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_PEDAGOGICAL_IMAGES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateBlock(block.id, { content: preset.src, caption: preset.caption })}
                  style={{
                    padding: '5px 9px',
                    background: '#fff',
                    border: '1.5px solid var(--line-strong)',
                    fontFamily: 'var(--mono)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                  title={preset.caption}
                >
                  <span>{preset.icon}</span> {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pie de figura explicativo */}
      <input
        type="text"
        value={block.caption ?? ''}
        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
        placeholder="Pie de figura explicativo (ej: 'Figura 1. Esquema de ósmosis en células vegetales')..."
        style={{
          width: '100%',
          fontFamily: 'var(--sans)',
          fontSize: 11.5,
          fontStyle: 'italic',
          padding: '6px 10px',
          border: '1.5px solid var(--line-strong)',
          background: '#fff',
          outline: 'none',
        }}
      />
    </div>
  );

  // ── RENDER PRINCIPAL ──────────────────────────────────────────

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* ── TOAST FLOTANTE DE NOTIFICACIÓN (OCULTO EN PRINT) ── */}
      {saveToast && (
        <div className="no-print" style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--ink)', color: '#fff', padding: '10px 18px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 800, border: '2px solid var(--rust)', boxShadow: '4px 4px 0 var(--rust)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{saveToast}</span>
        </div>
      )}

      {/* ── BARRA SUPERIOR DEL ESTUDIO (COMMAND BAR) ── */}
      <div
        className="no-print"
        style={{
          background: 'var(--paper)',
          border: '2px solid var(--ink)',
          padding: '10px 16px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '4px 4px 0 rgba(18,17,14,0.06)',
        }}
      >
        {/* Lado izquierdo: Selector de Disposición (Split vs Editor vs PDF) & Plantillas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Toggle de Disposición */}
          <div style={{ display: 'flex', border: '2px solid var(--ink)', background: 'var(--cream)', padding: 2 }}>
            <button
              onClick={() => setViewLayout('split')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: viewLayout === 'split' ? 'var(--ink)' : 'transparent',
                color: viewLayout === 'split' ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Ver Editor a la izquierda y Hoja PDF a la derecha en tiempo real"
            >
              ◫ Editor + PDF en Vivo
            </button>
            <button
              onClick={() => setViewLayout('editor')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: viewLayout === 'editor' ? 'var(--ink)' : 'transparent',
                color: viewLayout === 'editor' ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
               Solo Editor
            </button>
            <button
              onClick={() => setViewLayout('pdf')}
              style={{
                padding: '6px 12px',
                border: 'none',
                background: viewLayout === 'pdf' ? 'var(--rust)' : 'transparent',
                color: viewLayout === 'pdf' ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
               Hoja PDF Completa
            </button>
          </div>

          {/* Selector de Modalidad de Respuestas (En la guía vs Hoja ICFES vs Ambas) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '2px solid var(--ink)', background: 'var(--cream)', padding: 2 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 900, color: 'var(--ink-soft)', padding: '0 6px', textTransform: 'uppercase' }}>
              Respuestas:
            </span>
            <button
              type="button"
              onClick={() => {
                setAnswerSheetMode('inline');
                triggerToast(' Modalidad: Responder directamente en la misma guía.');
              }}
              style={{
                padding: '5px 9px',
                border: 'none',
                background: answerSheetMode === 'inline' ? 'var(--ink)' : 'transparent',
                color: answerSheetMode === 'inline' ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Responder marcando directamente en la misma guía"
            >
               En la misma guía
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswerSheetMode('icfes');
                triggerToast(' Modalidad: Hoja de respuestas estilo ICFES / Saber al final.');
              }}
              style={{
                padding: '5px 9px',
                border: 'none',
                background: answerSheetMode === 'icfes' ? 'var(--rust)' : 'transparent',
                color: answerSheetMode === 'icfes' ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Generar hoja de respuestas estilo ICFES / Saber con óvalos al final"
            >
               Hoja ICFES al final
            </button>
            <button
              type="button"
              onClick={() => {
                setAnswerSheetMode('both');
                triggerToast(' Modalidad: Ambas (Casillas en la guía + Hoja ICFES al final).');
              }}
              style={{
                padding: '5px 9px',
                border: 'none',
                background: answerSheetMode === 'both' ? '#2D4327' : 'transparent',
                color: answerSheetMode === 'both' ? '#fff' : 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 10.5,
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Incluir ambas modalidades: casillas en la guía y hoja ICFES al final"
            >
               Ambas
            </button>
          </div>

          <button
            onClick={() => setShowTemplateModal(true)}
            style={{
              padding: '7px 12px',
              border: '2px solid var(--ink)',
              background: '#FFF8F5',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: 800,
              color: 'var(--rust)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
             Plantillas Pedagógicas
          </button>

          {/* Botón de Configuración de Logo & Marca de Agua */}
          <button
            type="button"
            onClick={() => setShowLogoModal(true)}
            style={{
              padding: '7px 12px',
              border: '2px solid var(--ink)',
              background: customLogoUrl || showWatermark ? '#FFF8F5' : '#fff',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: 800,
              color: customLogoUrl || showWatermark ? 'var(--rust)' : 'var(--ink-soft)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            title="Personalizar el logo de la institución y la marca de agua al 20%"
          >
            <span> Logo & Marca de Agua ▾</span>
            {customLogoUrl ? (
              <span style={{ background: 'var(--rust)', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 2, fontWeight: 900 }}>
                SUBIDO
              </span>
            ) : showWatermark ? (
              <span style={{ background: '#2E7D32', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 2, fontWeight: 900 }}>
                {watermarkOpacity}%
              </span>
            ) : (
              <span style={{ background: 'var(--line-strong)', color: 'var(--ink-soft)', fontSize: 9, padding: '1px 5px', borderRadius: 2 }}>
                OFF
              </span>
            )}
          </button>
        </div>

        {/* Lado derecho: Botón de Imprimir PDF + Guardar/Publicar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#2E7D32' }} />
            {lastSavedTime}
          </div>

          <button
            onClick={triggerDownloadPdf}
            style={{
              padding: '8px 14px',
              border: '2px solid var(--ink)',
              background: '#FFF8F5',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              fontWeight: 900,
              color: 'var(--rust)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '2px 2px 0 var(--ink)',
            }}
            title="Descargar la guía en PDF o imprimirla en papel"
          >
             Descargar PDF / Imprimir
          </button>

          {/* Botón de Vista Previa de Resolución Online */}
          <button
            type="button"
            onClick={() => {
              if (guide.questions.length === 0) {
                triggerToast(' Añade al menos 1 pregunta para probar la resolución interactiva.');
                setActiveTab('questions');
                return;
              }
              setShowAssessmentPreviewModal(true);
            }}
            style={{
              padding: '8px 14px',
              border: '2px solid var(--ink)',
              background: '#F0FDF4',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              fontWeight: 900,
              color: '#15803D',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '2px 2px 0 var(--ink)',
            }}
            title="Probar cómo resolverán los estudiantes esta guía de forma virtual online"
          >
            <span> Resolver Online (Preview)</span>
          </button>

          <button
            onClick={() => handleSave('draft')}
            style={{
              padding: '7px 12px',
              border: '2px solid var(--ink)',
              background: 'transparent',
              fontFamily: 'var(--mono)',
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
             Borrador
          </button>

          <button
            onClick={() => handleSave('published')}
            style={{
              padding: '8px 16px',
              border: '2px solid var(--rust)',
              background: 'var(--rust)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              fontWeight: 900,
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '2px 2px 0 var(--ink)',
            }}
          >
             Publicar al Curso
          </button>
        </div>
      </div>

      {/* ── MODAL SELECTOR DE PLANTILLAS ── */}
      {showTemplateModal && (
        <div className="no-print" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(18,17,14,0.6)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--paper)', border: '3px solid var(--ink)', maxWidth: 640, width: '100%', padding: '24px 28px', boxShadow: '8px 8px 0 var(--ink)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '2px solid var(--ink)', paddingBottom: 10 }}>
              <div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 900, color: 'var(--rust)', textTransform: 'uppercase' }}>Smart Starters</span>
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20, margin: '2px 0 0 0', color: 'var(--ink)' }}>Selecciona una Plantilla Pedagógica</h3>
              </div>
              <button onClick={() => setShowTemplateModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', fontWeight: 800 }}>✕</button>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 18 }}>
              Las plantillas precargan una estructura didáctica probada. La hoja PDF de la derecha se actualizará al instante.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  style={{
                    border: '2px solid var(--ink)',
                    padding: '14px 16px',
                    background: 'var(--cream)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FFF8F5';
                    e.currentTarget.style.borderColor = 'var(--rust)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--cream)';
                    e.currentTarget.style.borderColor = 'var(--ink)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{tpl.icon}</span>
                      <strong style={{ fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink)' }}>{tpl.name}</strong>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, padding: '2px 6px', background: 'var(--ink)', color: '#fff', fontWeight: 800 }}>{tpl.badge}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.4 }}>{tpl.description}</div>
                  </div>
                  <button style={{ flexShrink: 0, padding: '6px 12px', background: 'var(--ink)', color: '#fff', border: 'none', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>
                    Usar →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE CONFIGURACIÓN DE LOGO Y MARCA DE AGUA ── */}
      {showLogoModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(18,17,14,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setShowLogoModal(false)}
        >
          <div
            style={{
              background: '#fff',
              border: '3px solid var(--ink)',
              boxShadow: '8px 8px 0 var(--ink)',
              maxWidth: 520,
              width: '100%',
              padding: 24,
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '2px solid var(--ink)', paddingBottom: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 900, color: 'var(--rust)', textTransform: 'uppercase' }}>
                  Identidad Visual de la Guía
                </div>
                <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 800, margin: '2px 0 0 0', color: 'var(--ink)' }}>
                   Logo & Marca de Agua
                </h2>
              </div>
              <button
                onClick={() => setShowLogoModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink)', fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Vista previa del logo actual */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--cream)', border: '1.5px solid var(--line-strong)' }}>
                <div style={{ width: 64, height: 64, background: '#fff', border: '1.5px solid var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, flexShrink: 0 }}>
                  {customLogoUrl ? (
                    <img src={customLogoUrl} alt="Logo actual" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    COLEGIO_NORTE_CREST_SVG
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 900, color: 'var(--ink)' }}>
                    {customLogoUrl ? 'Logo Personalizado Cargado' : 'Escudo Institucional Predeterminado'}
                  </div>
                  <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 2 }}>
                    {customLogoUrl ? 'Se mostrará en el encabezado y en la marca de agua.' : 'Colegio Norte (vectorial oficial).'}
                  </div>
                </div>
              </div>

              {/* Botones de acción para subir / restaurar */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <label
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '10px 14px',
                    background: 'var(--ink)',
                    color: '#fff',
                    border: '2px solid var(--ink)',
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textAlign: 'center',
                  }}
                >
                  <span> Subir Logo Propio (PNG / JPG / SVG)</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCustomLogo(file);
                    }}
                  />
                </label>

                {customLogoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomLogo}
                    style={{
                      padding: '10px 12px',
                      border: '2px solid var(--rust)',
                      background: '#FFF8F5',
                      color: 'var(--rust)',
                      fontFamily: 'var(--mono)',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                    title="Restaurar el escudo por defecto de Colegio Norte"
                  >
                    Restaurar Original
                  </button>
                )}
              </div>

              {/* Control de Opacidad de la Marca de Agua */}
              <div style={{ background: '#FAF9F6', border: '1.5px solid var(--line-strong)', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>
                    Opacidad de la Marca de Agua:
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 900, color: 'var(--rust)' }}>
                    {watermarkOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="5"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--rust)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-soft)', marginTop: 4 }}>
                  <span>5% (Muy sutil)</span>
                  <span>20% (Recomendado)</span>
                  <span>40% (Notorio)</span>
                </div>
              </div>

              {/* Checkboxes de Visibilidad */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={showLogoInHeader}
                    onChange={(e) => setShowLogoInHeader(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--rust)' }}
                  />
                  <span>Mostrar logo en el membrete/encabezado de cada hoja</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: 'var(--sans)', fontSize: 12.5, fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--rust)' }}
                  />
                  <span>Mostrar marca de agua al {watermarkOpacity}% en el centro de las páginas</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                style={{
                  padding: '10px',
                  background: 'var(--rust)',
                  color: '#fff',
                  border: '2px solid var(--ink)',
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  textAlign: 'center',
                  boxShadow: '3px 3px 0 var(--ink)',
                }}
              >
                ✓ Guardar y Aplicar a la Guía
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL COMPLETO DE RESOLUCIÓN ONLINE (PREVIEW DOCENTE) ── */}
      {showAssessmentPreviewModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(18,17,14,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 12000,
            padding: 16,
          }}
          onClick={() => setShowAssessmentPreviewModal(false)}
        >
          <div
            style={{
              background: '#FAF9F6',
              border: '3px solid var(--ink)',
              boxShadow: '10px 10px 0 var(--ink)',
              maxWidth: 1140,
              width: '100%',
              maxHeight: '94vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AssessmentRunner
              assessmentData={buildAssessmentDataFromStudio(guide)}
              onClose={() => setShowAssessmentPreviewModal(false)}
              isModal={true}
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* ── CUERPO PRINCIPAL: DISPOSICIÓN DIVIDIDA (SPLIT) O SIMPLE ── */}
      {/* ════════════════════════════════════════════════════════════════ */}

      {/* 1. MODO SPLIT: EDITOR IZQUIERDA + HOJA PDF DERECHA */}
      {viewLayout === 'split' && (
        <div className="wizard-split-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) minmax(460px, 1.05fr)', gap: 24, alignItems: 'start' }}>
          {/* COLUMNA IZQUIERDA: CONTROLES Y FORMULARIO DE BLOQUES */}
          <div className="no-print wizard-editor-col">
            {/* CABECERA EDITORIAL */}
            <div style={{ background: '#fff', border: '2px solid var(--ink)', padding: '20px 22px', marginBottom: 16, boxShadow: '3px 3px 0 rgba(18,17,14,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, background: 'var(--rust)', color: '#fff', padding: '2px 7px', fontWeight: 900, textTransform: 'uppercase' }}>
                  {courseName}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-soft)' }}>
                  Modo Edición Docente
                </span>
              </div>

              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4 }}>
                Título de la Guía:
              </label>
              <input
                type="text"
                value={guide.title}
                onChange={(e) => setGuide((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Escribe el título de la guía..."
                style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 700, color: 'var(--ink)', border: '1.5px solid var(--ink)', padding: '6px 10px', background: 'var(--cream)', outline: 'none', marginBottom: 10 }}
              />

              <label style={{ display: 'block', fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4 }}>
                Objetivo didáctico / Resumen:
              </label>
              <textarea
                value={guide.description}
                onChange={(e) => setGuide((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Propósito pedagógico para los estudiantes..."
                rows={2}
                style={{ width: '100%', fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--ink)', border: '1.5px solid var(--line)', padding: '6px 10px', background: 'var(--paper)', outline: 'none', resize: 'vertical', lineHeight: 1.4 }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--mono)', fontSize: 11 }}>
                  <span style={{ color: 'var(--ink-soft)', fontWeight: 700 }}> MINUTOS:</span>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={guide.estimatedMinutes}
                    onChange={(e) => setGuide((prev) => ({ ...prev, estimatedMinutes: Number(e.target.value) }))}
                    style={{ width: 55, padding: '2px 6px', border: '1.5px solid var(--ink)', background: 'var(--cream)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, textAlign: 'center' }}
                  />
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--ink-soft)' }}>
                   <strong>{guide.blocks.length}</strong> bloques · <strong>{guide.questions.length}</strong> preguntas
                </div>
              </div>
            </div>

            {/* PESTAÑAS: BLOQUES vs PREGUNTAS */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <button
                onClick={() => setActiveTab('content')}
                style={{
                  padding: '7px 14px',
                  border: '2px solid var(--ink)',
                  borderBottom: activeTab === 'content' ? 'none' : '2px solid var(--ink)',
                  background: activeTab === 'content' ? 'var(--ink)' : 'var(--cream)',
                  color: activeTab === 'content' ? '#fff' : 'var(--ink)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                 Bloques ({guide.blocks.length})
              </button>

              <button
                onClick={() => setActiveTab('questions')}
                style={{
                  padding: '7px 14px',
                  border: '2px solid var(--ink)',
                  borderBottom: activeTab === 'questions' ? 'none' : '2px solid var(--ink)',
                  background: activeTab === 'questions' ? 'var(--rust)' : 'var(--cream)',
                  color: activeTab === 'questions' ? '#fff' : 'var(--ink)',
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                 Preguntas / Checkpoints ({guide.questions.length})
              </button>
            </div>

            {/* TAB 1: LISTA DE BLOQUES */}
            {activeTab === 'content' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {guide.blocks.map((block, index) => (
                  <React.Fragment key={block.id}>
                    <div
                      style={{
                        background: block.type === 'callout' ? (block.calloutVariant === 'activity' ? '#F2F6F0' : block.calloutVariant === 'warning' ? '#FDF6E9' : block.calloutVariant === 'vocabulary' ? '#F6F3EC' : '#FFF8F5') : 'var(--paper)',
                        border: '1.5px solid var(--ink)',
                        borderLeft: block.type === 'callout' ? '5px solid var(--rust)' : '1.5px solid var(--ink)',
                        padding: '12px 14px',
                        boxShadow: '2px 2px 0 rgba(18,17,14,0.05)',
                      }}
                    >
                      {/* Cabecera del bloque */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 900, background: 'var(--ink)', color: '#fff', padding: '2px 6px' }}>
                            § {block.order}
                          </span>

                          <select
                            value={block.type === 'callout' ? `callout:${block.calloutVariant ?? 'idea'}` : block.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.startsWith('callout:')) {
                                const variant = val.split(':')[1] as CalloutVariant;
                                updateBlock(block.id, { type: 'callout', calloutVariant: variant });
                              } else {
                                updateBlock(block.id, { type: val as BlockType });
                              }
                            }}
                            style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, padding: '2px 6px', border: '1px solid var(--ink)', background: '#fff' }}
                          >
                            <option value="heading"> Título</option>
                            <option value="paragraph">¶ Párrafo</option>
                            <option value="callout:idea"> Idea Clave</option>
                            <option value="callout:activity"> Actividad</option>
                            <option value="callout:vocabulary"> Glosario</option>
                            <option value="callout:warning"> Atención</option>
                            <option value="image">▣ Imagen</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => addQuestionForBlock(block.id)}
                            style={{ padding: '2px 6px', background: '#FFF8F5', border: '1px solid var(--rust)', color: 'var(--rust)', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, cursor: 'pointer' }}
                            title="Preguntar sobre este bloque"
                          >
                            +  Preguntar
                          </button>
                          <button type="button" onClick={() => moveBlock(index, 'up')} disabled={index === 0} style={{ padding: '2px 5px', border: '1px solid var(--ink)', background: 'transparent', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>▲</button>
                          <button type="button" onClick={() => moveBlock(index, 'down')} disabled={index === guide.blocks.length - 1} style={{ padding: '2px 5px', border: '1px solid var(--ink)', background: 'transparent', cursor: index === guide.blocks.length - 1 ? 'not-allowed' : 'pointer', opacity: index === guide.blocks.length - 1 ? 0.3 : 1 }}>▼</button>
                          <button type="button" onClick={() => removeBlock(block.id)} style={{ padding: '2px 5px', border: '1px solid var(--rust)', background: 'transparent', color: 'var(--rust)', fontWeight: 800, cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>

                      {/* Input del bloque */}
                      {block.type === 'heading' && (
                        <input
                          type="text"
                          value={block.title ?? ''}
                          onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                          placeholder="Título de la Sección..."
                          style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', padding: '5px 8px', border: '1px solid var(--line-strong)', background: 'var(--cream)', outline: 'none' }}
                        />
                      )}

                      {block.type === 'paragraph' && (
                        <textarea
                          value={block.content}
                          onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                          placeholder="Escribe el texto explicativo aquí..."
                          rows={3}
                          style={{ width: '100%', fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink)', padding: '6px 8px', border: '1px solid var(--line-strong)', background: '#fff', outline: 'none', resize: 'vertical' }}
                        />
                      )}

                      {block.type === 'callout' && (
                        <div>
                          <input
                            type="text"
                            value={block.title ?? ''}
                            onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                            placeholder="Título del Recuadro..."
                            style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: 13, fontWeight: 700, color: 'var(--rust)', padding: '4px 8px', border: '1px solid var(--rust)', background: '#fff', outline: 'none', marginBottom: 4 }}
                          />
                          <textarea
                            value={block.content}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            placeholder="Texto del recuadro destacado..."
                            rows={2}
                            style={{ width: '100%', fontFamily: 'var(--sans)', fontSize: 12.5, color: 'var(--ink)', padding: '6px 8px', border: '1px solid var(--line-strong)', background: '#fff', outline: 'none', resize: 'vertical' }}
                          />
                        </div>
                      )}

                      {block.type === 'image' && renderImageBlockEditor(block)}
                    </div>

                    {/* BOTÓN CONTEXTUAL + */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '1px 0' }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                      <div style={{ display: 'flex', gap: 4, padding: '0 6px' }}>
                        <button type="button" onClick={() => addBlock('paragraph', index + 1)} style={{ padding: '2px 6px', background: 'var(--paper)', border: '1px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>+ ¶ Texto</button>
                        <button type="button" onClick={() => addBlock('heading', index + 1)} style={{ padding: '2px 6px', background: 'var(--paper)', border: '1px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>+  Título</button>
                        <button type="button" onClick={() => addBlock('callout', index + 1, 'idea')} style={{ padding: '2px 6px', background: '#FFF8F5', border: '1px solid var(--rust)', color: 'var(--rust)', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>+  Idea</button>
                        <button type="button" onClick={() => addBlock('image', index + 1)} style={{ padding: '2px 6px', background: 'var(--paper)', border: '1px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}>+ ▣ Imagen</button>
                      </div>
                      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                    </div>
                  </React.Fragment>
                ))}

                {/* Botón inferior */}
                <div style={{ padding: '12px', background: 'var(--cream)', border: '1.5px dashed var(--ink)', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => addBlock('paragraph')} style={{ padding: '6px 12px', background: 'var(--ink)', color: '#fff', border: '1.5px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>+ Agregar Párrafo</button>
                  <button type="button" onClick={() => addBlock('heading')} style={{ padding: '6px 12px', background: 'var(--paper)', color: 'var(--ink)', border: '1.5px solid var(--ink)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>+ Nueva Sección</button>
                  <button type="button" onClick={() => addBlock('callout', undefined, 'idea')} style={{ padding: '6px 12px', background: '#FFF8F5', color: 'var(--rust)', border: '1.5px solid var(--rust)', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>+ Recuadro Destacado</button>
                </div>
              </div>
            )}

            {/* TAB 2: GESTOR DE PREGUNTAS */}
            {activeTab === 'questions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, color: 'var(--ink)' }}>PREGUNTAS FORMATIVAS ({guide.questions.length})</span>
                  <button type="button" onClick={() => addQuestionForBlock()} style={{ padding: '6px 12px', background: 'var(--rust)', color: '#fff', border: 'none', fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>+ Nueva Pregunta</button>
                </div>

                {/* Banner de Acceso Rápido a la Pasarela Virtual */}
                {guide.questions.length > 0 && (
                  <div style={{ background: '#F0FDF4', border: '1.5px solid #16A34A', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 900, color: '#166534', textTransform: 'uppercase' }}>
                         PASARELA DE EVALUACIÓN VIRTUAL
                      </div>
                      <div style={{ fontFamily: 'var(--sans)', fontSize: 11.5, color: '#14532D', marginTop: 1 }}>
                        Prueba cómo el estudiante resolverá estas {guide.questions.length} preguntas online.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAssessmentPreviewModal(true)}
                      style={{
                        padding: '6px 12px',
                        background: '#16A34A',
                        color: '#fff',
                        border: 'none',
                        fontFamily: 'var(--mono)',
                        fontSize: 10.5,
                        fontWeight: 900,
                        cursor: 'pointer',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                      title="Abrir la pasarela de resolución interactiva"
                    >
                      <span>▶ Probar Modo Online</span>
                    </button>
                  </div>
                )}

                {/* Selector de Modalidad de Respuestas Pedagógica */}
                <div style={{ background: '#FFF8F5', border: '1.5px solid var(--rust)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 900, color: 'var(--rust)', textTransform: 'uppercase' }}>
                       FORMATO DE RESPUESTAS DEL ESTUDIANTE:
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--ink-soft)' }}>
                      {answerSheetMode === 'inline' ? 'Casillas en la guía' : answerSheetMode === 'icfes' ? 'Burbujas tipo ICFES' : 'Casillas + Hoja ICFES'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setAnswerSheetMode('inline');
                        triggerToast(' Modalidad: Responder directamente en la misma guía.');
                      }}
                      style={{
                        padding: '6px 8px',
                        border: answerSheetMode === 'inline' ? '2px solid var(--ink)' : '1px solid var(--line-strong)',
                        background: answerSheetMode === 'inline' ? 'var(--ink)' : '#fff',
                        color: answerSheetMode === 'inline' ? '#fff' : 'var(--ink)',
                        fontFamily: 'var(--mono)',
                        fontSize: 10.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                       En la misma guía
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnswerSheetMode('icfes');
                        triggerToast(' Modalidad: Hoja de respuestas estilo ICFES al final.');
                      }}
                      style={{
                        padding: '6px 8px',
                        border: answerSheetMode === 'icfes' ? '2px solid var(--rust)' : '1px solid var(--line-strong)',
                        background: answerSheetMode === 'icfes' ? 'var(--rust)' : '#fff',
                        color: answerSheetMode === 'icfes' ? '#fff' : 'var(--ink)',
                        fontFamily: 'var(--mono)',
                        fontSize: 10.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                       Hoja ICFES
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnswerSheetMode('both');
                        triggerToast(' Modalidad: Ambas (En la guía + Hoja ICFES).');
                      }}
                      style={{
                        padding: '6px 8px',
                        border: answerSheetMode === 'both' ? '2px solid #2D4327' : '1px solid var(--line-strong)',
                        background: answerSheetMode === 'both' ? '#2D4327' : '#fff',
                        color: answerSheetMode === 'both' ? '#fff' : 'var(--ink)',
                        fontFamily: 'var(--mono)',
                        fontSize: 10.5,
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                       Ambas
                    </button>
                  </div>
                </div>

                {guide.questions.length === 0 ? (
                  <div style={{ padding: '24px 14px', textAlign: 'center', border: '1.5px dashed var(--line)', background: 'var(--paper)', color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 11.5 }}>
                    No hay preguntas todavía. Añade una para evaluar la comprensión.
                  </div>
                ) : (
                  guide.questions.map((q, qi) => (
                    <div key={q.id} style={{ background: 'var(--paper)', border: '1.5px solid var(--ink)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 900, background: 'var(--rust)', color: '#fff', padding: '2px 6px' }}>Q{qi + 1}</span>
                          <select value={q.type} onChange={(e) => updateQuestion(q.id, { type: e.target.value as QuestionType })} style={{ fontFamily: 'var(--mono)', fontSize: 10, padding: '2px 4px' }}>
                            <option value="multiple_choice">Opción Múltiple</option>
                            <option value="true_false">Verdadero / Falso</option>
                          </select>
                        </div>
                        <button type="button" onClick={() => removeQuestion(q.id)} style={{ padding: '2px 6px', border: '1px solid var(--rust)', background: 'transparent', color: 'var(--rust)', fontSize: 10, cursor: 'pointer' }}>✕</button>
                      </div>

                      <input
                        type="text"
                        value={q.prompt}
                        onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                        placeholder="Enunciado de la pregunta..."
                        style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: 13.5, fontWeight: 600, padding: '5px 8px', border: '1px solid var(--line-strong)', background: 'var(--cream)', outline: 'none', marginBottom: 8 }}
                      />

                      {q.type === 'multiple_choice' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                          {q.options.map((opt, oi) => (
                            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <input type="radio" name={`correct-${q.id}`} checked={q.correctAnswerIndex === oi} onChange={() => updateQuestion(q.id, { correctAnswerIndex: oi })} style={{ accentColor: 'var(--rust)' }} />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const opts = [...q.options];
                                  opts[oi] = e.target.value;
                                  updateQuestion(q.id, { options: opts });
                                }}
                                style={{ flex: 1, padding: '4px 6px', border: `1px solid ${q.correctAnswerIndex === oi ? 'var(--rust)' : 'var(--line)'}`, background: q.correctAnswerIndex === oi ? '#FFF8F5' : '#fff', fontSize: 11 }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={q.explanation}
                        onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Justificación pedagógica / Retroalimentación..."
                        rows={2}
                        style={{ width: '100%', fontFamily: 'var(--sans)', fontSize: 11, padding: '4px 6px', border: '1px solid var(--line)', background: '#fff', outline: 'none', marginBottom: 8 }}
                      />

                      {/* Vinculación de Imagen a la Pregunta */}
                      <div style={{ background: '#FAF9F6', border: '1px dashed var(--line-strong)', padding: '6px 8px', fontSize: 11 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, fontWeight: 800, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>
                             Imagen / Figura Didáctica:
                          </span>
                          {q.imageUrl && (
                            <button
                              type="button"
                              onClick={() => updateQuestion(q.id, { imageUrl: undefined, imageCaption: undefined })}
                              style={{ border: 'none', background: 'none', color: 'var(--rust)', fontSize: 10, cursor: 'pointer', fontWeight: 800 }}
                            >
                              ✕ Quitar Imagen
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="text"
                            value={q.imageUrl || ''}
                            onChange={(e) => updateQuestion(q.id, { imageUrl: e.target.value })}
                            placeholder="URL o sube una imagen para la pregunta..."
                            style={{ flex: 1, padding: '4px 6px', fontSize: 10.5, border: '1px solid var(--line-strong)', background: '#fff' }}
                          />
                          <label
                            style={{
                              padding: '4px 8px',
                              background: 'var(--ink)',
                              color: '#fff',
                              fontFamily: 'var(--mono)',
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span>Subir </span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    updateQuestion(q.id, { imageUrl: ev.target?.result as string });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>

                        {q.imageUrl && (
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <img src={q.imageUrl} alt="Preview" style={{ width: 42, height: 42, objectFit: 'contain', border: '1px solid var(--line-strong)', background: '#fff' }} />
                            <input
                              type="text"
                              value={q.imageCaption || ''}
                              onChange={(e) => updateQuestion(q.id, { imageCaption: e.target.value })}
                              placeholder="Pie de figura (ej: Figura 1. Membrana plasmática)..."
                              style={{ flex: 1, padding: '3px 6px', fontSize: 10, border: '1px solid var(--line)', background: '#fff' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* COLUMNA DERECHA: HOJA EDITORIAL PDF EN VIVO */}
          <div className="wizard-pdf-col" style={{ position: 'sticky', top: 16, maxHeight: 'calc(100vh - 80px)', overflowY: 'auto' }}>
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--ink)', color: '#fff', padding: '8px 14px', marginBottom: 8, fontSize: 11, fontFamily: 'var(--mono)', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--rust)' }}></span>
                <strong>HOJA EDITORIAL PDF EN VIVO</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={showTeacherKeyInPdf} onChange={(e) => setShowTeacherKeyInPdf(e.target.checked)} />
                  Solucionario
                </label>
                <button
                  onClick={triggerDownloadPdf}
                  style={{
                    padding: '3px 9px',
                    background: 'var(--rust)',
                    color: '#fff',
                    border: '1px solid var(--rust)',
                    fontFamily: 'var(--mono)',
                    fontSize: 10,
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Descargar esta guía como PDF o imprimirla"
                >
                   Descargar PDF
                </button>
              </div>
            </div>

            {renderPdfSheet(false)}
          </div>
        </div>
      )}

      {/* 2. MODO SOLO EDITOR */}
      {viewLayout === 'editor' && (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          {/* Renderiza el editor expandido */}
          <div style={{ background: '#fff', border: '2px solid var(--ink)', padding: '24px 28px', marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, background: 'var(--rust)', color: '#fff', padding: '2px 8px', fontWeight: 900, textTransform: 'uppercase' }}>
              {courseName}
            </span>
            <input
              type="text"
              value={guide.title}
              onChange={(e) => setGuide((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Título de la Guía..."
              style={{ width: '100%', fontFamily: 'var(--serif)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', border: 'none', borderBottom: '2px dashed var(--line-strong)', padding: '8px 0', outline: 'none', margin: '10px 0' }}
            />
            <textarea
              value={guide.description}
              onChange={(e) => setGuide((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Objetivo pedagógico..."
              rows={2}
              style={{ width: '100%', fontFamily: 'var(--sans)', fontSize: 13.5, color: 'var(--ink-soft)', border: '1.5px solid var(--line)', padding: '8px 12px', background: 'var(--paper)', outline: 'none' }}
            />
          </div>

          {/* Bloques */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {guide.blocks.map((block, index) => (
              <div key={block.id} style={{ background: 'var(--paper)', border: '2px solid var(--ink)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 900, background: 'var(--ink)', color: '#fff', padding: '2px 8px' }}>§ {block.order} · {block.type}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => moveBlock(index, 'up')} disabled={index === 0}>▲</button>
                    <button onClick={() => moveBlock(index, 'down')} disabled={index === guide.blocks.length - 1}>▼</button>
                    <button onClick={() => removeBlock(block.id)} style={{ color: 'var(--rust)' }}>✕</button>
                  </div>
                </div>
                {block.type === 'heading' && <input type="text" value={block.title ?? ''} onChange={(e) => updateBlock(block.id, { title: e.target.value })} style={{ width: '100%', padding: '6px 10px', fontSize: 16, fontFamily: 'var(--serif)', fontWeight: 700 }} />}
                {block.type === 'paragraph' && <textarea value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} rows={3} style={{ width: '100%', padding: '8px 10px', fontSize: 13.5 }} />}
                {block.type === 'callout' && <textarea value={block.content} onChange={(e) => updateBlock(block.id, { content: e.target.value })} rows={2} style={{ width: '100%', padding: '8px 10px', fontSize: 13 }} />}
                {block.type === 'image' && renderImageBlockEditor(block)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. MODO SOLO HOJA PDF / IMPRESIÓN */}
      {viewLayout === 'pdf' && (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div className="no-print" style={{ background: 'var(--ink)', color: '#fff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>
              <span style={{ color: 'var(--rust)', fontWeight: 900 }}>● VISTA PREVIA COMPLETA DE IMPRESIÓN (A4):</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={triggerDownloadPdf}
                style={{ padding: '6px 16px', background: 'var(--rust)', color: '#fff', border: 'none', fontFamily: 'var(--mono)', fontSize: 11.5, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                 Descargar PDF / Imprimir
              </button>
              <button onClick={() => setViewLayout('split')} style={{ padding: '6px 12px', background: '#fff', color: 'var(--ink)', border: 'none', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                ← Volver a Vista Dividida
              </button>
            </div>
          </div>

          {renderPdfSheet(true)}
        </div>
      )}
    </div>
  );
}

