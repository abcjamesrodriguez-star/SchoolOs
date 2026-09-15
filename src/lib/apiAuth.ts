import type { APIRoute } from 'astro';
import { createAdminSupabase } from './supabase-admin';
import type { Role } from '../types/system';

export interface AuthContextUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  schoolId: string | null;
  school_id: string | null;
  status: 'active' | 'invited' | 'suspended';
}

export type RequireAuthResult =
  | { ok: true; user: AuthContextUser; token: string; admin: ReturnType<typeof createAdminSupabase> }
  | { ok: false; response: Response };

/**
 * Extrae el token JWT desde el header Authorization (Bearer) o cookies.
 */
function extractToken(request: Request): string | null {
  // 1. Header Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 2. Cookie header: sb-access-token, sb:token, o similar
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:sb-access-token|sb:token|supabase-auth-token)=([^;]+)/);
    if (match && match[1]) {
      try {
        const decoded = decodeURIComponent(match[1]);
        if (decoded.startsWith('[')) {
          const parsed = JSON.parse(decoded);
          if (parsed[0]) return parsed[0];
        }
        return decoded;
      } catch (_) {
        return match[1];
      }
    }
  }

  // 3. Query string token (fallback para descargas directas de archivos / export CSV / PDF)
  try {
    const url = new URL(request.url);
    const queryToken = url.searchParams.get('token') || url.searchParams.get('auth_token');
    if (queryToken) return queryToken.trim();
  } catch (_) {}

  return null;
}

/**
 * Middleware/Helper de verificación de identidad y roles en endpoints de backend.
 *
 * @param request El objeto Request de Astro APIRoute
 * @param allowedRoles Lista de roles autorizados (ej: ['super_admin'], ['school_admin', 'super_admin'])
 * @param targetSchoolId (Opcional) Si se pasa, valida que el school_admin pertenezca a esa escuela específica
 */
export async function requireAuth(
  request: Request,
  allowedRoles?: Role[],
  targetSchoolId?: string | null
): Promise<RequireAuthResult> {
  const token = extractToken(request);

  if (!token) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          ok: false,
          error: 'No autenticado. Se requiere header Authorization: Bearer <token> o sesión activa.',
          code: 'UNAUTHORIZED',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }

  try {
    const admin = createAdminSupabase();

    // 1. Validar firma y vigencia del JWT con Supabase Auth
    const { data: authData, error: authError } = await admin.auth.getUser(token);

    if (authError || !authData?.user) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({
            ok: false,
            error: 'Token de sesión inválido o expirado. Por favor inicia sesión nuevamente.',
            code: 'INVALID_TOKEN',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      };
    }

    const authUser = authData.user;

    // 2. Obtener el perfil real y rol desde la base de datos (public.users)
    const { data: profile, error: profileError } = await admin
      .from('users')
      .select('id, email, name, role, school_id, status')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({
            ok: false,
            error: 'Perfil institucional de usuario no encontrado en la base de datos.',
            code: 'USER_PROFILE_NOT_FOUND',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      };
    }

    // 3. Verificar estado de cuenta
    if (profile.status === 'suspended') {
      return {
        ok: false,
        response: new Response(
          JSON.stringify({
            ok: false,
            error: 'Tu cuenta institucional se encuentra actualmente suspendida. Contacta a soporte.',
            code: 'ACCOUNT_SUSPENDED',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        ),
      };
    }

    const user: AuthContextUser = {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role as Role,
      schoolId: profile.school_id,
      school_id: profile.school_id,
      status: profile.status,
    };

    // 4. Validar rol si se especificaron roles permitidos
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        return {
          ok: false,
          response: new Response(
            JSON.stringify({
              ok: false,
              error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}. Tu rol actual es: ${user.role}.`,
              code: 'FORBIDDEN_ROLE',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ),
        };
      }
    }

    // 5. Validar aislamiento de inquilino (Multi-tenant)
    // Si no es super_admin, no puede operar sobre otra escuela
    if (targetSchoolId && user.role !== 'super_admin') {
      if (user.schoolId !== targetSchoolId) {
        return {
          ok: false,
          response: new Response(
            JSON.stringify({
              ok: false,
              error: 'Acceso denegado. No tienes permisos para gestionar los datos de otra institución.',
              code: 'TENANT_MISMATCH',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          ),
        };
      }
    }

    return {
      ok: true,
      user,
      token,
      admin,
    };
  } catch (err: any) {
    console.error('[API_AUTH_ERROR]:', err);
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          ok: false,
          error: 'Error interno verificando la autenticación del servidor.',
          details: err?.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      ),
    };
  }
}

/**
 * Resuelve la URL pública canónica de la plataforma.
 * Prioriza la variable de producción SITE_URL o VERCEL_URL, evitando redirigir a localhost en correos.
 */
export function getPublicSiteUrl(request?: Request): string {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.SITE_URL)
    ? (import.meta.env.SITE_URL as string)
    : (typeof process !== 'undefined' ? process.env.SITE_URL : undefined);

  if (envUrl && envUrl.startsWith('http') && !envUrl.includes('localhost')) {
    return envUrl.replace(/\/$/, '');
  }

  if (typeof process !== 'undefined' && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }

  if (request) {
    const fHost = request.headers.get('x-forwarded-host');
    const fProto = request.headers.get('x-forwarded-proto') || 'https';
    if (fHost && !fHost.includes('localhost')) {
      return `${fProto}://${fHost}`.replace(/\/$/, '');
    }
    try {
      const origin = new URL(request.url).origin;
      if (!origin.includes('localhost')) {
        return origin.replace(/\/$/, '');
      }
    } catch (_) {}
  }

  if (envUrl && envUrl.startsWith('http')) {
    return envUrl.replace(/\/$/, '');
  }

  return 'https://school-os-pi-jet.vercel.app';
}

