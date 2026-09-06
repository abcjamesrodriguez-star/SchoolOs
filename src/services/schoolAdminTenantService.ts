import { apiClient } from '../lib/apiClient';
import type { School } from '../types/school';
import type { UserWithSchool } from './userService';

export interface TenantContext {
  user: UserWithSchool;
  school: School;
}

export interface TenantStats {
  totalStudents: number;
  totalTeachers: number;
  activeCourses: number;
  maxStudentsPlan: number;
  planUsagePercent: number;
}

export interface TenantCourseSummary {
  id: string;
  code: string;
  name: string;
  gradeLevel: string;
  groupLetter: string;
  academicTerm: string;
  weeklyHours: number;
  maxCapacity: number;
  status: string;
  departmentName: string | null;
  studentCount: number;
  teacherNames: string[];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function mapUser(row: any): UserWithSchool {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    schoolId: row.school_id || row.schoolId,
    schoolName: row.school?.name || row.schoolName || undefined,
    status: row.status,
    avatarUrl: row.avatar_url || row.avatarUrl || undefined,
    phone: row.phone || undefined,
    documentType: row.document_type || row.documentType || undefined,
    documentId: row.document_id || row.documentId || undefined,
    jobTitle: row.job_title || row.jobTitle || undefined,
    specialty: row.specialty || undefined,
    appointmentDate: row.appointment_date || row.appointmentDate || undefined,
    createdAt: row.created_at || row.createdAt,
    lastLoginAt: row.last_login_at || row.lastLoginAt,
  };
}

function mapSchool(row: any): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    auditStatus: row.audit_status || row.auditStatus,
    planName: row.plan_name || row.planName,
    domain: row.domain,
    location: row.location || '',
    country: row.country || 'Colombia',
    timezone: row.timezone || 'America/Bogota (UTC-5)',
    studentCount: row.student_count || row.studentCount || 0,
    teacherCount: row.teacher_count || row.teacherCount || 0,
    activeClassesCount: row.active_classes_count || row.activeClassesCount || 0,
    contactEmail: row.contact_email || row.contactEmail,
    logoUrl: row.logo_url || row.logoUrl || undefined,
    bannerUrl: row.banner_url || row.bannerUrl || undefined,
    slogan: row.slogan || undefined,
    address: row.address || undefined,
    phone: row.phone || undefined,
    brandColor: row.brand_color || row.brandColor || '#12110E',
    rectorName: row.rector_name || row.rectorName || undefined,
    rectorEmail: row.rector_email || row.rectorEmail || undefined,
    createdAt: row.created_at || row.createdAt,
  };
}

export const schoolAdminTenantService = {
  initials,

  async getTenantContext(): Promise<TenantContext | null> {
    try {
      const res = await apiClient.get<any>('/api/auth/me');
      if (!res.ok || !res.profile || !res.school) {
        return null;
      }

      const user = mapUser(res.profile);
      const school = mapSchool(res.school);

      try {
        localStorage.setItem('schoolos-user', JSON.stringify({
          ...user,
          schoolId: school.id,
          schoolSlug: school.slug,
          schoolName: school.name,
          schoolStatus: school.status,
        }));
        localStorage.setItem('schoolos_tenant_id', school.id);
        localStorage.setItem('schoolos_tenant_slug', school.slug);

        if (typeof window !== 'undefined') {
          const app = ((window as any).SchoolOSApp = (window as any).SchoolOSApp || {});
          app.currentSchoolId = school.id;
          app.currentSchoolSlug = school.slug;
          (window as any)._currentTenantSchoolId = school.id;
        }
      } catch (_) {}

      return { user, school };
    } catch (err) {
      console.warn('Error al obtener contexto de tenant:', err);
      return null;
    }
  },

  async getTenantUsers(role?: 'teacher' | 'student' | 'school_admin'): Promise<UserWithSchool[]> {
    const context = await this.getTenantContext();
    if (!context) return [];

    try {
      if (role === 'teacher') {
        const res = await apiClient.get<any>(`/api/school-admin/teachers?schoolId=${encodeURIComponent(context.school.id)}`);
        return (res.teachers || []).map(mapUser);
      }
      if (role === 'student') {
        const res = await apiClient.get<any>(`/api/school-admin/students?schoolId=${encodeURIComponent(context.school.id)}`);
        return (res.data || res.students || []).map(mapUser);
      }

      // Si no se especifica rol, cargamos ambos
      const [teachersRes, studentsRes] = await Promise.all([
        apiClient.get<any>(`/api/school-admin/teachers?schoolId=${encodeURIComponent(context.school.id)}`),
        apiClient.get<any>(`/api/school-admin/students?schoolId=${encodeURIComponent(context.school.id)}`),
      ]);

      const teachers = (teachersRes.teachers || []).map(mapUser);
      const students = (studentsRes.data || studentsRes.students || []).map(mapUser);
      return [...teachers, ...students];
    } catch (err) {
      console.error('Error al obtener usuarios del tenant vía REST:', err);
      return [];
    }
  },

  async getTenantStats(): Promise<TenantStats | null> {
    try {
      const res = await apiClient.get<any>('/api/school-admin/stats');
      if (!res.ok || !res.stats) return null;
      return res.stats;
    } catch (err) {
      console.warn('Error al obtener estadísticas del tenant vía REST:', err);
      return null;
    }
  },

  async getTenantCourses(): Promise<TenantCourseSummary[]> {
    const context = await this.getTenantContext();
    if (!context) return [];

    try {
      const res = await apiClient.get<any>(`/api/school-admin/subjects?schoolId=${encodeURIComponent(context.school.id)}`);
      if (!res.ok || !res.courses) return [];

      return (res.courses || []).map((row: any) => ({
        id: row.id,
        code: row.code,
        name: row.name,
        gradeLevel: row.grade_level || row.gradeLevel,
        weeklyHours: row.hours_per_week || row.weeklyHours || 0,
        status: row.status,
        color: row.color,
        teacherId: row.teacher_id || row.teacherId,
      }));
    } catch (err) {
      console.warn('Error al obtener materias del tenant vía REST:', err);
      return [];
    }
  },
};

