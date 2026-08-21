// ============================================================
// SchoolOS — Mock Data: Panel del Estudiante (Fase 4)
// Sesión activa: Mateo Gómez | studentId: 'std-mateo' | 10° Grado A
// ============================================================

import type {
  StudentProfile,
  StudentCourse,
  GuideProgress,
  PendingEvaluation,
  EvaluationAttempt,
  SubjectGrade,
  SchoolNews,
} from '../../types/student';
import type { Evaluation } from '../../types/content';
import { getGuideById, getEvaluationById } from './mock-content';

// ------------------------------------------------------------
// PERFIL DEL ESTUDIANTE
// ------------------------------------------------------------

export function getStudentProfile(): StudentProfile {
  return {
    id: 'std-mateo',
    name: 'Mateo Gómez',
    email: 'mateo.gomez@colegio-norte.edu.co',
    grade: '10° Grado A',
    groupCode: '10-1',
    schoolId: 'sch-1',
    schoolName: 'Colegio Norte',
    avatarUrl: '/avatars/men/fila-1-columna-2.png',
    generalAverage: 8.8,
    averageLabel: 'Excelente',
  };
}

// ------------------------------------------------------------
// CURSOS MATRICULADOS
// ------------------------------------------------------------

const STUDENT_COURSES: StudentCourse[] = [
  {
    courseId: 'crs-bio-10a',
    courseName: 'Biología Celular y Genética 10°A',
    teacherName: 'Diana Restrepo',
    teacherAvatarUrl: '/avatars/women/fila-1-columna-1.png',
    subject: 'Biología',
    schedule: 'Lun/Mié 08:30–10:00 · Lab. Ciencias 1',
    guidesTotal: 3,
    guidesRead: 2,
    currentAverage: 8.8,
    status: 'active',
  },
  {
    courseId: 'crs-mat-10a',
    courseName: 'Matemáticas Avanzadas 10°A',
    teacherName: 'Carlos Mendoza',
    teacherAvatarUrl: '/avatars/men/fila-1-columna-3.png',
    subject: 'Matemáticas',
    schedule: 'Mar/Jue 07:00–08:30 · Salón 103',
    guidesTotal: 4,
    guidesRead: 4,
    currentAverage: 9.2,
    status: 'active',
  },
  {
    courseId: 'crs-lit-10a',
    courseName: 'Literatura y Lengua Castellana 10°A',
    teacherName: 'Rosa Bermúdez',
    teacherAvatarUrl: '/avatars/women/fila-2-columna-1.png',
    subject: 'Literatura',
    schedule: 'Lun/Vie 10:30–12:00 · Salón 201',
    guidesTotal: 3,
    guidesRead: 2,
    currentAverage: 8.4,
    status: 'active',
  },
  {
    courseId: 'crs-fis-10a',
    courseName: 'Física e Introducción a la Mecánica 10°A',
    teacherName: 'Andrés Patiño',
    teacherAvatarUrl: '/avatars/men/fila-2-columna-2.png',
    subject: 'Física',
    schedule: 'Mar/Jue 10:30–12:00 · Lab. Física',
    guidesTotal: 2,
    guidesRead: 1,
    currentAverage: 8.5,
    status: 'active',
  },
];

export function getStudentCourses(): StudentCourse[] {
  return STUDENT_COURSES;
}

export function getStudentCourseById(courseId: string): StudentCourse | undefined {
  return STUDENT_COURSES.find((c) => c.courseId === courseId);
}

// ------------------------------------------------------------
// PROGRESO DE GUÍAS
// ------------------------------------------------------------

const GUIDE_PROGRESS: GuideProgress[] = [
  {
    guideId: 'gd-1',
    guideTitle: 'Estructura y Función de la Célula Eucariota',
    courseId: 'crs-bio-10a',
    courseName: 'Biología 10°A',
    status: 'read',
    readAt: '2026-08-12T11:30:00Z',
  },
  {
    guideId: 'gd-2',
    guideTitle: 'Genética Mendeliana y Cuadros de Punnett',
    courseId: 'crs-bio-10a',
    courseName: 'Biología 10°A',
    status: 'unread',
  },
];

