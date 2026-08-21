// ============================================================
// SchoolOS — Mock Data: Contenido, Guías y Evaluaciones (Fase 3)
// teacherId: 'usr-1' | schoolId: 'sch-1'
// ============================================================

import type {
  Guide,
  GuideBlock,
  Evaluation,
  Question,
  StudentResult,
  TeacherDashboardStats,
} from '../../types/content';

// ------------------------------------------------------------
// PERFIL DEL PROFESOR
// ------------------------------------------------------------

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  role: 'teacher';
  schoolId: string;
  schoolName: string;
  avatarInitials: string;
}

export function getTeacherProfile(): TeacherProfile {
  return {
    id: 'usr-1',
    name: 'Diana Restrepo',
    email: 'diana.restrepo@colegio-norte.edu.co',
    role: 'teacher',
    schoolId: 'sch-1',
    schoolName: 'Colegio Norte',
    avatarInitials: 'DR',
  };
}

// ------------------------------------------------------------
// CURSOS
// ------------------------------------------------------------

export interface TeacherCourse {
  id: string;
  name: string;
  level: string;
  teacherId: string;
  studentCount: number;
  guidesPublished: number;
  averageScore: number;
  schedule: string;
  room: string;
}

const TEACHER_COURSES: TeacherCourse[] = [
  {
    id: 'crs-bio-10a',
    name: 'Biología Celular y Genética 10°A',
    level: '10° Grado A',
    teacherId: 'usr-1',
    studentCount: 30,
    guidesPublished: 3,
    averageScore: 8.2,
    schedule: 'Lun/Mié 08:30–10:00',
    room: 'Lab. Ciencias 1',
  },
  {
    id: 'crs-bio-10b',
    name: 'Biología Celular y Genética 10°B',
    level: '10° Grado B',
    teacherId: 'usr-1',
    studentCount: 25,
    guidesPublished: 2,
    averageScore: 7.8,
    schedule: 'Mar/Jue 10:30–12:00',
    room: 'Salón 204',
  },
  {
    id: 'crs-bio-10c',
    name: 'Biología Celular y Genética 10°C',
    level: '10° Grado C',
    teacherId: 'usr-1',
    studentCount: 28,
    guidesPublished: 2,
    averageScore: 8.0,
    schedule: 'Lun/Mié 10:30–12:00',
    room: 'Salón 205',
  },
  {
    id: 'crs-eco-11a',
    name: 'Ecología y Medio Ambiente 11°A',
    level: '11° Grado A',
    teacherId: 'usr-1',
    studentCount: 30,
    guidesPublished: 1,
    averageScore: 8.5,
    schedule: 'Vie 07:00–10:00',
    room: 'Salón 301',
  },
  {
    id: 'crs-eco-11b',
    name: 'Ecología y Medio Ambiente 11°B',
    level: '11° Grado B',
    teacherId: 'usr-1',
    studentCount: 27,
    guidesPublished: 1,
    averageScore: 8.1,
    schedule: 'Vie 10:30–13:30',
    room: 'Salón 302',
  },
  {
    id: 'crs-cna-9a',
    name: 'Ciencias Naturales y Química 9°A',
    level: '9° Grado A',
    teacherId: 'usr-1',
    studentCount: 32,
    guidesPublished: 2,
    averageScore: 7.6,
    schedule: 'Mar/Jue 07:00–08:30',
    room: 'Salón 102',
  },
];

export function getTeacherCourses(): TeacherCourse[] {
  return TEACHER_COURSES.filter((c) => c.teacherId === 'usr-1');
}

export function getTeacherCourseById(id: string): TeacherCourse | undefined {
  return TEACHER_COURSES.find((c) => c.id === id);
}

// ------------------------------------------------------------
// BLOQUES DE GUÍAS
// ------------------------------------------------------------

