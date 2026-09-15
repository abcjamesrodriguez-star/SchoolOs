import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const studentId = auth.user.id;
    const supabase = auth.admin;

    // 1. Obtener el salón y grado del estudiante
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

    if (!classroom) {
      return new Response(JSON.stringify({ ok: true, data: { classroom: null, days: {}, classes: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Consultar todas las clases programadas para este salón
    const { data: rawClasses, error: clsErr } = await supabase
      .from('classes')
      .select('*')
      .or(`classroom.eq."${classroom}",classroom.eq."${gradeLevel || classroom}"`);

    if (clsErr) {
      console.error('[GET /api/student/schedule] Error fetching classes:', clsErr);
      return new Response(JSON.stringify({ ok: true, data: { classroom, days: {}, classes: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!rawClasses || rawClasses.length === 0) {
      return new Response(JSON.stringify({ ok: true, data: { classroom, days: {}, classes: [] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Obtener relaciones (Docentes, Cursos, Slots)
    const teacherIds = Array.from(new Set(rawClasses.map((c: any) => c.teacher_id).filter(Boolean)));
    const courseIds = Array.from(new Set(rawClasses.map((c: any) => c.course_id).filter(Boolean)));
    const slotIds = Array.from(new Set(rawClasses.map((c: any) => c.slot_id || c.time_slot_id).filter(Boolean)));
    const uuidSlots = slotIds.filter((id: any) => typeof id === 'string' && id.includes('-') && id.length >= 32);

    const [{ data: teachers }, { data: courses }, { data: dbSlots }] = await Promise.all([
      teacherIds.length > 0
        ? supabase.from('users').select('id, name, avatar_url, email').in('id', teacherIds)
        : Promise.resolve({ data: [] }),
      courseIds.length > 0
        ? supabase.from('courses').select('id, name, color, code, grade_level').in('id', courseIds)
        : Promise.resolve({ data: [] }),
      uuidSlots.length > 0
        ? supabase.from('school_time_slots').select('id, name, start_time, end_time, is_break').in('id', uuidSlots)
        : Promise.resolve({ data: [] }),
    ]);

    const teachersMap = new Map((teachers || []).map((t: any) => [t.id, t]));
    const coursesMap = new Map((courses || []).map((c: any) => [c.id, c]));
    const slotsMap = new Map((dbSlots || []).map((s: any) => [s.id, s]));

    const dayKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const days: Record<string, any[]> = {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: [],
      sabado: [],
    };

    const formattedClasses = rawClasses.map((c: any) => {
      const course = coursesMap.get(c.course_id);
      const teacher = teachersMap.get(c.teacher_id);
      const slot = slotsMap.get(c.slot_id || c.time_slot_id);

      const startTime = c.start_time || slot?.start_time || '08:00';
      const endTime = c.end_time || slot?.end_time || '09:00';

      const rawDay = (c.day_of_week || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      let normalizedDay = rawDay;
      if (rawDay === 'monday') normalizedDay = 'lunes';
      else if (rawDay === 'tuesday') normalizedDay = 'martes';
      else if (rawDay === 'wednesday') normalizedDay = 'miercoles';
      else if (rawDay === 'thursday') normalizedDay = 'jueves';
      else if (rawDay === 'friday') normalizedDay = 'viernes';
      else if (rawDay === 'saturday') normalizedDay = 'sabado';

      const entry = {
        id: c.id,
        courseId: c.course_id,
        courseName: course?.name || 'Materia',
        courseColor: course?.color || '#3B82F6',
        courseCode: course?.code,
        dayOfWeek: normalizedDay,
        time: `${startTime} – ${endTime}`,
        startTime,
        endTime,
        classroom: c.classroom || classroom,
        teacherName: teacher?.name ? `Prof. ${teacher.name}` : 'Docente Asignado',
        teacherAvatarUrl: teacher?.avatar_url || '/avatars/women/fila-1-columna-1.png',
        slotName: slot?.name || c.slot_id || 'Bloque',
      };

      if (days[normalizedDay]) {
        days[normalizedDay].push(entry);
      }

      return entry;
    });

    // Ordenar cada día por hora de inicio
    for (const key of dayKeys) {
      days[key].sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
    }

    return new Response(JSON.stringify({
      ok: true,
      data: {
        classroom,
        gradeLevel,
        days,
        classes: formattedClasses.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime)),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/student/schedule] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
