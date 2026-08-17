// ============================================================
// SchoolOS — Mock Data Store Bilingüe (EN & ES) para Super Admin
// ============================================================
import type { Lang } from '../../i18n';
import type { School } from '../../types/school';
import type { User, JudicialAccessGrant, AuditLogEntry } from '../../types/system';

interface DashboardStats {
  activeSchools: number;
  activeSchoolsSub: string;
  totalStudents: string;
  totalStudentsSub: string;
  trialSchools: number;
  trialSchoolsSub: string;
  suspendedSchools: number;
  suspendedSchoolsSub: string;
}

const statsData: Record<Lang, DashboardStats> = {
  es: {
    activeSchools: 184,
    activeSchoolsSub: '+6 este mes',
    totalStudents: '42,318',
    totalStudentsSub: 'en todas las escuelas',
    trialSchools: 11,
    trialSchoolsSub: 'prom. 9 días restantes',
    suspendedSchools: 3,
    suspendedSchoolsSub: 'requieren atención',
  },
  en: {
    activeSchools: 184,
    activeSchoolsSub: '+6 this month',
    totalStudents: '42,318',
    totalStudentsSub: 'across all schools',
    trialSchools: 11,
    trialSchoolsSub: 'avg. 9 days remaining',
    suspendedSchools: 3,
    suspendedSchoolsSub: 'needs attention',
  },
};