const GUIDE_BLOCKS: GuideBlock[] = [
  // — gd-1 bloques (Célula Eucariota) —
  {
    id: 'blk-1',
    guideId: 'gd-1',
    order: 1,
    type: 'heading',
    title: 'Introducción a la Célula',
    content: 'Introducción a la Célula',
  },
  {
    id: 'blk-2',
    guideId: 'gd-1',
    order: 2,
    type: 'paragraph',
    content:
      'La membrana plasmática es una bicapa lipídica que rodea a toda célula. Su función principal es regular el paso de sustancias hacia el interior y exterior celular, manteniendo el equilibrio homeostático del organismo.',
  },
  {
    id: 'blk-3',
    guideId: 'gd-1',
    order: 3,
    type: 'paragraph',
    content:
      'El núcleo celular es el centro de control de la célula eucariota. Contiene el ADN organizado en cromosomas y dirige los procesos de replicación, transcripción y, por ende, la síntesis de proteínas a través del ARN mensajero.',
  },
  {
    id: 'blk-4',
    guideId: 'gd-1',
    order: 4,
    type: 'callout',
    title: '¡Dato clave!',
    content:
      'La célula eucariota tiene membrana nuclear que la diferencia de la procariota. Esta característica es la base de la clasificación del dominio Eukarya.',
  },
  {
    id: 'blk-5',
    guideId: 'gd-1',
    order: 5,
    type: 'paragraph',
    content:
      'Las mitocondrias son los orgánulos responsables de la producción de energía celular en forma de ATP mediante el proceso de respiración celular aeróbica. Por eso se les conoce como "la central energética de la célula".',
  },
  // — gd-2 bloques (Genética Mendeliana) —
  {
    id: 'blk-6',
    guideId: 'gd-2',
    order: 1,
    type: 'heading',
    title: 'Leyes de Mendel',
    content: 'Leyes de Mendel',
  },
  {
    id: 'blk-7',
    guideId: 'gd-2',
    order: 2,
    type: 'paragraph',
    content:
      'Gregor Mendel estableció las bases de la genética moderna mediante experimentos con plantas de guisante. Su Primera Ley (Segregación) establece que cada individuo porta dos alelos para cada carácter, y estos se separan durante la formación de gametos.',
  },
  {
    id: 'blk-8',
    guideId: 'gd-2',
    order: 3,
    type: 'paragraph',
    content:
      'Los cuadros de Punnett son herramientas gráficas que permiten predecir las proporciones genotípicas y fenotípicas de la descendencia al cruzar dos individuos conocidos.',
  },
  {
    id: 'blk-9',
    guideId: 'gd-2',
    order: 4,
    type: 'callout',
    title: 'Recuerda',
    content:
      'En un cuadro de Punnett monohíbrido (Aa × Aa), la proporción fenotípica esperada es 3:1 (dominante:recesivo).',
  },
  // — gd-3 bloques (Ecología) —
  {
    id: 'blk-10',
    guideId: 'gd-3',
    order: 1,
    type: 'heading',
    title: 'Ecología y Dinámica de Poblaciones',
    content: 'Ecología y Dinámica de Poblaciones',
  },
  {
    id: 'blk-11',
    guideId: 'gd-3',
    order: 2,
    type: 'paragraph',
    content:
      'Una población es un conjunto de individuos de la misma especie que cohabitan en un área geográfica determinada en un mismo tiempo. Su dinámica está influenciada por tasas de natalidad, mortalidad, inmigración y emigración.',
  },
  {
    id: 'blk-12',
    guideId: 'gd-3',
    order: 3,
    type: 'paragraph',
    content:
      'La capacidad de carga (K) representa el número máximo de individuos que un ecosistema puede sostener dados sus recursos disponibles. Cuando la población supera K, los recursos se vuelven limitantes y la tasa de crecimiento decrece.',
  },
];

// ------------------------------------------------------------
// GUÍAS
// ------------------------------------------------------------

