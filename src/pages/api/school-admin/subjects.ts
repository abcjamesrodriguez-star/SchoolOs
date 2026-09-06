import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const targetSchoolId = url.searchParams.get('schoolId') || auth.user.school_id;

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para consultar materias de otra institución.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const { data, error } = await auth.admin
      .from('courses')
      .select('*')
      .eq('school_id', targetSchoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, data: data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const targetSchoolId = body.schoolId || auth.user.school_id;
    const supabase = auth.admin;

    if (action === 'create') {
      const { payload } = body;
      if (!targetSchoolId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para crear materias en otra institución.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      const { error } = await supabase.from('courses').insert({ ...payload, school_id: targetSchoolId });
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'update') {
      const { payload, subjectId } = body;
      let query = supabase.from('courses').update(payload).eq('id', subjectId);
      if (auth.user.role === 'school_admin') {
        query = query.eq('school_id', auth.user.school_id);
      }
      const { error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'assign_teacher') {
      const { teacherId, subjectId } = body;
      let query = supabase.from('courses').update({ teacher_id: teacherId }).eq('id', subjectId);
      if (auth.user.role === 'school_admin') {
        query = query.eq('school_id', auth.user.school_id);
      }
      const { error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'init_subjects') {
      const { subjects } = body;
      if (!targetSchoolId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para inicializar materias en otra institución.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      const { data, error } = await supabase
        .from('courses')
        .insert((subjects || []).map((s: any) => ({ ...s, school_id: targetSchoolId })))
        .select();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, data: data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion invalida.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[POST /api/school-admin/subjects]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};