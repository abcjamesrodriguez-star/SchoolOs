import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher']);
    if (!auth.ok) return auth.response;

    const teacherId = auth.user.id;
    const supabase = auth.admin;

    const { data: rawClasses, error: clsErr } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId);

    if (clsErr) {
      console.error('[GET /api/teacher/classes] Error fetching classes:', clsErr);
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!rawClasses || rawClasses.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const rawSlotIds = Array.from(new Set(rawClasses.map((c: any) => c.slot_id || c.time_slot_id).filter(Boolean)));
    const uuidSlotIds = rawSlotIds.filter((id: any) => typeof id === 'string' && id.includes('-') && id.length >= 32);
    const courseIds = Array.from(new Set(rawClasses.map((c: any) => c.course_id || c.subject_id).filter(Boolean)));

    const [{ data: slots }, { data: courses }] = await Promise.all([
      uuidSlotIds.length > 0
        ? supabase.from('school_time_slots').select('id, name, start_time, end_time, is_break').in('id', uuidSlotIds)
        : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase.from('courses').select('id, name, grade_level, color, code').in('id', courseIds)
        : Promise.resolve({ data: [] }),
    ]);

    const slotsMap = new Map((slots || []).map((s: any) => [s.id, s]));
    const coursesMap = new Map((courses || []).map((c: any) => [c.id, c]));

    const data = rawClasses.map((c: any) => {
      const dbSlot = slotsMap.get(c.slot_id || c.time_slot_id);
      const timeSlot = dbSlot || {
        id: c.slot_id || 'slot-1',
        name: c.slot_id ? (c.slot_id.startsWith('slot-') ? `Bloque ${c.slot_id.replace('slot-', '')}` : c.slot_id) : 'Bloque de Clase',
        start_time: c.start_time || '07:00',
        end_time: c.end_time || '08:00',
        is_break: false,
      };

      return {
        id: c.id,
        room: c.room || c.classroom,
        day_of_week: c.day_of_week,
        time_slot: timeSlot,
        course: coursesMap.get(c.course_id || c.subject_id) || null,
      };
    });

    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/teacher/classes]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