const GUIDES: Guide[] = [
  {
    id: 'gd-1',
    courseId: 'crs-bio-10a',
    courseName: 'Biología Celular y Genética 10°A',
    teacherId: 'usr-1',
    teacherName: 'Diana Restrepo',
    title: 'Estructura y Función de la Célula Eucariota',
    description:
      'Guía introductoria sobre los componentes esenciales de la célula eucariota: membrana plasmática, núcleo y mitocondrias.',
    status: 'published',
    estimatedMinutes: 25,
    blocks: GUIDE_BLOCKS.filter((b) => b.guideId === 'gd-1'),
    evaluationsCount: 1,
    createdAt: '2026-08-10T09:00:00Z',
    updatedAt: '2026-08-11T14:00:00Z',
  },
  {
    id: 'gd-2',
    courseId: 'crs-bio-10a',
    courseName: 'Biología Celular y Genética 10°A',
    teacherId: 'usr-1',
    teacherName: 'Diana Restrepo',
    title: 'Genética Mendeliana y Cuadros de Punnett',
    description:
      'Estudio de las leyes de Mendel y aplicación de cuadros de Punnett para calcular proporciones genotípicas y fenotípicas.',
    status: 'published',
    estimatedMinutes: 30,
    blocks: GUIDE_BLOCKS.filter((b) => b.guideId === 'gd-2'),
    evaluationsCount: 1,
    createdAt: '2026-08-12T10:00:00Z',
    updatedAt: '2026-08-13T09:30:00Z',
  },
  {
    id: 'gd-3',
    courseId: 'crs-eco-11a',
    courseName: 'Ecología y Medio Ambiente 11°A',
    teacherId: 'usr-1',
    teacherName: 'Diana Restrepo',
    title: 'Ecología y Dinámica de Poblaciones',
    description:
      'Introducción a los conceptos de población, dinámica poblacional y capacidad de carga del ecosistema. (Borrador en progreso)',
    status: 'draft',
    estimatedMinutes: 20,
    blocks: GUIDE_BLOCKS.filter((b) => b.guideId === 'gd-3'),
    evaluationsCount: 0,
    createdAt: '2026-08-15T08:00:00Z',
    updatedAt: '2026-08-15T08:00:00Z',
  },
];

// ------------------------------------------------------------
// PREGUNTAS
// ------------------------------------------------------------

const QUESTIONS: Question[] = [
  {
    id: 'q-1',
    evaluationId: 'eval-1',
    prompt: '¿Qué estructura celular controla el ingreso y egreso de sustancias?',
    type: 'multiple_choice',
    options: ['Núcleo', 'Membrana plasmática', 'Mitocondria', 'Ribosoma'],
    correctAnswerIndex: 1,
    explanation:
      'La membrana plasmática actúa como barrera selectiva que regula qué sustancias entran y salen de la célula.',
    referencedBlockIds: ['blk-2'],
  },
  {
    id: 'q-2',
    evaluationId: 'eval-1',
    prompt: '¿Cuál es la función principal del núcleo celular?',
    type: 'multiple_choice',
    options: ['Producir energía', 'Sintetizar proteínas', 'Contener el ADN', 'Degradar residuos'],
    correctAnswerIndex: 2,
    explanation:
      'El núcleo contiene el ADN de la célula y dirige la síntesis de proteínas.',
    referencedBlockIds: ['blk-3'],
  },
  {
    id: 'q-3',
    evaluationId: 'eval-1',
    prompt: 'Las células eucariotas poseen membrana nuclear.',
    type: 'true_false',
    options: ['Verdadero', 'Falso'],
    correctAnswerIndex: 0,
    explanation:
      'Correcto. La presencia de membrana nuclear es la característica definitoria de las células eucariotas.',
    referencedBlockIds: ['blk-4'],
  },
  {
    id: 'q-4',
    evaluationId: 'eval-1',
    prompt: '¿Cuál orgánulo produce energía (ATP) en la célula?',
    type: 'multiple_choice',
    options: ['Vacuola', 'Núcleo', 'Mitocondria', 'Lisosoma'],
    correctAnswerIndex: 2,
    explanation:
      'Las mitocondrias realizan la respiración celular aeróbica produciendo la mayor parte del ATP.',
    referencedBlockIds: ['blk-5'],
  },
];

// ------------------------------------------------------------
// EVALUACIONES
// ------------------------------------------------------------