export function getStudentGuideProgress(): GuideProgress[] {
  return GUIDE_PROGRESS;
}

export function getGuideProgressById(guideId: string): GuideProgress | undefined {
  return GUIDE_PROGRESS.find((g) => g.guideId === guideId);
}

// ------------------------------------------------------------
// EVALUACIONES PENDIENTES
// ------------------------------------------------------------

const PENDING_EVALUATIONS: PendingEvaluation[] = [
  {
    evaluationId: 'eval-1',
    evaluationTitle: 'Cuestionario de Comprensión: Biología Celular',
    guideId: 'gd-1',
    courseId: 'crs-bio-10a',
    courseName: 'Biología 10°A',
    timeLimitMinutes: 45,
    dueLabel: 'Vence este viernes',
    attemptsUsed: 0,
    maxAttempts: 2,
  },
];

export function getPendingEvaluations(): PendingEvaluation[] {
  return PENDING_EVALUATIONS;
}

// ------------------------------------------------------------
// HISTORIAL DE INTENTOS
// ------------------------------------------------------------

const EVALUATION_HISTORY: EvaluationAttempt[] = [
  {
    id: 'att-hist-1',
    evaluationId: 'eval-mat-q1',
    evaluationTitle: 'Quiz: Ecuaciones Cuadráticas',
    studentId: 'std-mateo',
    studentName: 'Mateo Gómez',
    courseId: 'crs-mat-10a',
    courseName: 'Matemáticas 10°A',
    attemptNumber: 1,
    status: 'graded',
    score: 92,
    maxScore: 100,
    passed: true,
    timeSpentMinutes: 28,
    answers: [],
    submittedAt: '2026-08-10T09:45:00Z',
  },
  {
    id: 'att-hist-2',
    evaluationId: 'eval-lit-q1',
    evaluationTitle: 'Quiz: El Romanticismo Latinoamericano',
    studentId: 'std-mateo',
    studentName: 'Mateo Gómez',
    courseId: 'crs-lit-10a',
    courseName: 'Literatura 10°A',
    attemptNumber: 1,
    status: 'graded',
    score: 84,
    maxScore: 100,
    passed: true,
    timeSpentMinutes: 35,
    answers: [],
    submittedAt: '2026-08-08T14:20:00Z',
  },
];

export function getEvaluationHistory(): EvaluationAttempt[] {
  return EVALUATION_HISTORY;
}

// ------------------------------------------------------------
// BOLETÍN DE NOTAS
// ------------------------------------------------------------

const SUBJECT_GRADES: SubjectGrade[] = [
  {
    courseId: 'crs-bio-10a',
    courseName: 'Biología Celular y Genética',
    teacherName: 'Diana Restrepo',
    period: 'Periodo 1 · 2026',
    currentAverage: 8.8,
    evaluationsCompleted: 1,
    evaluationsTotal: 3,
    status: 'passing',
  },
  {
    courseId: 'crs-mat-10a',
    courseName: 'Matemáticas Avanzadas',
    teacherName: 'Carlos Mendoza',
    period: 'Periodo 1 · 2026',
    currentAverage: 9.2,
    evaluationsCompleted: 2,
    evaluationsTotal: 3,
    status: 'passing',
  },
  {
    courseId: 'crs-lit-10a',
    courseName: 'Literatura y Lengua Castellana',
    teacherName: 'Rosa Bermúdez',
    period: 'Periodo 1 · 2026',
    currentAverage: 8.4,
    evaluationsCompleted: 1,
    evaluationsTotal: 2,
    status: 'passing',
  },
  {
    courseId: 'crs-fis-10a',
    courseName: 'Física e Introducción a la Mecánica',
    teacherName: 'Andrés Patiño',
    period: 'Periodo 1 · 2026',
    currentAverage: 8.5,
    evaluationsCompleted: 1,
    evaluationsTotal: 2,
    status: 'passing',
  },
];

export function getStudentGrades(): SubjectGrade[] {
  return SUBJECT_GRADES;
}

export function getStudentGeneralAverage(): number {
  const grades = getStudentGrades();
  return parseFloat(
    (grades.reduce((acc, g) => acc + g.currentAverage, 0) / grades.length).toFixed(1)
  );
}

