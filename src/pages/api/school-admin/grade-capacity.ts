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

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const targetSchoolId = await resolveSchoolId(auth, body.schoolId);

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
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
    const targetSchoolId = await resolveSchoolId(auth, url.searchParams.get('schoolId'));

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
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