const schoolsData: Record<Lang, School[]> = {
  es: [
    {
      id: 'colegio-norte',
      name: 'Colegio Norte',
      slug: 'colegio-norte',
      status: 'active',
      auditStatus: 'under_investigation',
      planName: 'Professional',
      domain: 'colegio-norte.schoolos.com',
      location: 'Bogotá, Colombia',
      country: 'Colombia',
      timezone: 'America/Bogota (UTC-5)',
      studentCount: 894,
      teacherCount: 52,
      activeClassesCount: 118,
      createdAt: '2 de julio, 2026',
      contactEmail: 'rectoria@colegionorte.edu.co',
    },
    {
      id: 'colegio-san-marcos',
      name: 'Colegio San Marcos',
      slug: 'colegio-san-marcos',
      status: 'active',
      auditStatus: 'none',
      planName: 'Professional',
      domain: 'sanmarcos.schoolos.com',
      location: 'Medellín, Colombia',
      country: 'Colombia',
      timezone: 'America/Bogota (UTC-5)',
      studentCount: 612,
      teacherCount: 38,
      activeClassesCount: 76,
      createdAt: '14 de agosto, 2026',
      contactEmail: 'admin@sanmarcos.edu.co',
    },
    {
      id: 'liceo-andino',
      name: 'Liceo Andino',
      slug: 'liceo-andino',
      status: 'trial',
      auditStatus: 'none',
      planName: 'Starter',
      domain: 'liceoandino.schoolos.com',
      location: 'Quito, Ecuador',
      country: 'Ecuador',
      timezone: 'America/Guayaquil (UTC-5)',
      studentCount: 128,
      teacherCount: 12,
      activeClassesCount: 22,
      createdAt: '11 de agosto, 2026',
      contactEmail: 'contacto@liceoandino.edu.ec',
    },
    {
      id: 'instituto-del-valle',
      name: 'Instituto del Valle',
      slug: 'instituto-del-valle',
      status: 'active',
      auditStatus: 'none',
      planName: 'Enterprise',
      domain: 'valle.schoolos.com',
      location: 'Cali, Colombia',
      country: 'Colombia',
      timezone: 'America/Bogota (UTC-5)',
      studentCount: 2140,
      teacherCount: 115,
      activeClassesCount: 240,
      createdAt: '6 de agosto, 2026',
      contactEmail: 'direccion@institutodelvalle.edu.co',
    },
    {
      id: 'academia-central',
      name: 'Academia Central',
      slug: 'academia-central',
      status: 'suspended',
      auditStatus: 'none',
      planName: 'Starter',
      domain: 'central.schoolos.com',
      location: 'Lima, Perú',
      country: 'Perú',
      timezone: 'America/Lima (UTC-5)',
      studentCount: 201,
      teacherCount: 18,
      activeClassesCount: 30,
      createdAt: '18 de mayo, 2026',
      contactEmail: 'admin@academiacentral.edu.pe',
    },
  ],
  en: [
    {
      id: 'colegio-norte',
      name: 'Colegio Norte',
      slug: 'colegio-norte',
      status: 'active',
      auditStatus: 'under_investigation',
      planName: 'Professional',
      domain: 'colegio-norte.schoolos.com',
      location: 'Bogotá, Colombia',
      country: 'Colombia',
      timezone: 'America/Bogota (UTC-5)',
      studentCount: 894,
      teacherCount: 52,
      activeClassesCount: 118,
      createdAt: 'Jul 2, 2026',
      contactEmail: 'rectoria@colegionorte.edu.co',
    },
    {
      id: 'colegio-san-marcos',
      name: 'Colegio San Marcos',
      slug: 'colegio-san-marcos',
      status: 'active',
      auditStatus: 'none',
      planName: 'Professional',
      domain: 'sanmarcos.schoolos.com',
      location: 'Medellín, Colombia',
      country: 'Colombia',
      timezone: 'America/Bogota (UTC-5)',
      studentCount: 612,
      teacherCount: 38,
      activeClassesCount: 76,
      createdAt: 'Aug 14, 2026',
      contactEmail: 'admin@sanmarcos.edu.co',
    },
    {
      id: 'liceo-andino',
      name: 'Liceo Andino',
      slug: 'liceo-andino',
      status: 'trial',
      auditStatus: 'none',
      planName: 'Starter',
      domain: 'liceoandino.schoolos.com',
      location: 'Quito, Ecuador',
      country: 'Ecuador',
      timezone: 'America/Guayaquil (UTC-5)',
      studentCount: 128,
      teacherCount: 12,
      activeClassesCount: 22,
      createdAt: 'Aug 11, 2026',
      contactEmail: 'contacto@liceoandino.edu.ec',
    },
    {
      id: 'instituto-del-valle',
      name: 'Instituto del Valle',
      slug: 'instituto-del-valle',
      status: 'active',
      auditStatus: 'none',
      planName: 'Enterprise',
      domain: 'valle.schoolos.com',
      location: 'Cali, Colombia',
      country: 'Colombia',
      timezone: 'America/Bogota (UTC-5)',
      studentCount: 2140,
      teacherCount: 115,
      activeClassesCount: 240,
      createdAt: 'Aug 6, 2026',
      contactEmail: 'direccion@institutodelvalle.edu.co',
    },
    {
      id: 'academia-central',
      name: 'Academia Central',
      slug: 'academia-central',
      status: 'suspended',
      auditStatus: 'none',
      planName: 'Starter',
      domain: 'central.schoolos.com',
      location: 'Lima, Peru',
      country: 'Peru',
      timezone: 'America/Lima (UTC-5)',
      studentCount: 201,
      teacherCount: 18,
      activeClassesCount: 30,
      createdAt: 'May 18, 2026',
      contactEmail: 'admin@academiacentral.edu.pe',
    },
  ],
};

