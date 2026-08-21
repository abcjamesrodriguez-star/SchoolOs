import { createAdminSupabase } from '../lib/supabase-admin';
import { supabase as browserSupabase } from '../lib/supabase';
import type { School, SchoolStatus, AuditStatus } from '../types/school';

function getSupabaseClient() {
  // Si estamos en el navegador (window definido), usamos el cliente de sesión del navegador
  if (typeof window !== 'undefined') {
    return browserSupabase;
  }
  // Si estamos en el servidor, usamos el cliente administrativo
  try {
    return createAdminSupabase();
  } catch (_) {
    return browserSupabase;
  }
}

// Tipo de fila cruda como viene de la base de datos PostgreSQL
export interface SchoolRow {
  id: string;
  name: string;
  slug: string;
  status: SchoolStatus;
  audit_status: AuditStatus;
  plan_name: 'Starter' | 'Professional' | 'Enterprise';
  domain: string;
  location: string | null;
  country: string | null;
  timezone: string | null;
  student_count: number;
  teacher_count: number;
  active_classes_count: number;
  contact_email: string;
  logo_url?: string | null;
  banner_url?: string | null;
  slogan?: string | null;
  address?: string | null;
  phone?: string | null;
  brand_color?: string | null;
  rector_name?: string | null;
  rector_email?: string | null;
  created_at: string;
}

// Mapper: transforma la fila de base de datos al tipo limpio de TypeScript del frontend
function mapRowToSchool(row: SchoolRow): School {
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

export const schoolService = {
  /**
   * Sube un archivo de logo a Supabase Storage en el bucket 'school-assets'
   */
  async uploadSchoolLogo(file: File, schoolSlug: string): Promise<string> {
    const supabase = getSupabaseClient();
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `logos/${schoolSlug}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('school-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Error subiendo a Storage, usando DataURL de respaldo:', uploadError);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data } = supabase.storage
      .from('school-assets')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Obtiene todos los colegios registrados
   */
  async getSchools(): Promise<School[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener colegios:', error);
      throw error;
    }

    return (data as SchoolRow[]).map(mapRowToSchool);
  },

  /**
   * Obtiene un colegio por su slug (ej: 'cafelitos')
   */
  async getSchoolBySlug(slug: string): Promise<School | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      console.error(`Error al buscar colegio con slug ${slug}:`, error);
      throw error;
    }

    return data ? mapRowToSchool(data as SchoolRow) : null;
  },

  /**
   * Obtiene un colegio por su ID UUID
   */
  async getSchoolById(id: string): Promise<School | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error al buscar colegio con ID ${id}:`, error);
      throw error;
    }

    return data ? mapRowToSchool(data as SchoolRow) : null;
  },

  /**
   * Registra un nuevo colegio
   */
  async createSchool(school: {
    name: string;
    slug: string;
    domain: string;
    location: string;
    country: string;
    timezone: string;
    planName: 'Starter' | 'Professional' | 'Enterprise';
    contactEmail: string;
    status?: SchoolStatus;
    logoUrl?: string;
    slogan?: string;
    address?: string;
    phone?: string;
    brandColor?: string;
    rectorName?: string;
    rectorEmail?: string;
    studentCount?: number;
    teacherCount?: number;
  }): Promise<School> {
    const supabase = getSupabaseClient();

    const payload: any = {
      name: school.name,
      slug: school.slug,
      domain: school.domain,
      location: school.location,
      country: school.country,
      timezone: school.timezone,
      plan_name: school.planName,
      contact_email: school.contactEmail,
      status: school.status || 'active',
      audit_status: 'none',
      student_count: school.studentCount || 0,
      teacher_count: school.teacherCount || 0,
      active_classes_count: 0,
    };

    if (school.logoUrl) payload.logo_url = school.logoUrl;
    if (school.slogan) payload.slogan = school.slogan;
    if (school.address) payload.address = school.address;
    if (school.phone) payload.phone = school.phone;
    if (school.brandColor) payload.brand_color = school.brandColor;
    if (school.rectorName) payload.rector_name = school.rectorName;
    if (school.rectorEmail) payload.rector_email = school.rectorEmail;

    const { data, error } = await supabase
      .from('schools')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error al insertar colegio en Supabase:', error);
      throw error;
    }

    return mapRowToSchool(data as SchoolRow);
  },

  /**
   * Actualiza los datos de un colegio existente por su ID
   */
  async updateSchool(id: string, updates: {
    name?: string;
    slug?: string;
    domain?: string;
    location?: string;
    country?: string;
    timezone?: string;
    planName?: 'Starter' | 'Professional' | 'Enterprise';
    contactEmail?: string;
    status?: SchoolStatus;
    logoUrl?: string;
    slogan?: string;
    address?: string;
    phone?: string;
    brandColor?: string;
    rectorName?: string;
    rectorEmail?: string;
  }): Promise<School> {
    const supabase = getSupabaseClient();

    const payload: any = {};
    if (updates.name !== undefined)         payload.name          = updates.name;
    if (updates.slug !== undefined)         payload.slug          = updates.slug;
    if (updates.domain !== undefined)       payload.domain        = updates.domain;
    if (updates.location !== undefined)     payload.location      = updates.location;
    if (updates.country !== undefined)      payload.country       = updates.country;
    if (updates.timezone !== undefined)     payload.timezone      = updates.timezone;
    if (updates.planName !== undefined)     payload.plan_name     = updates.planName;
    if (updates.contactEmail !== undefined) payload.contact_email = updates.contactEmail;
    if (updates.status !== undefined)       payload.status        = updates.status;
    if (updates.logoUrl !== undefined)      payload.logo_url      = updates.logoUrl;
    if (updates.slogan !== undefined)       payload.slogan        = updates.slogan;
    if (updates.address !== undefined)      payload.address       = updates.address;
    if (updates.phone !== undefined)        payload.phone         = updates.phone;
    if (updates.brandColor !== undefined)   payload.brand_color   = updates.brandColor;
    if (updates.rectorName !== undefined)   payload.rector_name   = updates.rectorName;
    if (updates.rectorEmail !== undefined)  payload.rector_email  = updates.rectorEmail;

    const { data, error } = await supabase
      .from('schools')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar colegio en Supabase:', error);
      throw error;
    }

    return mapRowToSchool(data as SchoolRow);
  },
};
