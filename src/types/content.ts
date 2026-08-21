// ============================================================
// SchoolOS — Modelos de Contenido, Bloques y Evaluaciones (Fase 3)
// ============================================================

export type BlockType = 'heading' | 'paragraph' | 'image' | 'callout';

export interface GuideBlock {
  id: string;                     // ej: "blk-101"
  guideId: string;
  order: number;                  // 1, 2, 3...
  type: BlockType;
  title?: string;                 // Para headings o callouts
  content: string;                // Texto en markdown o URL de imagen
  caption?: string;               // Pie de foto opcional
}

export type GuideStatus = 'draft' | 'published' | 'archived';

export interface Guide {
  id: string;
  courseId: string;
  courseName: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  status: GuideStatus;
  estimatedMinutes: number;
  blocks: GuideBlock[];
  evaluationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export type QuestionType = 'multiple_choice' | 'true_false';

export interface Question {
  id: string;
  evaluationId: string;
  prompt: string;                 // Enunciado de la pregunta
  type: QuestionType;
  options?: string[];             // [ "Opción A", "Opción B", "Opción C", "Opción D" ]
  correctAnswerIndex: number;     // Índice de la opción correcta (o 0 para V / 1 para F)
  explanation?: string;           // Explicación pedagógica de la respuesta
  imageUrl?: string;              // Imagen o diagrama vinculado a la pregunta
  imageCaption?: string;          // Pie de foto de la imagen
  referencedBlockIds: string[];   // IDs de los bloques donde se explica el tema
}

export type EvaluationMode = 'in_person' | 'virtual';

export interface Evaluation {
  id: string;
  guideId: string;
  guideTitle: string;
  title: string;
  mode: EvaluationMode;
  passingScore: number;           // ej: 70 (sobre 100)
  timeLimitMinutes?: number;      // solo si mode === 'virtual'
  maxAttempts: number;
  questions: Question[];
  totalSubmissions: number;
  averageScore?: number;
  createdAt: string;
}

export interface StudentResult {
  studentId: string;
  studentName: string;
  groupCode: string;              // ej: '10-1'
  attemptNumber: number;
  score: number;                  // 0-100
  status: 'graded' | 'pending' | 'failed';
  submittedAt: string;
}

export interface TeacherDashboardStats {
  activeCourses: number;
  guidesPublished: number;
  totalStudents: number;
  pendingToGrade: number;         // Evaluaciones presenciales sin calificar
}