// ------------------------------------------------------------
// NOTICIAS DEL COLEGIO
// ------------------------------------------------------------

const SCHOOL_NEWS: SchoolNews[] = [
  {
    id: 'news-1',
    title: 'Jornada Pedagógica — Viernes 22 de Agosto',
    body: 'El próximo viernes 22 de agosto no habrá clases para estudiantes. Los docentes participarán en la jornada de formación pedagógica institucional. Se retoman clases el lunes 25 de agosto con normalidad.',
    category: 'academic',
    publishedAt: '2026-08-18T08:00:00Z',
    authorName: 'Rectoría · Colegio Norte',
  },
  {
    id: 'news-2',
    title: 'Cierre de Calificaciones — Periodo 1',
    body: 'Recordamos a toda la comunidad estudiantil que el cierre oficial de calificaciones del Periodo 1 será el viernes 5 de septiembre. Asegúrense de entregar todas las actividades pendientes antes de esta fecha.',
    category: 'academic',
    publishedAt: '2026-08-17T10:30:00Z',
    authorName: 'Coordinación Académica',
  },
  {
    id: 'news-3',
    title: 'Torneo Intercolegiado de Voleibol 2026',
    body: 'El equipo de voleibol del Colegio Norte participará en el Torneo Intercolegiado Regional los días 28 y 29 de agosto. ¡Apoyemos a nuestros compañeros! Inscripciones para porristas y animadores abiertas hasta el miércoles.',
    category: 'sports',
    publishedAt: '2026-08-16T14:00:00Z',
    authorName: 'Departamento de Deportes',
  },
  {
    id: 'news-4',
    title: 'Activación del Portal de Notas para Padres de Familia',
    body: 'A partir de esta semana, los padres y acudientes pueden consultar las calificaciones en tiempo real a través del portal oficial en familia.colegio-norte.edu.co. Para activar su acceso, contacten a la secretaría con su documento de identidad.',
    category: 'admin',
    publishedAt: '2026-08-15T09:00:00Z',
    authorName: 'Secretaría Académica',
  },
];

export function getSchoolNews(): SchoolNews[] {
  return SCHOOL_NEWS;
}

// ------------------------------------------------------------
// EVALUACIÓN ACTIVA (para la sesión de toma de examen)
// Reutiliza eval-1 de mock-content — la evaluación de Biología Celular
// ------------------------------------------------------------

export function getActiveEvaluationForStudent(evaluationId: string): Evaluation | undefined {
  return getEvaluationById(evaluationId);
}

export function getGuideForStudent(guideId: string) {
  return getGuideById(guideId);
}

// ------------------------------------------------------------
// HORARIO DE HOY (Sincronizado con la jornada del colegio)
// Martes 18 de Agosto, 2026 · 10° Grado A
// ------------------------------------------------------------

export interface StudentScheduleBlock {
  time: string;
  courseName: string;
  room: string;
  teacherName: string;
  teacherAvatarUrl: string;
  status: 'done' | 'active' | 'break' | 'upcoming';
  statusLabel: string;
  guideId?: string;
  guideTitle?: string;
}

const TODAY_SCHEDULE: StudentScheduleBlock[] = [
  {
    time: '07:00 – 08:30',
    courseName: 'Matemáticas Avanzadas',
    room: 'Salón 103',
    teacherName: 'Prof. Carlos Mendoza',
    teacherAvatarUrl: '/avatars/men/fila-1-columna-3.png',
    status: 'done',
    statusLabel: 'Concluida ✓',
  },
  {
    time: '08:30 – 10:00',
    courseName: 'Biología Celular y Genética',
    room: 'Lab. Ciencias 1',
    teacherName: 'Prof. Diana Restrepo',
    teacherAvatarUrl: '/avatars/women/fila-1-columna-1.png',
    status: 'active',
    statusLabel: 'EN VIVO AHORA 🔥',
    guideId: 'gd-1',
    guideTitle: 'Estructura y Función de la Célula Eucariota',
  },
  {
    time: '10:00 – 10:30',
    courseName: 'Receso Escolar',
    room: 'Patio Central & Cafetería',
    teacherName: 'Convivencia',
    teacherAvatarUrl: '/avatars/men/fila-2-columna-3.png',
    status: 'break',
    statusLabel: 'Descanso 🥪',
  },
  {
    time: '10:30 – 12:00',
    courseName: 'Literatura y Lengua Castellana',
    room: 'Salón 201',
    teacherName: 'Prof. Rosa Bermúdez',
    teacherAvatarUrl: '/avatars/women/fila-2-columna-1.png',
    status: 'upcoming',
    statusLabel: 'Siguiente clase',
  },
  {
    time: '12:00 – 13:30',
    courseName: 'Física Mecánica',
    room: 'Lab. Física',
    teacherName: 'Prof. Andrés Patiño',
    teacherAvatarUrl: '/avatars/men/fila-2-columna-2.png',
    status: 'upcoming',
    statusLabel: 'Última del día',
  },
];