const EVALUATIONS: Evaluation[] = [
  {
    id: 'eval-1',
    guideId: 'gd-1',
    guideTitle: 'Estructura y Función de la Célula Eucariota',
    title: 'Cuestionario de Comprensión: Biología Celular',
    mode: 'virtual',
    passingScore: 70,
    timeLimitMinutes: 45,
    maxAttempts: 2,
    questions: QUESTIONS.filter((q) => q.evaluationId === 'eval-1'),
    totalSubmissions: 24,
    averageScore: 78.5,
    createdAt: '2026-08-11T15:00:00Z',
  },
  {
    id: 'eval-2',
    guideId: 'gd-2',
    guideTitle: 'Genética Mendeliana y Cuadros de Punnett',
    title: 'Evaluación Presencial: Leyes de Mendel',
    mode: 'in_person',
    passingScore: 60,
    maxAttempts: 1,
    questions: [],
    totalSubmissions: 0,
    averageScore: undefined,
    createdAt: '2026-08-13T10:00:00Z',
  },
];

// ------------------------------------------------------------
// RESULTADOS DE ALUMNOS
// ------------------------------------------------------------

const STUDENT_RESULTS: (StudentResult & { evaluationId: string })[] = [
  // eval-1 (virtual, 8 alumnos calificados)
  { evaluationId: 'eval-1', studentId: 'std-1', studentName: 'Valentina Torres',  groupCode: '10-1', attemptNumber: 1, score: 90, status: 'graded', submittedAt: '2026-08-14T10:20:00Z' },
  { evaluationId: 'eval-1', studentId: 'std-2', studentName: 'Mateo García',      groupCode: '10-1', attemptNumber: 2, score: 75, status: 'graded', submittedAt: '2026-08-14T10:45:00Z' },
  { evaluationId: 'eval-1', studentId: 'std-3', studentName: 'Sofía López',       groupCode: '10-1', attemptNumber: 1, score: 55, status: 'failed', submittedAt: '2026-08-14T10:15:00Z' },
  { evaluationId: 'eval-1', studentId: 'std-4', studentName: 'Juan Restrepo',     groupCode: '10-1', attemptNumber: 1, score: 85, status: 'graded', submittedAt: '2026-08-14T10:30:00Z' },
  { evaluationId: 'eval-1', studentId: 'std-5', studentName: 'Isabella Martínez', groupCode: '10-1', attemptNumber: 1, score: 70, status: 'graded', submittedAt: '2026-08-14T11:00:00Z' },
  { evaluationId: 'eval-1', studentId: 'std-6', studentName: 'Samuel Morales',    groupCode: '10-1', attemptNumber: 2, score: 80, status: 'graded', submittedAt: '2026-08-14T11:10:00Z' },
  { evaluationId: 'eval-1', studentId: 'std-7', studentName: 'Camila Ruiz',       groupCode: '10-1', attemptNumber: 1, score: 45, status: 'failed', submittedAt: '2026-08-14T10:50:00Z' },
  { evaluationId: 'eval-1', studentId: 'std-8', studentName: 'Andrés Castro',     groupCode: '10-1', attemptNumber: 1, score: 95, status: 'graded', submittedAt: '2026-08-14T10:05:00Z' },
  // eval-2 (presencial, 6 alumnos pendientes de calificación)
  { evaluationId: 'eval-2', studentId: 'std-1', studentName: 'Valentina Torres',  groupCode: '10-1', attemptNumber: 1, score: 0, status: 'pending', submittedAt: '' },
  { evaluationId: 'eval-2', studentId: 'std-2', studentName: 'Mateo García',      groupCode: '10-1', attemptNumber: 1, score: 0, status: 'pending', submittedAt: '' },
  { evaluationId: 'eval-2', studentId: 'std-3', studentName: 'Sofía López',       groupCode: '10-1', attemptNumber: 1, score: 0, status: 'pending', submittedAt: '' },
  { evaluationId: 'eval-2', studentId: 'std-4', studentName: 'Juan Restrepo',     groupCode: '10-1', attemptNumber: 1, score: 0, status: 'pending', submittedAt: '' },
  { evaluationId: 'eval-2', studentId: 'std-5', studentName: 'Isabella Martínez', groupCode: '10-1', attemptNumber: 1, score: 0, status: 'pending', submittedAt: '' },
  { evaluationId: 'eval-2', studentId: 'std-6', studentName: 'Samuel Morales',    groupCode: '10-1', attemptNumber: 1, score: 0, status: 'pending', submittedAt: '' },
];

