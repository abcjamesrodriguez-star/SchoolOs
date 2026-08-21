import { supabase } from '../lib/supabase';
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

    // Obtener el perfil institucional completo de public.users
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Error al cargar el perfil institucional del usuario.');
    }

    const mappedUser: User = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as Role,
      schoolId: profile.school_id,
      status: profile.status,
      avatarUrl: profile.avatar_url || undefined,
      createdAt: profile.created_at,
      lastLoginAt: profile.last_login_at || undefined,
    };

    // Guardar en caché local con timestamp
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
        data: mappedUser,
        updatedAt: profile.updated_at || profile.created_at,
        cachedAt: Date.now(),
      }));
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
    } catch (_) {}
    await supabase.auth.signOut();
  },

  /**
   * Obtiene el usuario autenticado actual con verificación ligera de timestamp
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return null;
    }

    // Verificar si tenemos caché local válida
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.data?.id === session.user.id) {
          // Micro-consulta ligera: verificar solo updated_at
          const { data: check } = await supabase
            .from('users')
            .select('updated_at')
            .eq('id', session.user.id)
            .single();

          if (check && check.updated_at === parsed.updatedAt) {
            // El perfil no ha cambiado, devolvemos la caché instantánea (0 ms)
            return parsed.data;
          }
        }
      }
    } catch (_) {}

    // Si no hay caché o cambió el timestamp, descargamos el perfil completo
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    const freshUser: User = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as Role,
      schoolId: profile.school_id,
      status: profile.status,
      avatarUrl: profile.avatar_url || undefined,
      createdAt: profile.created_at,
      lastLoginAt: profile.last_login_at || undefined,
    };

    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
        data: freshUser,
        updatedAt: profile.updated_at || profile.created_at,
        cachedAt: Date.now(),
      }));
    } catch (_) {}

    return freshUser;
  },
};
