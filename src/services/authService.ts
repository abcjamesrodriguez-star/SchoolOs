import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/apiClient';
import type { User, Role } from '../types/system';

export interface AuthSession {
  user: User;
  token: string;
}

// Clave para caché local de perfil
const PROFILE_CACHE_KEY = 'schoolos_profile_cache';

export const authService = {
  /**
   * Inicia sesión con correo y contraseña en Supabase Auth
   */
  async signIn(email: string, password: string): Promise<User> {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error('No se pudo obtener la información del usuario.');
    }

    // Obtener el perfil institucional y colegio vía REST (/api/auth/me)
    const meRes = await apiClient.get<any>('/api/auth/me');
    if (!meRes.ok || !meRes.profile) {
      throw new Error(meRes.error || 'Error al cargar el perfil institucional del usuario.');
    }

    const profile = meRes.profile;
    const mappedUser: User = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as Role,
      schoolId: profile.schoolId || profile.school_id,
      status: profile.status,
      avatarUrl: profile.avatarUrl || profile.avatar_url || undefined,
      createdAt: profile.createdAt || profile.created_at,
      lastLoginAt: profile.lastLoginAt || profile.last_login_at || undefined,
      passwordResetRequired: profile.passwordResetRequired || false,
    };

    if (meRes.school) {
      (mappedUser as any).school = meRes.school;
      (mappedUser as any).schoolName = meRes.school.name;
      (mappedUser as any).schoolSlug = meRes.school.slug;
      (mappedUser as any).schoolStatus = meRes.school.status;
    }

    // Guardar en caché local con timestamp
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
        data: mappedUser,
        school: meRes.school || null,
        updatedAt: profile.updatedAt || profile.updated_at || profile.createdAt,
        cachedAt: Date.now(),
      }));
      localStorage.setItem('schoolos-user', JSON.stringify(mappedUser));
      localStorage.setItem('schoolos-auth', 'true');
    } catch (_) {}

    return mappedUser;
  },

  /**
   * Cierra la sesión activa
   */
  async signOut(): Promise<void> {
    try {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      localStorage.removeItem('schoolos-auth');
      localStorage.removeItem('schoolos-user');
      localStorage.removeItem('schoolos_tenant_id');
      localStorage.removeItem('schoolos_tenant_slug');
    } catch (_) {}
    await supabase.auth.signOut();
  },

  /**
   * Obtiene el usuario autenticado actual consumiendo el backend REST
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return null;
    }

    // Obtener perfil institucional vía REST (/api/auth/me)
    try {
      const meRes = await apiClient.get<any>('/api/auth/me');
      if (!meRes.ok || !meRes.profile) {
        // Fallback a caché local si hay desconexión momentánea
        try {
          const cached = localStorage.getItem(PROFILE_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.data?.id === session.user.id) {
              return parsed.data;
            }
          }
        } catch (_) {}
        return null;
      }

      const profile = meRes.profile;
      const freshUser: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role as Role,
        schoolId: profile.schoolId || profile.school_id,
        status: profile.status,
        avatarUrl: profile.avatarUrl || profile.avatar_url || undefined,
        createdAt: profile.createdAt || profile.created_at,
        lastLoginAt: profile.lastLoginAt || profile.last_login_at || undefined,
        passwordResetRequired: profile.passwordResetRequired || false,
      };

      if (meRes.school) {
        (freshUser as any).school = meRes.school;
        (freshUser as any).schoolName = meRes.school.name;
        (freshUser as any).schoolSlug = meRes.school.slug;
        (freshUser as any).schoolStatus = meRes.school.status;
      }

      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
          data: freshUser,
          school: meRes.school || null,
          updatedAt: profile.updatedAt || profile.updated_at || profile.createdAt,
          cachedAt: Date.now(),
        }));
        localStorage.setItem('schoolos-user', JSON.stringify(freshUser));
        localStorage.setItem('schoolos-auth', 'true');
      } catch (_) {}

      return freshUser;
    } catch (err) {
      console.warn('Error al obtener usuario actual vía REST:', err);
      return null;
    }
  },
};
