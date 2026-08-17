import type { Lang } from '../i18n';

export interface Audience {
  tag: string;
  headline: string;
  tagline: string;
  bullets: string[];
  exploreLabel: string;
  exploreHref: string;
}

const audiencesData: Record<Lang, Audience[]> = {
  en: [
    {
      tag: 'Students',
      headline: 'Learn. Participate. Progress.',
      tagline: 'Classes, guides and evaluations in one place.',
      bullets: [
        'Access live and recorded classes',
        'Complete guides and learning activities',
        'Submit and track assignments',
        'Take evaluations and see results',
        'Follow your academic progress',
      ],
      exploreLabel: 'Explore the platform →',
      exploreHref: '/en/platform',
    },
    {
      tag: 'Teachers',
      headline: 'Teach. Manage. Understand.',
      tagline: "Build activities and track every student's progress.",
      bullets: [
        'Run live and recorded classes',
        'Create guides and learning content',
        'Design and assign evaluations',
        'Grade and give feedback efficiently',
        'Monitor individual student progress',
      ],
      exploreLabel: 'Explore the platform →',
      exploreHref: '/en/platform',
    },
    {
      tag: 'Schools',
      headline: 'Organize. Connect. Manage.',
      tagline: 'Run the whole academic operation from one system.',
      bullets: [
        'Manage all classes and teachers',
        'Oversee student enrollment and groups',
        'Track academic performance school-wide',
        'Coordinate communication across the school',
        'Configure the platform for your institution',
      ],
      exploreLabel: 'Explore the platform →',
      exploreHref: '/en/platform',
    },
  ],
  es: [
    {
      tag: 'Estudiantes',
      headline: 'Aprende. Participa. Progresa.',
      tagline: 'Clases, guías y evaluaciones en un solo lugar.',
      bullets: [
        'Accede a clases en vivo y grabadas',
        'Completa guías y actividades de aprendizaje',
        'Entrega y da seguimiento a tus tareas',
        'Realiza evaluaciones y consulta resultados',
        'Sigue tu progreso académico',
      ],
      exploreLabel: 'Explorar la plataforma →',
      exploreHref: '/es/platform',
    },
    {
      tag: 'Docentes',
      headline: 'Enseña. Gestiona. Comprende.',
      tagline: 'Crea actividades y da seguimiento al progreso de cada estudiante.',
      bullets: [
        'Imparte clases en vivo y grabadas',
        'Crea guías y contenido de aprendizaje',
        'Diseña y asigna evaluaciones',
        'Califica y da retroalimentación con eficiencia',
        'Monitorea el progreso individual de cada estudiante',
      ],
      exploreLabel: 'Explorar la plataforma →',
      exploreHref: '/es/platform',
    },
    {
      tag: 'Escuelas',
      headline: 'Organiza. Conecta. Gestiona.',
      tagline: 'Administra toda la operación académica desde un solo sistema.',
      bullets: [
        'Gestiona todas las clases y docentes',
        'Supervisa la inscripción y los grupos de estudiantes',
        'Monitorea el rendimiento académico de toda la escuela',
        'Coordina la comunicación en toda la institución',
        'Configura la plataforma según tu institución',
      ],
      exploreLabel: 'Explorar la plataforma →',
      exploreHref: '/es/platform',
    },
  ],
};

export function getAudiences(lang: Lang): Audience[] {
  return audiencesData[lang];
}

// Keep backward-compat export for any file that may import it directly
export const audiences = audiencesData.en;