// ------------------------------------------------------------
// GETTERS — Guías
// ------------------------------------------------------------

export function getAllTeacherGuides(): Guide[] {
  return GUIDES.filter((g) => g.teacherId === 'usr-1');
}

export function getGuidesByCourse(courseId: string): Guide[] {
  return GUIDES.filter((g) => g.courseId === courseId);
}

export function getGuideById(id: string): Guide | undefined {
  return GUIDES.find((g) => g.id === id);
}

// ------------------------------------------------------------
// GETTERS — Evaluaciones
// ------------------------------------------------------------

export function getEvaluationsByGuide(guideId: string): Evaluation[] {
  return EVALUATIONS.filter((e) => e.guideId === guideId);
}

export function getEvaluationById(id: string): Evaluation | undefined {
  return EVALUATIONS.find((e) => e.id === id);
}

// ------------------------------------------------------------
// GETTERS — Resultados
// ------------------------------------------------------------

export function getResultsByEvaluation(evaluationId: string): StudentResult[] {
  return STUDENT_RESULTS.filter((r) => r.evaluationId === evaluationId).map(
    ({ evaluationId: _eid, ...rest }) => rest
  );
}

// ------------------------------------------------------------
// GETTERS — Alumnos
// ------------------------------------------------------------

export interface StudentSummary {
  id: string;
  name: string;
  groupCode: string;
  courseId: string;
  courseName: string;
  averageScore: number;
  pendingCount: number;
  status: 'honor' | 'normal' | 'risk';
  avatarUrl?: string;
}

