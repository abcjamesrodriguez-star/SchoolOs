import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const schoolId = auth.user.schoolId;
    if (!schoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Escuela no asociada al usuario.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = auth.admin;

    const [{ count: students }, { count: teachers }, coursesResult, { data: school }] = await Promise.all([
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('role', 'student'),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('role', 'teacher'),
      supabase
        .from('courses')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('status', 'active'),
      supabase
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .maybeSingle(),
    ]);

    const totalStudents = typeof students === 'number' ? students : 0;
    const totalTeachers = typeof teachers === 'number' ? teachers : 0;
    const activeCourses = coursesResult.error ? 0 : (coursesResult.count || 0);

    const planName = school?.plan_name || 'Pro';
    const maxStudentsPlan = planName === 'Starter' ? 200 : planName === 'Enterprise' ? 5000 : 1500;
    const planUsagePercent = maxStudentsPlan ? Math.round((totalStudents / maxStudentsPlan) * 100) : 0;

    const stats = {
      totalStudents,
      totalTeachers,
      activeCourses,
      maxStudentsPlan,
      planUsagePercent,
    };

    return new Response(JSON.stringify({ ok: true, stats, school, user: auth.user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/school-admin/stats]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