const schoolAdminsData: Record<Lang, Record<string, User[]>> = {
  es: {
    'colegio-norte': [
      {
        id: 'usr-1',
        name: 'Diana Restrepo',
        email: 'diana.restrepo@colegionorte.edu.co',
        role: 'school_admin',
        schoolId: 'colegio-norte',
        status: 'active',
        createdAt: '2 de julio, 2026',
        lastLoginAt: 'Hoy, 8:12 AM',
      },
      {
        id: 'usr-2',
        name: 'Jorge Salas',
        email: 'jorge.salas@colegionorte.edu.co',
        role: 'school_admin',
        schoolId: 'colegio-norte',
        status: 'active',
        createdAt: '5 de julio, 2026',
        lastLoginAt: '15 de agosto, 2026',
      },
    ],
    'colegio-san-marcos': [
      {
        id: 'usr-3',
        name: 'Elena Morales',
        email: 'elena.morales@sanmarcos.edu.co',
        role: 'school_admin',
        schoolId: 'colegio-san-marcos',
        status: 'active',
        createdAt: '14 de agosto, 2026',
        lastLoginAt: 'Ayer, 4:30 PM',
      },
    ],
  },
  en: {
    'colegio-norte': [
      {
        id: 'usr-1',
        name: 'Diana Restrepo',
        email: 'diana.restrepo@colegionorte.edu.co',
        role: 'school_admin',
        schoolId: 'colegio-norte',
        status: 'active',
        createdAt: 'Jul 2, 2026',
        lastLoginAt: 'Today, 8:12 AM',
      },
      {
        id: 'usr-2',
        name: 'Jorge Salas',
        email: 'jorge.salas@colegionorte.edu.co',
        role: 'school_admin',
        schoolId: 'colegio-norte',
        status: 'active',
        createdAt: 'Jul 5, 2026',
        lastLoginAt: 'Aug 15, 2026',
      },
    ],
    'colegio-san-marcos': [
      {
        id: 'usr-3',
        name: 'Elena Morales',
        email: 'elena.morales@sanmarcos.edu.co',
        role: 'school_admin',
        schoolId: 'colegio-san-marcos',
        status: 'active',
        createdAt: 'Aug 14, 2026',
        lastLoginAt: 'Yesterday, 4:30 PM',
      },
    ],
  },
};

const judicialGrantsData: Record<Lang, JudicialAccessGrant[]> = {
  es: [
    {
      id: 'grant-1',
      schoolId: 'colegio-norte',
      schoolName: 'Colegio Norte',
      caseReference: 'EXP-2026-0417',
      issuingAuthority: 'Fiscalía 14 Seccional Bogotá',
      orderDocumentRef: 'doc_sec_8849201.pdf',
      scope: 'Registros de estudiantes, Comunicaciones',
      requestedBy: 'maria.p@schoolos.com',
      verifiedBy: 'carlos.r@schoolos.com',
      status: 'active',
      grantedAt: '15 de julio, 2026',
      expiresAt: '14 de sept, 2026',
    },
    {
      id: 'grant-2',
      schoolId: 'colegio-norte',
      schoolName: 'Colegio Norte',
      caseReference: 'EXP-2026-0298',
      issuingAuthority: 'Juzgado 3° de Familia',
      orderDocumentRef: 'doc_sec_7721092.pdf',
      scope: 'Actividad académica y calificaciones',
      requestedBy: 'carlos.r@schoolos.com',
      verifiedBy: 'maria.p@schoolos.com',
      status: 'expired',
      grantedAt: '1 de abril, 2026',
      expiresAt: '30 de junio, 2026',
    },
    {
      id: 'grant-3',
      schoolId: 'academia-central',
      schoolName: 'Academia Central',
      caseReference: 'EXP-2026-0112',
      issuingAuthority: 'Juzgado 5° Penal Lima',
      orderDocumentRef: 'doc_sec_3349122.pdf',
      scope: 'Metadatos de cuentas de usuario',
      requestedBy: 'maria.p@schoolos.com',
      verifiedBy: null,
      status: 'pending_verification',
      grantedAt: null,
      expiresAt: '30 de oct, 2026',
    },
  ],
  en: [
    {
      id: 'grant-1',
      schoolId: 'colegio-norte',
      schoolName: 'Colegio Norte',
      caseReference: 'EXP-2026-0417',
      issuingAuthority: 'Fiscalía 14 Seccional Bogotá',
      orderDocumentRef: 'doc_sec_8849201.pdf',
      scope: 'student_records, communications',
      requestedBy: 'maria.p@schoolos.com',
      verifiedBy: 'carlos.r@schoolos.com',
      status: 'active',
      grantedAt: 'Jul 15, 2026',
      expiresAt: 'Sep 14, 2026',
    },
    {
      id: 'grant-2',
      schoolId: 'colegio-norte',
      schoolName: 'Colegio Norte',
      caseReference: 'EXP-2026-0298',
      issuingAuthority: 'Juzgado 3° de Familia',
      orderDocumentRef: 'doc_sec_7721092.pdf',
      scope: 'academic_activity',
      requestedBy: 'carlos.r@schoolos.com',
      verifiedBy: 'maria.p@schoolos.com',
      status: 'expired',
      grantedAt: 'Apr 1, 2026',
      expiresAt: 'Jun 30, 2026',
    },
    {
      id: 'grant-3',
      schoolId: 'academia-central',
      schoolName: 'Academia Central',
      caseReference: 'EXP-2026-0112',
      issuingAuthority: 'Juzgado 5° Penal Lima',
      orderDocumentRef: 'doc_sec_3349122.pdf',
      scope: 'user_accounts',
      requestedBy: 'maria.p@schoolos.com',
      verifiedBy: null,
      status: 'pending_verification',
      grantedAt: null,
      expiresAt: 'Oct 30, 2026',
    },
  ],
};