const ALL_STUDENTS: StudentSummary[] = [
  // ── crs-bio-10a (30 Estudiantes Matriculados) ──
  { id: 'std-1',  name: 'Álvarez Gómez, Sofía',        groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.8, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-1-columna-1.png' },
  { id: 'std-2',  name: 'Arango Botero, Juan Pablo',    groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.4, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-1-columna-1.png' },
  { id: 'std-3',  name: 'Barrientos López, Valentina',  groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 9.5, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-1-columna-2.png' },
  { id: 'std-4',  name: 'Bedoya Castro, Mateo',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 6.2, pendingCount: 1, status: 'risk', avatarUrl: '/avatars/men/fila-1-columna-2.png' },
  { id: 'std-5',  name: 'Cárdenas Ruiz, Andrés Felipe', groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.1, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-1-columna-3.png' },
  { id: 'std-6',  name: 'Castaño Morales, Isabella',    groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.9, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/women/fila-1-columna-3.png' },
  { id: 'std-7',  name: 'Delgado Peña, Samuel',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.5, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/men/fila-1-columna-4.png' },
  { id: 'std-8',  name: 'Echeverri Restrepo, Mariana',  groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 9.0, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-1-columna-4.png' },
  { id: 'std-9',  name: 'Franco Vargas, Lucas',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 6.8, pendingCount: 1, status: 'normal', avatarUrl: '/avatars/men/fila-2-columna-1.png' },
  { id: 'std-10', name: 'Gallego Herrera, Tomás',       groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.2, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-2-columna-2.png' },
  { id: 'std-11', name: 'Giraldo Ríos, Lucía',          groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.7, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-2-columna-1.png' },
  { id: 'std-12', name: 'Gómez Mendoza, Daniela',       groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 5.4, pendingCount: 2, status: 'risk', avatarUrl: '/avatars/women/fila-2-columna-2.png' },
  { id: 'std-13', name: 'Gutiérrez Caro, Santiago',     groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.6, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-2-columna-3.png' },
  { id: 'std-14', name: 'Hernández Ospina, Camila',     groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 5.8, pendingCount: 3, status: 'risk', avatarUrl: '/avatars/women/fila-2-columna-3.png' },
  { id: 'std-15', name: 'Jaramillo Sánchez, Nicolás',   groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.3, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-2-columna-4.png' },
  { id: 'std-16', name: 'Londoño Jiménez, Valeria',     groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 9.2, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-2-columna-4.png' },
  { id: 'std-17', name: 'Martínez Cruz, Alejandro',     groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.0, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-3-columna-1.png' },
  { id: 'std-18', name: 'Mejía Ortiz, Gabriela',        groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.9, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-3-columna-1.png' },
  { id: 'std-19', name: 'Morales Duque, Esteban',       groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.1, pendingCount: 1, status: 'normal', avatarUrl: '/avatars/men/fila-3-columna-2.png' },
  { id: 'std-20', name: 'Muñoz Salazar, Natalia',       groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.4, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/women/fila-3-columna-2.png' },
  { id: 'std-21', name: 'Osorio Parra, Sebastián',      groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 6.9, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-3-columna-3.png' },
  { id: 'std-22', name: 'Palacio Pineda, Laura',        groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.6, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-3-columna-3.png' },
  { id: 'std-23', name: 'Quintero Gil, Martín',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.8, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-3-columna-4.png' },
  { id: 'std-24', name: 'Ramírez Correa, Salomé',       groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 9.6, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-3-columna-4.png' },
  { id: 'std-25', name: 'Restrepo Vega, David',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.3, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-4-columna-1.png' },
  { id: 'std-26', name: 'Rincón Torres, Paula',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.0, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/women/fila-4-columna-1.png' },
  { id: 'std-27', name: 'Salazar Montoya, Jerónimo',    groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 6.5, pendingCount: 1, status: 'risk', avatarUrl: '/avatars/men/fila-4-columna-2.png' },
  { id: 'std-28', name: 'Tobón Flórez, Andrea',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 8.8, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-4-columna-2.png' },
  { id: 'std-29', name: 'Uribe Benítez, Simón',         groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 7.5, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-4-columna-3.png' },
  { id: 'std-30', name: 'Zapata Moreno, Manuela',       groupCode: '10-1', courseId: 'crs-bio-10a', courseName: 'Biología 10°A', averageScore: 9.1, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-4-columna-3.png' },
  // crs-bio-10b
  { id: 'std-31', name: 'Laura Peña',       groupCode: '10-2', courseId: 'crs-bio-10b', courseName: 'Biología 10°B', averageScore: 7.8, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/women/fila-1-columna-1.png' },
  { id: 'std-32', name: 'Diego Vargas',     groupCode: '10-2', courseId: 'crs-bio-10b', courseName: 'Biología 10°B', averageScore: 6.2, pendingCount: 1, status: 'risk', avatarUrl: '/avatars/men/fila-1-columna-1.png' },
  { id: 'std-33', name: 'Natalia Gómez',    groupCode: '10-2', courseId: 'crs-bio-10b', courseName: 'Biología 10°B', averageScore: 8.9, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-1-columna-2.png' },
  // crs-eco-11a
  { id: 'std-34', name: 'Felipe Sánchez',   groupCode: '11-1', courseId: 'crs-eco-11a', courseName: 'Ecología 11°A', averageScore: 8.3, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-1-columna-2.png' },
  { id: 'std-35', name: 'Mariana Herrera',  groupCode: '11-1', courseId: 'crs-eco-11a', courseName: 'Ecología 11°A', averageScore: 9.1, pendingCount: 0, status: 'honor', avatarUrl: '/avatars/women/fila-1-columna-3.png' },
  { id: 'std-36', name: 'Tomás Jiménez',    groupCode: '11-1', courseId: 'crs-eco-11a', courseName: 'Ecología 11°A', averageScore: 7.0, pendingCount: 0, status: 'normal', avatarUrl: '/avatars/men/fila-1-columna-3.png' },
];

export function getAllTeacherStudents(): StudentSummary[] {
  return ALL_STUDENTS;
}

export function getStudentsByCourse(courseId: string): StudentSummary[] {
  return ALL_STUDENTS.filter((s) => s.courseId === courseId);
}

// ------------------------------------------------------------
// GETTERS — Dashboard Stats
// ------------------------------------------------------------

export function getTeacherDashboardStats(): TeacherDashboardStats {
  return {
    activeCourses: 3,
    guidesPublished: 4,
    totalStudents: 83,
    pendingToGrade: 1,
  };
}
