import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

async function executeReplaceTimeSlots(supabase: any, schoolId: string, slots: any[]) {
  // 1. Intentar procedimiento almacenado si está disponible
  try {
    const { error: rpcErr } = await supabase.rpc('replace_school_time_slots', {
      p_school_id: schoolId,
      p_slots: slots,
    });
    if (!rpcErr) return;
    console.warn('[time-slots] RPC replace_school_time_slots failed, falling back to direct operations:', rpcErr);
  } catch (rpcEx) {
    console.warn('[time-slots] RPC error fallback:', rpcEx);
  }

  // 2. Fallback nativo: Borrar e insertar directamente con el cliente administrativo
  const { error: delErr } = await supabase
    .from('school_time_slots')
    .delete()
    .eq('school_id', schoolId);

  if (delErr) throw delErr;

  if (Array.isArray(slots) && slots.length > 0) {
    const formattedRows = slots.map((s: any, idx: number) => ({
      school_id: schoolId,
      slot_id: s.slot_id || s.id || `slot-${idx + 1}`,
      name: s.name || s.period_name || `Franja ${idx + 1}`,
      start_time: s.start_time || s.startTime,
      end_time: s.end_time || s.endTime,
      is_break: Boolean(s.is_break ?? s.isBreak),
      order_index: typeof s.order_index === 'number' ? s.order_index : idx,
    }));

    const { error: insErr } = await supabase
      .from('school_time_slots')
      .insert(formattedRows);

    if (insErr) throw insErr;
  }
}

export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const targetSchoolId = body.schoolId || auth.user.school_id;

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin' && auth.user.school_id !== targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar horarios de otra escuela.' }), { status: 403 });
    }

    const slots = body.slots || [];
    await executeReplaceTimeSlots(auth.admin, targetSchoolId, slots);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[PUT /api/school-admin/time-slots]', err);
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

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin' && auth.user.school_id !== targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar horarios de otra escuela.' }), { status: 403 });
    }

    if (action === 'replace_all' || Array.isArray(body.slots)) {
      const slots = body.slots || [];
      await executeReplaceTimeSlots(auth.admin, targetSchoolId, slots);
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Acción no reconocida.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[POST /api/school-admin/time-slots]', err);
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

    if (auth.user.role === 'school_admin' && auth.user.school_id !== targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para consultar horarios de otra escuela.' }), { status: 403 });
    }

    const { data, error } = await auth.admin
      .from('school_time_slots')
      .select('*')
      .eq('school_id', targetSchoolId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, data: data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};