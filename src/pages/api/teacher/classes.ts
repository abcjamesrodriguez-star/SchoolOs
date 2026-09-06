import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher']);
    if (!auth.ok) return auth.response;

    const teacherId = auth.user.id;
    const supabase = auth.admin;

    const { data, error } = await supabase
      .from('classes')
      .select(`
        id, room, day_of_week,
        time_slot:school_time_slots(id, name, start_time, end_time, is_break),
        course:courses(id, name, grade_level, color, group_letter)
      `)
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('[GET /api/teacher/classes] Error fetching classes:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, data: data || [] }), {
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