const auditLogsData: Record<Lang, AuditLogEntry[]> = {
  es: [
    {
      id: 'log-1',
      action: 'escuela.plan_modificado',
      targetName: 'Instituto del Valle',
      targetType: 'school',
      actorEmail: 'maria.p@schoolos.com',
      timestamp: 'Hace 2 horas',
    },
    {
      id: 'log-2',
      action: 'acceso_judicial.verificado',
      targetName: 'Colegio Norte',
      targetType: 'judicial_access_grant',
      actorEmail: 'carlos.r@schoolos.com',
      timestamp: 'Ayer',
    },
    {
      id: 'log-3',
      action: 'escuela.suspendida',
      targetName: 'Academia Central',
      targetType: 'school',
      actorEmail: 'maria.p@schoolos.com',
      timestamp: 'Hace 2 días',
    },
    {
      id: 'log-4',
      action: 'usuario.invitado',
      targetName: 'Elena Morales (Colegio San Marcos)',
      targetType: 'user',
      actorEmail: 'maria.p@schoolos.com',
      timestamp: 'Hace 3 días',
    },
  ],
  en: [
    {
      id: 'log-1',
      action: 'school.plan_changed',
      targetName: 'Instituto del Valle',
      targetType: 'school',
      actorEmail: 'maria.p@schoolos.com',
      timestamp: '2 hours ago',
    },
    {
      id: 'log-2',
      action: 'judicial_access.verified',
      targetName: 'Colegio Norte',
      targetType: 'judicial_access_grant',
      actorEmail: 'carlos.r@schoolos.com',
      timestamp: 'Yesterday',
    },
    {
      id: 'log-3',
      action: 'school.suspended',
      targetName: 'Academia Central',
      targetType: 'school',
      actorEmail: 'maria.p@schoolos.com',
      timestamp: '2 days ago',
    },
    {
      id: 'log-4',
      action: 'user.invited',
      targetName: 'Elena Morales (Colegio San Marcos)',
      targetType: 'user',
      actorEmail: 'maria.p@schoolos.com',
      timestamp: '3 days ago',
    },
  ],
};

