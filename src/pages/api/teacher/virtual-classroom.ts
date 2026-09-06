import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher', 'school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const classroom = url.searchParams.get('classroom');

    if (!courseId || !classroom) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan parametros courseId o classroom' }), { status: 400 });
    }

    // Validación de permisos multi-tenant y asignación docente
    if (auth.user.role === 'teacher') {
      const { data: teacherClass } = await auth.admin
        .from('classes')
        .select('id')
        .eq('course_id', courseId)
        .eq('classroom', classroom)
        .eq('teacher_id', auth.user.id)
        .limit(1);

      if (!teacherClass || teacherClass.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para acceder a esta aula virtual.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (auth.user.role === 'school_admin') {
      const { data: courseCheck } = await auth.admin
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .eq('school_id', auth.user.school_id)
        .maybeSingle();

      if (!courseCheck) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para acceder a cursos de otra institución.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 1. Intentar RPC si existe en la BD
    try {
      const { data: rpcResult, error: rpcError } = await auth.admin.rpc('get_virtual_classroom_details', {
        p_course_id: courseId,
        p_classroom: classroom,
      });
      if (!rpcError && rpcResult) {
        return new Response(JSON.stringify({ ok: true, data: rpcResult }), { status: 200 });
      }
    } catch (_) {}

    // 2. Ejecución nativa en TypeScript
    const [courseRes, studentsRes] = await Promise.all([
      auth.admin.from('courses').select('id, name, code, grade_level').eq('id', courseId).maybeSingle(),
      auth.admin
        .from('course_students')
        .select('student:users!inner(id, name, avatar_url, job_title, role)')
        .eq('course_id', courseId)
        .eq('status', 'enrolled')
        .eq('users.job_title', classroom)
        .eq('users.role', 'student'),
    ]);

    const course = courseRes.data || null;
    const students = (studentsRes.data || []).map((cs: any) => cs.student).filter(Boolean);

    return new Response(JSON.stringify({
      ok: true,
      data: {
        course,
        students,
        student_count: students.length,
      },
    }), { status: 200 });
  } catch (err: any) {
    console.error('[GET /api/teacher/virtual-classroom]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};