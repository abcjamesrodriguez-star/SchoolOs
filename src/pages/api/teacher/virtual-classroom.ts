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

    // 1. Obtener información del curso
    const { data: course, error: courseErr } = await auth.admin
      .from('courses')
      .select('id, name, code, grade_level, school_id, teacher_id')
      .eq('id', courseId)
      .maybeSingle();

    if (courseErr || !course) {
      return new Response(JSON.stringify({ ok: false, error: 'Materia o curso no encontrado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Validación de permisos multi-tenant y asignación docente
    if (auth.user.role === 'teacher') {
      let isAssigned = course.teacher_id === auth.user.id;
      if (!isAssigned) {
        const { data: teacherClass } = await auth.admin
          .from('classes')
          .select('id')
          .eq('course_id', courseId)
          .eq('classroom', classroom)
          .eq('teacher_id', auth.user.id)
          .limit(1);

        isAssigned = Boolean(teacherClass && teacherClass.length > 0);
      }

      if (!isAssigned) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para acceder a esta aula virtual.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (auth.user.role === 'school_admin') {
      if (course.school_id !== auth.user.school_id) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para acceder a cursos de otra institución.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Auto-sincronizar alumnos de este salón a course_students
    const { data: salonStudents } = await auth.admin
      .from('users')
      .select('id, name, avatar_url, job_title, role, document_id, email')
      .eq('school_id', course.school_id)
      .eq('role', 'student')
      .eq('job_title', classroom);

    if (salonStudents && salonStudents.length > 0) {
      const enrollPayload = salonStudents.map((s: any) => ({
        course_id: courseId,
        student_id: s.id,
        status: 'enrolled',
      }));
      await auth.admin.from('course_students').upsert(enrollPayload, { onConflict: 'course_id,student_id' });
    }

    // 4. Intentar RPC si existe en la BD
    try {
      const { data: rpcResult, error: rpcError } = await auth.admin.rpc('get_virtual_classroom_details', {
        p_course_id: courseId,
        p_classroom: classroom,
      });
      if (!rpcError && rpcResult && Array.isArray(rpcResult.students) && rpcResult.students.length > 0) {
        return new Response(JSON.stringify({ ok: true, data: rpcResult }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (_) {}

    // 5. Devolver lista completa consolidada
    const students = salonStudents || [];

    return new Response(JSON.stringify({
      ok: true,
      data: {
        course: {
          id: course.id,
          name: course.name,
          code: course.code,
          grade_level: course.grade_level,
        },
        students,
        student_count: students.length,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[GET /api/teacher/virtual-classroom]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};