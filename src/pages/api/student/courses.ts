import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const studentId = auth.user.id;
    const supabase = auth.admin;

    // 1. Obtener datos del estudiante
    const { data: student, error: stdErr } = await supabase
      .from('users')
      .select('id, job_title, specialty, school_id')
      .eq('id', studentId)
      .maybeSingle();

    if (stdErr || !student) {
      return new Response(JSON.stringify({ ok: false, error: 'Estudiante no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const classroom = student.job_title;
    const gradeLevel = student.specialty;

    // 2. Auto-sincronización con las materias dictadas en el salón
    if (classroom) {
      const { data: roomClasses } = await supabase
        .from('classes')
        .select('course_id')
        .or(`classroom.eq."${classroom}",classroom.eq."${gradeLevel || classroom}"`);

      if (roomClasses && roomClasses.length > 0) {
        const uniqueCourseIds = Array.from(new Set(roomClasses.map((c: any) => c.course_id).filter(Boolean)));
        if (uniqueCourseIds.length > 0) {
          const enrollments = uniqueCourseIds.map((cId) => ({
            course_id: cId,
            student_id: studentId,
            status: 'active',
          }));
          await supabase.from('course_students').upsert(enrollments, {
            onConflict: 'course_id,student_id',
            ignoreDuplicates: true,
          });
        }
      }
    }

    // 3. Buscar cursos matriculados
    const { data: enrollments, error: enrErr } = await supabase
      .from('course_students')
      .select('course_id, status, enrolled_at')
      .eq('student_id', studentId)
      .in('status', ['active', 'enrolled']);

    if (enrErr) {
      console.error('[GET /api/student/courses] Error fetching enrollments:', enrErr);
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);
    if (courseIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Traer información de los cursos, clases del salón, guías y notas en paralelo
    const [
      { data: courses },
      { data: classRecords },
      { data: guides },
      { data: evals },
      { data: scores },
    ] = await Promise.all([
      supabase.from('courses').select('id, name, code, color, grade_level').in('id', courseIds),
      classroom
        ? supabase.from('classes').select('course_id, teacher_id, classroom, day_of_week, start_time, end_time, slot_id').eq('classroom', classroom)
        : Promise.resolve({ data: [] }),
      supabase.from('guides').select('id, course_id, status').in('course_id', courseIds).eq('status', 'published'),
      supabase.from('evaluations').select('id, course_id, max_score, weight_percentage').in('course_id', courseIds),
      supabase.from('student_scores').select('evaluation_id, score').eq('student_id', studentId),
    ]);

    // Obtener docentes de las clases
    const teacherIds = Array.from(new Set((classRecords || []).map((c: any) => c.teacher_id).filter(Boolean)));
    const { data: teachers } = teacherIds.length > 0
      ? await supabase.from('users').select('id, name, avatar_url, email').in('id', teacherIds)
      : { data: [] };

    const teachersMap = new Map((teachers || []).map((t: any) => [t.id, t]));
    const classByCourseMap = new Map((classRecords || []).map((c: any) => [c.course_id, c]));
    const scoresByEvalMap = new Map((scores || []).map((s: any) => [s.evaluation_id, Number(s.score)]));

    // Mapear guías por curso
    const guidesCountMap = new Map<string, number>();
    (guides || []).forEach((g: any) => {
      guidesCountMap.set(g.course_id, (guidesCountMap.get(g.course_id) || 0) + 1);
    });

    // Mapear evaluaciones y calcular promedio por curso
    const evalsByCourse = new Map<string, any[]>();
    (evals || []).forEach((e: any) => {
      const list = evalsByCourse.get(e.course_id) || [];
      list.push(e);
      evalsByCourse.set(e.course_id, list);
    });

    const coursesData = (courses || []).map((course: any) => {
      const classRec = classByCourseMap.get(course.id);
      const teacher = classRec ? teachersMap.get(classRec.teacher_id) : null;
      const courseEvals = evalsByCourse.get(course.id) || [];

      // Calcular promedio del curso
      let totalWeightedScore = 0;
      let totalWeight = 0;
      let gradedCount = 0;

      courseEvals.forEach((ev: any) => {
        if (scoresByEvalMap.has(ev.id)) {
          const sc = scoresByEvalMap.get(ev.id)!;
          const weight = Number(ev.weight_percentage) || 100;
          totalWeightedScore += sc * weight;
          totalWeight += weight;
          gradedCount++;
        }
      });

      const currentAverage = totalWeight > 0 ? parseFloat((totalWeightedScore / totalWeight).toFixed(1)) : null;

      return {
        id: course.id,
        courseId: course.id,
        courseName: course.name,
        subject: course.grade_level || 'Asignatura',
        code: course.code,
        color: course.color || '#1A365D',
        description: course.description || '',
        classroom: classRec?.classroom || classroom || 'Aula General',
        teacherName: teacher?.name || 'Profesor por asignar',
        teacherAvatarUrl: teacher?.avatar_url || '/avatars/women/fila-1-columna-1.png',
        teacherEmail: teacher?.email,
        scheduleInfo: classRec ? `${classRec.day_of_week || ''} (${classRec.start_time || ''} - ${classRec.end_time || ''})` : 'Por coordinar',
        guidesTotal: guidesCountMap.get(course.id) || 0,
        evaluationsTotal: courseEvals.length,
        evaluationsGraded: gradedCount,
        currentAverage: currentAverage !== null ? currentAverage : 0.0,
        hasGrades: currentAverage !== null,
        status: 'active',
      };
    });

    return new Response(JSON.stringify({ ok: true, data: coursesData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/student/courses] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