export function getTodayStudentSchedule(): StudentScheduleBlock[] {
  return TODAY_SCHEDULE;
}

// ------------------------------------------------------------
// MENSAJES Y BITÁCORA DEL PROFESOR (Avisos del Aula)
// ------------------------------------------------------------

export interface TeacherClassroomNote {
  id: string;
  teacherName: string;
  teacherAvatarUrl: string;
  courseName: string;
  postedAgo: string;
  message: string;
  badgeLabel: string;
  actionText?: string;
  actionHref?: string;
}

const TEACHER_NOTES: TeacherClassroomNote[] = [
  {
    id: 'note-1',
    teacherName: 'Prof. Diana Restrepo',
    teacherAvatarUrl: '/avatars/women/fila-1-columna-1.png',
    courseName: 'Biología Celular (10°A)',
    postedAgo: 'Hoy · 08:25 AM',
    badgeLabel: 'CLASE DE HOY',
    message: 'Hola chicos. Hoy en el laboratorio estamos viendo el Bloque § 4 (Membrana Nuclear) y § 5 (Mitocondrias). Recuerden que el quiz virtual sobre Célula Eucariota vence este viernes a las 11:59 PM. ¡Revisen las preguntas de práctica!',
    actionText: '📖 Abrir Guía en Bloque § 4',
    actionHref: '/es/app/student/guides/gd-1#blk-4',
  },
  {
    id: 'note-2',
    teacherName: 'Prof. Carlos Mendoza',
    teacherAvatarUrl: '/avatars/men/fila-1-columna-3.png',
    courseName: 'Matemáticas (10°A)',
    postedAgo: 'Ayer · 04:15 PM',
    badgeLabel: 'CALIFICACIONES',
    message: 'Ya publiqué las notas del Quiz de Ecuaciones Cuadráticas en sus boletines. En general tuvieron excelente desempeño. Mateo, obtuviste 9.2/10. ¡Gran trabajo!',
    actionText: '🏆 Ver Nota en Boletín (9.2)',
    actionHref: '/es/app/student/grades',
  },
];

export function getTeacherClassroomNotes(): TeacherClassroomNote[] {
  return TEACHER_NOTES;
}

// ------------------------------------------------------------
// ESTADO DE ESTUDIO ACTIVO (Continuar donde quedaste)
// ------------------------------------------------------------

export interface ActiveStudyProgress {
  guideId: string;
  guideTitle: string;
  courseName: string;
  teacherName: string;
  currentSectionTitle: string;
  currentBlockId: string;
  totalBlocks: number;
  completedBlocks: number;
  progressPercent: number;
  estimatedMinutesLeft: number;
}

export function getActiveStudyProgress(): ActiveStudyProgress {
  return {
    guideId: 'gd-1',
    guideTitle: 'Estructura y Función de la Célula Eucariota',
    courseName: 'Biología Celular',
    teacherName: 'Prof. Diana Restrepo',
    currentSectionTitle: '§ 4. Membrana Nuclear y Envoltura Celular',
    currentBlockId: 'blk-4',
    totalBlocks: 5,
    completedBlocks: 3,
    progressPercent: 60,
    estimatedMinutesLeft: 10,
  };
}

