import { createAdminSupabase } from '../lib/supabase-admin';
import { supabase as browserSupabase } from '../lib/supabase';
import type { User, Role, UserStatus } from '../types/system';

function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    return browserSupabase;
  }
  try {
    return createAdminSupabase();
  } catch (_) {
    return browserSupabase;
  }
}

export interface UserWithSchool extends User {
  schoolName?: string;
  phone?: string;
  documentType?: string;
  documentId?: string;
  jobTitle?: string;
  specialty?: string;
  appointmentDate?: string;
}

export const userService = {
  /**
   * Obtiene todos los usuarios con su escuela asociada y campos extendidos
   */
  async getUsers(): Promise<UserWithSchool[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        school_id,
        status,
        avatar_url,
        phone,
        document_type,
        document_id,
        job_title,
        specialty,
        appointment_date,
        created_at,
        last_login_at,
        school:schools(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role as Role,
      schoolId: row.school_id,
      schoolName: row.school?.name || (row.role === 'super_admin' ? 'Sistema Global (Root)' : 'Sin Asignar'),
      status: row.status as UserStatus,
      avatarUrl: row.avatar_url,
      phone: row.phone || undefined,
      documentType: row.document_type || 'CC',
      documentId: row.document_id || undefined,
      jobTitle: row.job_title || (row.role === 'school_admin' ? 'Rector General' : undefined),
      specialty: row.specialty || undefined,
      appointmentDate: row.appointment_date || undefined,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
    }));
  },

  /**
   * Obtiene el rector asignado a una escuela específica
   */
  async getRectorBySchoolId(schoolId: string): Promise<UserWithSchool | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        school_id,
        status,
        avatar_url,
        phone,
        document_type,
        document_id,
        job_title,
        specialty,
        appointment_date,
        created_at,
        last_login_at,
        school:schools(id, name)
      `)
      .eq('school_id', schoolId)
      .eq('role', 'school_admin')
      .maybeSingle();

    if (error) {
      console.error(`Error al buscar rector de la escuela ${schoolId}:`, error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role as Role,
      schoolId: data.school_id,
      schoolName: (data.school as any)?.name || 'Colegio',
      status: data.status as UserStatus,
      avatarUrl: data.avatar_url,
      phone: data.phone || undefined,
      documentType: data.document_type || 'CC',
      documentId: data.document_id || undefined,
      jobTitle: data.job_title || 'Rector General',
      specialty: data.specialty || undefined,
      appointmentDate: data.appointment_date || undefined,
      createdAt: data.created_at,
      lastLoginAt: data.last_login_at,
    };
  },
};
