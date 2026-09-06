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

    if (courseId) {
      // Validar que el curso pertenezca al docente o a su institución
      const { data: courseCheck } = await supabase
        .from('courses')
        .select('id, teacher_id, school_id')
        .eq('id', courseId)
        .maybeSingle();

      if (!courseCheck || (auth.user.role === 'teacher' && courseCheck.teacher_id !== teacherId)) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes acceso a los alumnos de este curso.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: enrollments, error } = await supabase
        .from('course_students')
        .select(`
          id, status,
          student:users(id, name, email, avatar_url, document_id)
        `)
        .eq('course_id', courseId);

      if (error) {
        return new Response(JSON.stringify({ ok: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true, data: enrollments || [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Obtener cursos del profesor
    const { data: courses } = await supabase.from('courses').select('id').eq('teacher_id', teacherId);
    
    if (!courses || courses.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), { status: 200 });
    }

    const courseIds = courses.map((c: any) => c.id);

    // Obtener los estudiantes inscritos en esos cursos (únicos)
    const { data: enrollments } = await supabase
      .from('course_students')
      .select('student:users(id, name, email, document_id, avatar_url, phone)')
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

    return new Response(JSON.stringify({ ok: true, data: Array.from(studentsMap.values()) }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message }), { status: 500 });
  }
};