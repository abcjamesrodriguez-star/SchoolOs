import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const studentId = auth.user.id;
    const supabase = auth.admin;

    // 1. Obtener tokens de laboratorio del estudiante
    const { data: tokens, error: tokErr } = await supabase
      .from('lab_tokens')
      .select('*')
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: false });

    if (tokErr) {
      console.error('[GET /api/student/labs] Error fetching lab tokens:', tokErr);
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Traer catálogo de laboratorios y cursos relacionados
    const labIds = Array.from(new Set(tokens.map((t: any) => t.lab_id).filter(Boolean)));
    const courseIds = Array.from(new Set(tokens.map((t: any) => t.course_id).filter(Boolean)));

    const [{ data: catalog }, { data: courses }] = await Promise.all([
      labIds.length > 0
        ? supabase.from('virtual_labs').select('id, name, description').in('id', labIds)
        : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase.from('courses').select('id, name, code').in('id', courseIds)
        : Promise.resolve({ data: [] }),
    ]);

    const labMap = new Map((catalog || []).map((l: any) => [l.id, l]));
    const courseMap = new Map((courses || []).map((c: any) => [c.id, c]));

    const labs = tokens.map((t: any) => {
      const lab = labMap.get(t.lab_id);
      const course = courseMap.get(t.course_id);

      return {
        id: t.id,
        tokenId: t.token_id,
        labId: t.lab_id,
        labName: lab?.name || 'Laboratorio Virtual',
        labDescription: lab?.description || '',
        courseId: t.course_id,
        courseName: course?.name || 'Materia',
        courseCode: course?.code,
        status: t.status, // 'pending' | 'in_progress' | 'completed'
        playMode: t.play_mode || 'PC',
        tasksCompleted: t.tasks_completed || 0,
        tasksMissing: t.tasks_missing || 0,
        timeSpentSeconds: t.time_spent_seconds || 0,
        feedbackText: t.feedback_text || null,
        assignedAt: t.assigned_at,
        startedAt: t.started_at,
        completedAt: t.completed_at,
      };
    });

    return new Response(JSON.stringify({ ok: true, data: labs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/student/labs] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
