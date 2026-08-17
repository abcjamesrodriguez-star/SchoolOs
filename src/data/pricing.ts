import type { Lang } from '../i18n';

export interface PricingPlan {
  name: string;
  note: string;
  featured: boolean;
  items: string[];
  cta: { label: string; href: string; variant: 'primary' | 'secondary' };
}

const pricingData: Record<Lang, PricingPlan[]> = {
  en: [
    {
      name: 'Starter',
      note: 'For small schools.',
      featured: false,
      items: ['Up to 200 students', 'Classes & guides', 'Basic evaluations', 'Email support'],
      cta: { label: 'Request a Demo →', href: '#', variant: 'secondary' },
    },
    {
      name: 'Professional',
      note: 'For growing institutions.',
      featured: true,
      items: ['Up to 1,500 students', 'Virtual + presential classes', 'Full evaluation suite', 'Academic reports', 'Priority support'],
      cta: { label: 'Request a Demo →', href: '#', variant: 'primary' },
    },
    {
      name: 'Enterprise',
      note: 'For large educational organizations.',
      featured: false,
      items: ['Unlimited students', 'Multi-campus management', 'Custom integrations', 'Dedicated support'],
      cta: { label: 'Contact Us →', href: '#', variant: 'secondary' },
    },
  ],
  es: [
    {
      name: 'Inicial',
      note: 'Para escuelas pequeñas.',
      featured: false,
      items: ['Hasta 200 estudiantes', 'Clases y guías', 'Evaluaciones básicas', 'Soporte por correo'],
      cta: { label: 'Solicitar Demo →', href: '#', variant: 'secondary' },
    },
    {
      name: 'Profesional',
      note: 'Para instituciones en crecimiento.',
      featured: true,
      items: ['Hasta 1,500 estudiantes', 'Clases virtuales + presenciales', 'Suite completa de evaluaciones', 'Reportes académicos', 'Soporte prioritario'],
      cta: { label: 'Solicitar Demo →', href: '#', variant: 'primary' },
    },
    {
      name: 'Empresarial',
      note: 'Para grandes organizaciones educativas.',
      featured: false,
      items: ['Estudiantes ilimitados', 'Gestión multi-campus', 'Integraciones personalizadas', 'Soporte dedicado'],
      cta: { label: 'Contáctanos →', href: '#', variant: 'secondary' },
    },
  ],
};

export function getPricingPlans(lang: Lang): PricingPlan[] {
  return pricingData[lang];
}

// Backward-compat
export const pricingPlans = pricingData.en;
