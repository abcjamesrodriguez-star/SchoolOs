import { supabase } from '../lib/supabase';
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
    schoolId: row.school_id,
    schoolName: row.school?.name || undefined,
    status: row.status,
    avatarUrl: row.avatar_url || undefined,
    phone: row.phone || undefined,
    documentType: row.document_type || undefined,
    documentId: row.document_id || undefined,
    jobTitle: row.job_title || undefined,
    specialty: row.specialty || undefined,
    appointmentDate: row.appointment_date || undefined,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

function mapSchool(row: any): School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    auditStatus: row.audit_status,
    planName: row.plan_name,
    domain: row.domain,
    location: row.location || '',
    country: row.country || 'Colombia',
    timezone: row.timezone || 'America/Bogota (UTC-5)',
    studentCount: row.student_count || 0,
    teacherCount: row.teacher_count || 0,
    activeClassesCount: row.active_classes_count || 0,
    contactEmail: row.contact_email,
    logoUrl: row.logo_url || undefined,
    bannerUrl: row.banner_url || undefined,
    slogan: row.slogan || undefined,
    address: row.address || undefined,
    phone: row.phone || undefined,
    brandColor: row.brand_color || '#12110E',
    rectorName: row.rector_name || undefined,
    rectorEmail: row.rector_email || undefined,
    createdAt: row.created_at,
  };
}

async function getCurrentAuthUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id || null;
}

export const schoolAdminTenantService = {
  initials,

  async getTenantContext(): Promise<TenantContext | null> {
    const authUserId = await getCurrentAuthUserId();
    let cachedUser: any = null;

    try {
      cachedUser = JSON.parse(localStorage.getItem('schoolos-user') || 'null');
    } catch (_) {}

    const userId = authUserId || cachedUser?.id;
    if (!userId) return null;

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('*, school:schools(*)')
      .eq('id', userId)
      .maybeSingle();

    if (userError || !userRow || userRow.role !== 'school_admin' || !userRow.school_id || !userRow.school) {
      return null;
    }

    const user = mapUser(userRow);
    const school = mapSchool(userRow.school);

    try {
      localStorage.setItem('schoolos-user', JSON.stringify({
        ...cachedUser,
        ...user,
        schoolName: school.name,
        schoolStatus: school.status,
      }));
    } catch (_) {}

    return { user, school };
  },

  async getTenantUsers(role?: 'teacher' | 'student' | 'school_admin'): Promise<UserWithSchool[]> {
    const context = await this.getTenantContext();
    if (!context) return [];

    let query = supabase
      .from('users')
      .select('*, school:schools(id,name)')
      .eq('school_id', context.school.id)
      .order('name', { ascending: true });

    if (role) {
      query = query.eq('role', role);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapUser);
  },

  async getTenantStats(): Promise<TenantStats | null> {
    const context = await this.getTenantContext();
    if (!context) return null;

    const [{ count: students }, { count: teachers }, coursesResult] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', context.school.id)
        .eq('role', 'student'),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', context.school.id)
        .eq('role', 'teacher'),
      supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', context.school.id)
        .eq('status', 'active'),
    ]);

    const totalStudents = students || context.school.studentCount || 0;
    const maxStudentsPlan = context.school.planName === 'Starter' ? 200 : context.school.planName === 'Enterprise' ? 5000 : 1500;

    return {
      totalStudents,
      totalTeachers: teachers || context.school.teacherCount || 0,
      activeCourses: coursesResult.error ? context.school.activeClassesCount || 0 : coursesResult.count || 0,
      maxStudentsPlan,
      planUsagePercent: maxStudentsPlan ? Math.round((totalStudents / maxStudentsPlan) * 100) : 0,
    };
  },

  async getTenantCourses(): Promise<TenantCourseSummary[]> {
    const context = await this.getTenantContext();
    if (!context) return [];

    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        code,
        name,
        grade_level,
        group_letter,
        academic_term,
        weekly_hours,
        max_capacity,
        status,
        department:subject_departments(name),
        course_teachers(
          teacher:users(name)
        ),
        course_students(id)
      `)
      .eq('school_id', context.school.id)
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.warn('Cursos no disponibles todavía:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      gradeLevel: row.grade_level,
      groupLetter: row.group_letter,
      academicTerm: row.academic_term,
      weeklyHours: row.weekly_hours || 0,
      maxCapacity: row.max_capacity || 0,
      status: row.status,
      departmentName: row.department?.name || null,
      studentCount: row.course_students?.length || 0,
      teacherNames: (row.course_teachers || []).map((item: any) => item.teacher?.name).filter(Boolean),
    }));
  },
};
