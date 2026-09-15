import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const studentId = auth.user.id;
    const supabase = auth.admin;

    // 1. Obtener cursos en los que está matriculado
    const { data: enrollments, error: enrErr } = await supabase
      .from('course_students')
      .select('course_id')
      .eq('student_id', studentId)
      .in('status', ['active', 'enrolled']);

    if (enrErr) {
      console.error('[GET /api/student/grades] Error fetching enrollments:', enrErr);
      return new Response(JSON.stringify({ ok: true, data: { courses: [], generalAverage: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const courseIds = (enrollments || []).map((e: any) => e.course_id).filter(Boolean);
    if (courseIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: { courses: [], generalAverage: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Traer cursos, evaluaciones y notas
    const [
      { data: courses },
      { data: evals },
      { data: scores },
    ] = await Promise.all([
      supabase.from('courses').select('id, name, code, color, grade_level').in('id', courseIds),
      supabase.from('evaluations').select('id, course_id, title, type, max_score, weight_percentage, evaluation_date').in('course_id', courseIds),
      supabase.from('student_scores').select('id, evaluation_id, score, feedback_text, created_at').eq('student_id', studentId),
    ]);

    const scoresMap = new Map((scores || []).map((s: any) => [s.evaluation_id, s]));
    const evalsByCourse = new Map<string, any[]>();
    (evals || []).forEach((ev: any) => {
      const list = evalsByCourse.get(ev.course_id) || [];
      list.push(ev);
      evalsByCourse.set(ev.course_id, list);
    });

    let totalGlobalWeightedScore = 0;
    let totalGlobalWeight = 0;

    const coursesGrades = (courses || []).map((course: any) => {
      const courseEvals = evalsByCourse.get(course.id) || [];

      let totalWeightedScore = 0;
      let totalWeight = 0;
      let evaluationsCompleted = 0;

      const items = courseEvals.map((ev: any) => {
        const studentScore = scoresMap.get(ev.id);
        const hasScore = !!studentScore;
        const scoreVal = hasScore ? Number(studentScore.score) : null;
        const weight = Number(ev.weight_percentage) || 100;

        if (hasScore) {
          totalWeightedScore += (scoreVal || 0) * weight;
          totalWeight += weight;
          evaluationsCompleted++;

          totalGlobalWeightedScore += (scoreVal || 0) * weight;
          totalGlobalWeight += weight;
        }

        return {
          evaluationId: ev.id,
          title: ev.title,
          type: ev.type,
          maxScore: Number(ev.max_score) || 10,
          weightPercentage: weight,
          score: scoreVal,
          hasScore,
          feedback: studentScore?.feedback_text || null,
          gradedAt: studentScore?.created_at || null,
          date: ev.evaluation_date,
        };
      });

      const currentAverage = totalWeight > 0 ? parseFloat((totalWeightedScore / totalWeight).toFixed(1)) : null;

      return {
        courseId: course.id,
        courseName: course.name,
        subject: course.grade_level || 'Asignatura',
        color: course.color || '#3B82F6',
        currentAverage: currentAverage !== null ? currentAverage : 0.0,
        hasGrades: currentAverage !== null,
        status: currentAverage !== null ? (currentAverage >= 6.0 ? 'passing' : 'failing') : 'pending',
        evaluationsTotal: courseEvals.length,
        evaluationsCompleted,
        evaluations: items,
      };
    });

    const generalAverage = totalGlobalWeight > 0
      ? parseFloat((totalGlobalWeightedScore / totalGlobalWeight).toFixed(1))
      : 0.0;

    return new Response(JSON.stringify({
      ok: true,
      data: {
        courses: coursesGrades,
        generalAverage,
        averageLabel: generalAverage >= 9 ? 'Excelente' : generalAverage >= 7 ? 'Sobresaliente' : generalAverage >= 6 ? 'Aceptable' : 'En progreso',
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/student/grades] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
