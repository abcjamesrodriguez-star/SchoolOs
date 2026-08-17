import type { Lang } from '../i18n';

export interface Feature {
  title: string;
  copy: string;
  card: { label: string; lines: string[] };
}

const featuresData: Record<Lang, Feature[]> = {
  en: [
    {
      title: 'Virtual Classes',
      copy: 'Connect teachers and students whether they are in the classroom or learning remotely.',
      card: { label: 'Live Class', lines: ['Biology — 24 students', 'Screen share active', 'Attendance recorded'] },
    },
    {
      title: 'Guides & Assignments',
      copy: 'Create, distribute and complete learning activities in one place.',
      card: { label: 'Guide: Cell Biology', lines: ['8 of 12 exercises done', 'Due Friday, 11:59 PM', 'Auto-saved 2 min ago'] },
    },
    {
      title: 'Evaluations',
      copy: 'Build assessments, collect responses and review results.',
      card: { label: 'Evaluation: Midterm', lines: ['24 submissions received', 'Average score 84%', 'Auto-graded: multiple choice'] },
    },
    {
      title: 'Grades & Progress',
      copy: 'Give students and teachers a clear view of academic progress.',
      card: { label: 'Progress Report', lines: ['Overall average: 8.6 / 10', 'Attendance: 96%', 'Trend: improving'] },
    },
    {
      title: 'Communication',
      copy: 'Keep students, teachers and schools connected.',
      card: { label: 'Announcements', lines: ['Field trip — permission needed', 'Parent-teacher meetings open', 'New guide published'] },
    },
    {
      title: 'School Management',
      copy: 'Organize classes, groups, subjects and users from one system.',
      card: { label: 'Admin Panel', lines: ['1,204 students enrolled', '68 teachers active', '12 subjects configured'] },
    },
  ],
  es: [
    {
      title: 'Clases Virtuales',
      copy: 'Conecta a docentes y estudiantes ya sea que estén en el aula o aprendiendo a distancia.',
      card: { label: 'Clase en Vivo', lines: ['Biología — 24 estudiantes', 'Pantalla compartida activa', 'Asistencia registrada'] },
    },
    {
      title: 'Guías y Tareas',
      copy: 'Crea, distribuye y completa actividades de aprendizaje en un solo lugar.',
      card: { label: 'Guía: Biología Celular', lines: ['8 de 12 ejercicios completados', 'Entrega: viernes, 11:59 PM', 'Guardado automático hace 2 min'] },
    },
    {
      title: 'Evaluaciones',
      copy: 'Diseña evaluaciones, recolecta respuestas y revisa resultados.',
      card: { label: 'Evaluación: Parcial', lines: ['24 respuestas recibidas', 'Promedio: 84%', 'Calificación automática: opción múltiple'] },
    },
    {
      title: 'Calificaciones y Progreso',
      copy: 'Da a estudiantes y docentes una visión clara del progreso académico.',
      card: { label: 'Reporte de Progreso', lines: ['Promedio general: 8.6 / 10', 'Asistencia: 96%', 'Tendencia: mejorando'] },
    },
    {
      title: 'Comunicación',
      copy: 'Mantén a estudiantes, docentes y escuelas conectados.',
      card: { label: 'Anuncios', lines: ['Excursión — autorización requerida', 'Reuniones padre-maestro abiertas', 'Nueva guía publicada'] },
    },
    {
      title: 'Gestión Escolar',
      copy: 'Organiza clases, grupos, materias y usuarios desde un solo sistema.',
      card: { label: 'Panel Administrativo', lines: ['1,204 estudiantes inscritos', '68 docentes activos', '12 materias configuradas'] },
    },
  ],
};

export function getFeatures(lang: Lang): Feature[] {
  return featuresData[lang];
}

// Backward-compat
export const features = featuresData.en;