const usersData: Record<Lang, Array<{ name: string; email: string; school: string; role: string; status: string; lastLogin: string }>> = {
  es: [
    { name: 'Diana Restrepo', email: 'diana.restrepo@colegionorte.edu.co', school: 'Colegio Norte', role: 'Administrador Escolar', status: 'Activo', lastLogin: 'Hoy, 8:12 AM' },
    { name: 'Jorge Salas', email: 'jorge.salas@colegionorte.edu.co', school: 'Colegio Norte', role: 'Administrador Escolar', status: 'Activo', lastLogin: '15 de agosto, 2026' },
    { name: 'Elena Morales', email: 'elena.morales@sanmarcos.edu.co', school: 'Colegio San Marcos', role: 'Administrador Escolar', status: 'Activo', lastLogin: 'Ayer' },
    { name: 'Carlos Rodríguez', email: 'carlos.r@schoolos.com', school: 'Sistema Global', role: 'Super Admin', status: 'Activo', lastLogin: 'Hace 10 min' },
    { name: 'Maria P.', email: 'maria.p@schoolos.com', school: 'Sistema Global', role: 'Super Admin', status: 'Activo', lastLogin: 'Ahora mismo' },
  ],
  en: [
    { name: 'Diana Restrepo', email: 'diana.restrepo@colegionorte.edu.co', school: 'Colegio Norte', role: 'School Admin', status: 'Active', lastLogin: 'Today, 8:12 AM' },
    { name: 'Jorge Salas', email: 'jorge.salas@colegionorte.edu.co', school: 'Colegio Norte', role: 'School Admin', status: 'Active', lastLogin: 'Aug 15, 2026' },
    { name: 'Elena Morales', email: 'elena.morales@sanmarcos.edu.co', school: 'Colegio San Marcos', role: 'School Admin', status: 'Active', lastLogin: 'Yesterday' },
    { name: 'Carlos Rodríguez', email: 'carlos.r@schoolos.com', school: 'System Global', role: 'Super Admin', status: 'Active', lastLogin: '10 min ago' },
    { name: 'Maria P.', email: 'maria.p@schoolos.com', school: 'System Global', role: 'Super Admin', status: 'Active', lastLogin: 'Just now' },
  ],
};

const plansData: Record<Lang, Array<{ name: string; limit: string; price: string; schoolsCount: number; status: string }>> = {
  es: [
    { name: 'Starter', limit: 'Hasta 200 estudiantes', price: '$199 USD / mes', schoolsCount: 42, status: 'Activo' },
    { name: 'Professional', limit: 'Hasta 1,500 estudiantes', price: '$499 USD / mes', schoolsCount: 118, status: 'Activo' },
    { name: 'Enterprise', limit: 'Estudiantes ilimitados', price: 'Cotización a Medida', schoolsCount: 24, status: 'Activo' },
  ],
  en: [
    { name: 'Starter', limit: 'Up to 200 students', price: '$199 / mo', schoolsCount: 42, status: 'Active' },
    { name: 'Professional', limit: 'Up to 1,500 students', price: '$499 / mo', schoolsCount: 118, status: 'Active' },
    { name: 'Enterprise', limit: 'Unlimited', price: 'Custom Quote', schoolsCount: 24, status: 'Active' },
  ],
};

// Data retrieval helper functions
export function getMockDashboardStats(lang: Lang = 'es'): DashboardStats {
  return statsData[lang] || statsData.es;
}

export function getMockSchools(lang: Lang = 'es'): School[] {
  return schoolsData[lang] || schoolsData.es;
}

export function getMockSchool(id: string, lang: Lang = 'es'): School | undefined {
  return (schoolsData[lang] || schoolsData.es).find((s) => s.id === id);
}

export function getMockSchoolAdmins(schoolId: string, lang: Lang = 'es'): User[] {
  return (schoolAdminsData[lang] || schoolAdminsData.es)[schoolId] || [];
}

export function getMockJudicialGrants(lang: Lang = 'es'): JudicialAccessGrant[] {
  return judicialGrantsData[lang] || judicialGrantsData.es;
}

export function getMockAuditLogs(lang: Lang = 'es'): AuditLogEntry[] {
  return auditLogsData[lang] || auditLogsData.es;
}

export function getMockUsers(lang: Lang = 'es') {
  return usersData[lang] || usersData.es;
}

export function getMockPlans(lang: Lang = 'es') {
  return plansData[lang] || plansData.es;
}

// Backward-compat exports
export const mockDashboardStats = statsData.es;
export const mockSchools = schoolsData.es;
export const mockSchoolAdmins = schoolAdminsData.es;
export const mockJudicialGrants = judicialGrantsData.es;
export const mockAuditLogs = auditLogsData.es;
