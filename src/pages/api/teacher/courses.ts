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
        classroom,
        course:courses(id, name, grade_level, color, code)
      `)
      .eq('teacher_id', teacherId);

    if (error) {
      console.error('[GET /api/teacher/courses] Error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const courseMap = new Map();
    (data || []).forEach((row: any) => {
      const course = Array.isArray(row.course) ? row.course[0] : row.course;
      if (!course) return;
      const key = `${course.id}_${row.classroom}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          ...course,
          classroom: row.classroom,
          name: `${course.name} (${row.classroom})`,
        });
      }
    });

    return new Response(JSON.stringify({ ok: true, data: Array.from(courseMap.values()) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/teacher/courses]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
