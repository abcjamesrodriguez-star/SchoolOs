import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

/**
 * DELETE /api/school-admin/courses
 * Permite eliminar un curso y/o insertar los grados por defecto
 * (protegido para school_admin).
 */
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin;
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const id = url.searchParams.get('id') || body.id;

    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta ID del curso' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Aislamiento multi-tenant: Si es school_admin, solo puede borrar cursos de su propia institución
    let query = supabase.from('courses').delete().eq('id', id);
    if (auth.user.role === 'school_admin') {
      query = query.eq('school_id', auth.user.school_id);
    }

    const { error } = await query;
    if (error) throw error;

    // Registrar en auditoría
    try {
      await supabase.from('audit_logs').insert({
        actor_email: auth.user.email,
        action: 'course.deleted',
        target_name: id,
        target_type: 'course',
        details: { courseId: id, schoolId: auth.user.school_id }
      });
    } catch {}

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Error DELETE /api/school-admin/courses:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin;
    const body = await request.json();
    const { action, defaultGrades } = body;

    if (action === 'init_grades' && Array.isArray(defaultGrades)) {
      const targetSchoolId = defaultGrades[0]?.school_id || auth.user.school_id;

      if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para inicializar grados de otra institución.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' }
        });
      }

      // Asegurar que cada registro corresponda a la institución autorizada
      const sanitizedGrades = defaultGrades.map((g: any) => ({
        ...g,
        school_id: targetSchoolId
      }));

      const { error } = await supabase.from('grade_capacities').insert(sanitizedGrades);
      if (error) throw error;
      
      const { data: refreshed } = await supabase.from('grade_capacities').select('*').eq('school_id', targetSchoolId);

      return new Response(JSON.stringify({ ok: true, data: refreshed }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Acción no soportada' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Error POST /api/school-admin/courses:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};
