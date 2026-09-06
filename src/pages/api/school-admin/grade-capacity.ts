import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const targetSchoolId = body.schoolId || auth.user.school_id;

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar capacidades de otra institución.' }), { status: 403 });
    }

    const supabase = auth.admin;

    if (action === 'upsert') {
      const { gradeLevel, capacityPerRoom, sectionsCount, isOffered } = body;
      const { error } = await supabase
        .from('grade_capacities')
        .upsert({
          school_id: targetSchoolId,
          grade_level: gradeLevel,
          capacity_per_room: capacityPerRoom,
          sections_count: sectionsCount,
          is_offered: isOffered
        }, { onConflict: 'school_id,grade_level' });

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'delete') {
      const { gradeLevel } = body;
      const { error } = await supabase
        .from('grade_capacities')
        .delete()
        .eq('school_id', targetSchoolId)
        .eq('grade_level', gradeLevel);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion invalida.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[POST /api/school-admin/grade-capacity]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const targetSchoolId = url.searchParams.get('schoolId') || auth.user.school_id;

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para consultar capacidades de otra institución.' }), { status: 403 });
    }

    const { data, error } = await auth.admin
      .from('grade_capacities')
      .select('*')
      .eq('school_id', targetSchoolId);

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, data: data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};