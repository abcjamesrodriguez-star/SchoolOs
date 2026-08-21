// ============================================================
// SchoolOS — Modelos de Estudiante, Intentos y Calificaciones (Fase 4)
// ============================================================

export type AttemptStatus = 'in_progress' | 'submitted' | 'graded';

export type GuideReadStatus = 'unread' | 'in_progress' | 'read';

// ── Respuesta individual del estudiante a una pregunta ──
export interface StudentAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  referencedBlockIds: string[]; // Para mostrar el botón de repaso
}

// ── Intento completo de una evaluación ──
export interface EvaluationAttempt {
  id: string;
  evaluationId: string;
  evaluationTitle: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  attemptNumber: number;
  status: AttemptStatus;
  score: number;        // 0–100
  maxScore: number;     // 100
  passed: boolean;
  timeSpentMinutes: number;
  answers: StudentAnswer[];
  submittedAt: string;
}

// ── Progreso de lectura de una guía ──
export interface GuideProgress {
  guideId: string;
  guideTitle: string;
  courseId: string;
  courseName: string;
  status: GuideReadStatus;
  readAt?: string;
}

// ── Nota por materia para el boletín ──
export interface SubjectGrade {
  courseId: string;
  courseName: string;
  teacherName: string;
  period: string;
  currentAverage: number;     // 0–10
  evaluationsCompleted: number;
  evaluationsTotal: number;
  status: 'passing' | 'warning' | 'failing';
}

// ── Evaluación pendiente (para el dashboard del alumno) ──
export interface PendingEvaluation {
  evaluationId: string;
  evaluationTitle: string;
  guideId: string;
  courseId: string;
  courseName: string;
  timeLimitMinutes: number;
  dueLabel: string;           // ej: "Vence este viernes"
  attemptsUsed: number;
  maxAttempts: number;
}

// ── Noticia / comunicado del colegio ──
export interface SchoolNews {
  id: string;
  title: string;
  body: string;
  category: 'academic' | 'events' | 'admin' | 'sports';
  publishedAt: string;
  authorName: string;
}

// ── Perfil del estudiante (sesión activa) ──
export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  grade: string;        // ej: '10° Grado A'
  groupCode: string;    // ej: '10-1'
  schoolId: string;
  schoolName: string;
  avatarUrl?: string;
  generalAverage: number;
  averageLabel: string; // ej: 'Excelente'
}

// ── Curso matriculado del estudiante ──
export interface StudentCourse {
  courseId: string;
  courseName: string;
  teacherName: string;
  teacherAvatarUrl?: string;
  subject: string;
  schedule: string;
  guidesTotal: number;
  guidesRead: number;
  currentAverage: number;
  status: 'active' | 'completed';
}
