import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher']);
    if (!auth.ok) return auth.response;

    // Usamos el cliente del backend, que tiene permisos de admin 
    // PERO ojo, la RPC `get_teacher_directory` usa `auth.uid()` internamente en la DB 
    // al estar protegida por RLS. Si la llamamos con el admin_client (service_role), 
    // auth.uid() será null y la RPC fallará si no está preparada para eso.
    // 
    // Una alternativa es usar supabaseBrowser() (que sí manda el token) o simplemente
    // ejecutar la query en el server filtrando por el ID del teacher que sabemos que es auth.user.id
    
    // Como el user está autenticado, podemos llamar a auth.supabaseClient si estuviera configurado.
    // Como no tenemos el client de SSR con el token del usuario fácilmente aquí, podemos emular
    // la respuesta buscando los estudiantes del profesor:

    const teacherId = auth.user.id;
    const supabase = auth.admin;

    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const classroom = url.searchParams.get('classroom');

    if (courseId) {
      // Validar que el curso pertenezca al docente vía classes o courses
      const { data: courseCheck } = await supabase
        .from('courses')
        .select('id, teacher_id, school_id')
        .eq('id', courseId)
        .maybeSingle();

      if (!courseCheck) {
        return new Response(JSON.stringify({ ok: false, error: 'Materia no encontrada.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let hasAccess = false;
      if (auth.user.role === 'super_admin') {
        hasAccess = true;
      } else if (auth.user.role === 'school_admin') {
        hasAccess = courseCheck.school_id === auth.user.school_id;
      } else if (auth.user.role === 'teacher') {
        if (courseCheck.teacher_id === teacherId) {
          hasAccess = true;
        } else {
          const { data: classCheck } = await supabase
            .from('classes')
            .select('id')
            .eq('course_id', courseId)
            .eq('teacher_id', teacherId)
            .limit(1);
          hasAccess = Boolean(classCheck && classCheck.length > 0);
        }
      }

      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes acceso a los alumnos de este curso.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Si se especificó un salón, o si el curso tiene clases para este docente, asegurar auto-enrolamiento
      let targetClassrooms: string[] = [];
      if (classroom) {
        targetClassrooms = [classroom];
      } else {
        const { data: cls } = await supabase
          .from('classes')
          .select('classroom')
          .eq('course_id', courseId)
          .eq('teacher_id', teacherId);
        targetClassrooms = Array.from(new Set((cls || []).map((c: any) => c.classroom).filter(Boolean)));
      }

      // Sincronizar en course_students a los alumnos del salon si aún no lo están
      if (targetClassrooms.length > 0) {
        const { data: eligibleStudents } = await supabase
          .from('users')
          .select('id')
          .eq('school_id', courseCheck.school_id)
          .eq('role', 'student')
          .in('job_title', targetClassrooms);

        if (eligibleStudents && eligibleStudents.length > 0) {
          const toInsert = eligibleStudents.map((s: any) => ({
            course_id: courseId,
            student_id: s.id,
            status: 'enrolled',
          }));
          await supabase.from('course_students').upsert(toInsert, { onConflict: 'course_id,student_id' });
        }
      }

      const { data: enrollments, error } = await supabase
        .from('course_students')
        .select(`
          student_id, status, enrolled_at,
          student:users(id, name, email, avatar_url, document_id, job_title, role)
        `)
        .eq('course_id', courseId);

      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Mapear con id consistente para el frontend
      let result = (enrollments || []).map((e: any) => {
        const s = Array.isArray(e.student) ? e.student[0] : e.student;
        return {
          id: s?.id || e.student_id,
          student_id: e.student_id,
          status: e.status,
          student: s,
        };
      });

      if (classroom) {
        result = result.filter((e: any) => e.student && e.student.job_title === classroom);
      }

      return new Response(JSON.stringify({ ok: true, data: result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener todos los cursos y salones asignados al profesor
    const [{ data: teacherClasses }, { data: legacyCourses }] = await Promise.all([
      supabase.from('classes').select('course_id, classroom').eq('teacher_id', teacherId),
      supabase.from('courses').select('id').eq('teacher_id', teacherId),
    ]);

    const courseIds = Array.from(new Set([
      ...(teacherClasses || []).map((c: any) => c.course_id),
      ...(legacyCourses || []).map((c: any) => c.id),
    ].filter(Boolean)));

    const classrooms = Array.from(new Set((teacherClasses || []).map((c: any) => c.classroom).filter(Boolean)));

    if (courseIds.length === 0 && classrooms.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
    }

    // Auto-sincronizar alumnos de esos salones en course_students
    if (classrooms.length > 0 && courseIds.length > 0) {
      const { data: eligible } = await supabase
        .from('users')
        .select('id, job_title')
        .eq('school_id', auth.user.school_id)
        .eq('role', 'student')
        .in('job_title', classrooms);

      if (eligible && eligible.length > 0) {
        const toUpsert: any[] = [];
        (teacherClasses || []).forEach((tc: any) => {
          eligible.filter((s: any) => s.job_title === tc.classroom).forEach((s: any) => {
            toUpsert.push({ course_id: tc.course_id, student_id: s.id, status: 'enrolled' });
          });
        });
        if (toUpsert.length > 0) {
          await supabase.from('course_students').upsert(toUpsert, { onConflict: 'course_id,student_id' });
        }
      }
    }

    // Obtener estudiantes inscritos en esos cursos (únicos)
    const { data: enrollments } = await supabase
      .from('course_students')
      .select('student:users(id, name, email, document_id, avatar_url, phone, job_title)')
      .in('course_id', courseIds);

    const studentsMap = new Map();
    if (enrollments) {
      for (const e of enrollments) {
        const s = Array.isArray(e.student) ? e.student[0] : e.student;
        if (s && !studentsMap.has(s.id)) {
          studentsMap.set(s.id, s);
        }
      }
    }

    // Si aún faltan alumnos por coincidencia directa de salón, agregarlos
    if (classrooms.length > 0) {
      const { data: directStudents } = await supabase
        .from('users')
        .select('id, name, email, document_id, avatar_url, phone, job_title')
        .eq('school_id', auth.user.school_id)
        .eq('role', 'student')
        .in('job_title', classrooms);

      (directStudents || []).forEach((s: any) => {
        if (!studentsMap.has(s.id)) {
          studentsMap.set(s.id, s);
        }
      });
    }

    return new Response(JSON.stringify({ ok: true, data: Array.from(studentsMap.values()) }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message }), { status: 500 });
  }
};