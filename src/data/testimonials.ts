import type { Lang } from '../i18n';

export interface Testimonial {
  quote: string;
  role: string;
}

const testimonialsData: Record<Lang, Testimonial[]> = {
  en: [
    {
      quote: 'We finally have one place where our academic activity can be managed.',
      role: 'School Administrator',
    },
    {
      quote: 'My students are more engaged now that everything is in one platform — classes, assignments, evaluations.',
      role: 'Teacher',
    },
    {
      quote: "I always know what is due and when. I don't miss anything anymore.",
      role: 'Student',
    },
  ],
  es: [
    {
      quote: 'Por fin tenemos un lugar donde podemos gestionar toda nuestra actividad académica.',
      role: 'Administrador Escolar',
    },
    {
      quote: 'Mis estudiantes están más comprometidos ahora que todo está en una plataforma — clases, tareas, evaluaciones.',
      role: 'Docente',
    },
    {
      quote: 'Siempre sé qué tengo pendiente y cuándo es. Ya no se me escapa nada.',
      role: 'Estudiante',
    },
  ],
};

export function getTestimonials(lang: Lang): Testimonial[] {
  return testimonialsData[lang];
}

// Backward-compat
export const testimonials = testimonialsData.en;
