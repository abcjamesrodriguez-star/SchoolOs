import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

async function resolveSchoolId(auth: any, requestedSchoolId?: string | null): Promise<string | null> {
  if (auth.user.role === 'school_admin') {
    return auth.user.school_id;
  }
  let target = (requestedSchoolId || auth.user.school_id || '').trim();
  if (target && !target.includes('-')) {
    const { data: s } = await auth.admin.from('schools').select('id').eq('slug', target).maybeSingle();
    if (s?.id) target = s.id;
  }
  return target || null;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const targetSchoolId = await resolveSchoolId(auth, url.searchParams.get('schoolId'));

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await auth.admin
      .from('courses')
      .select('*')
      .eq('school_id', targetSchoolId)
      .order('name', { ascending: true });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, data: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/school-admin/subjects]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const targetSchoolId = await resolveSchoolId(auth, body.schoolId);
    const supabase = auth.admin;

    if (!targetSchoolId && (action === 'create' || action === 'init_subjects' || auth.user.role === 'school_admin')) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId obligatorio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create') {
      const { payload } = body;
      if (!payload || !payload.name) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta el nombre de la materia.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const insertData = {
        name: payload.name.trim(),
        code: (payload.code || payload.name.slice(0, 3)).trim().toUpperCase(),
        grade_level: payload.grade_level || 'Área General',
        hours_per_week: Number(payload.hours_per_week) || 4,
        color: payload.color || '#1B2A4A',
        school_id: targetSchoolId,
        qualified_teacher_ids: Array.isArray(payload.qualified_teacher_ids) ? payload.qualified_teacher_ids : [],
      };

      const { data: inserted, error } = await supabase.from('courses').insert(insertData).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, data: inserted }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      const { payload, subjectId } = body;
      if (!subjectId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta subjectId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const updateData: any = {};
      if (payload.name) updateData.name = payload.name.trim();
      if (payload.code) updateData.code = payload.code.trim().toUpperCase();
      if (payload.grade_level) updateData.grade_level = payload.grade_level;
      if (payload.hours_per_week !== undefined) updateData.hours_per_week = Number(payload.hours_per_week);
      if (payload.color) updateData.color = payload.color;
      if (payload.qualified_teacher_ids !== undefined) {
        updateData.qualified_teacher_ids = Array.isArray(payload.qualified_teacher_ids) ? payload.qualified_teacher_ids : [];
      }

      let query = supabase.from('courses').update(updateData).eq('id', subjectId);
      if (auth.user.role === 'school_admin') {
        query = query.eq('school_id', targetSchoolId);
      }
      const { error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'assign_teacher') {
      const { teacherId, subjectId } = body;
      let query = supabase.from('courses').update({ teacher_id: teacherId || null }).eq('id', subjectId);
      if (auth.user.role === 'school_admin') {
        query = query.eq('school_id', targetSchoolId);
      }
      const { error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'init_subjects') {
      const { subjects } = body;
      const sanitized = (subjects || []).map((s: any) => ({
        name: s.name,
        code: (s.code || s.name.slice(0, 3)).trim().toUpperCase(),
        grade_level: s.grade_level || 'Área General',
        hours_per_week: Number(s.hours_per_week) || 4,
        color: s.color || '#1B2A4A',
        school_id: targetSchoolId,
        qualified_teacher_ids: Array.isArray(s.qualified_teacher_ids) ? s.qualified_teacher_ids : [],
      }));

      const { data, error } = await supabase.from('courses').insert(sanitized).select();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, data: data || [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion invalida.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[POST /api/school-admin/subjects]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};