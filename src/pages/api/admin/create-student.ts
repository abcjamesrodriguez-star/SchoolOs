export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

/**
 * POST /api/admin/create-student
 * Crea un estudiante en Supabase Auth + public.users.
 * Requiere rol school_admin o super_admin.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // ✅ Verificar sesión y rol antes de cualquier operación
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin; // client con service_role — seguro en servidor

    const body = await request.json();
    const { email, password, name, school_id, document_id, role, specialty, job_title, avatar_url } = body;

    if (!email || !password || !school_id) {
      return new Response(JSON.stringify({ error: 'Datos incompletos para crear el estudiante' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // school_admin solo puede crear estudiantes en su propia escuela
    if (auth.user.role === 'school_admin' && auth.user.schoolId !== school_id) {
      return new Response(JSON.stringify({ error: 'No puedes crear estudiantes en otra institución.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Crear usuario en Auth de Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role: role || 'student',
        school_id,
      },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = authData.user.id;

    // 2. Crear registro en public.users
    const { error: dbError } = await supabase.from('users').upsert({
      id: userId,
      email,
      name,
      role: role || 'student',
      school_id,
      document_type: 'EST',
      document_id: document_id || '',
      specialty: specialty || '',
      job_title: job_title || '',
      avatar_url: avatar_url || null,
      status: 'active',
      password_reset_required: true,
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Registrar en auditoría
    try {
      await supabase.from('audit_logs').insert({
        actor_email: auth.user.email,
        action: 'user.created_student',
        target_name: email,
        target_type: 'user',
        details: { userId, school_id, role: role || 'student' },
      });
    } catch {}

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Error /api/admin/create-student:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
