// ============================================================
// SchoolOS — Modelos de Escuela y Planes
// ============================================================

export type SchoolStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type AuditStatus = 'none' | 'flagged' | 'under_investigation';

export interface Plan {
  id: string;
  name: 'Starter' | 'Professional' | 'Enterprise';
  studentLimit: number | null;
  features: string[];
}

export interface School {
  id: string;
  name: string;
  slug: string;
  status: SchoolStatus;
  auditStatus: AuditStatus;
  planName: 'Starter' | 'Professional' | 'Enterprise';
  domain: string;
  location: string;
  country: string;
  timezone: string;
  studentCount: number;
  teacherCount: number;
  activeClassesCount: number;
  createdAt: string;
  contactEmail: string;
}
