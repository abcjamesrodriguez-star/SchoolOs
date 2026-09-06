import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const targetSchoolId = url.searchParams.get('schoolId') || auth.user.school_id;
    const action = url.searchParams.get('action');
    const teacherId = url.searchParams.get('teacherId');
    const supabase = auth.admin;

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para consultar horarios de otra institución.' }), { status: 403 });
    }

    // 1. Mapeo de horas por docente
    if (action === 'hours_map') {
      const { data: dbClasses, error } = await supabase
        .from('classes')
        .select('teacher_id')
        .eq('school_id', targetSchoolId);

      if (error) throw error;
      const hoursMap: Record<string, number> = {};
      (dbClasses || []).forEach((cls: any) => {
        if (cls.teacher_id) {
          hoursMap[cls.teacher_id] = (hoursMap[cls.teacher_id] || 0) + 1;
        }
      });

      return new Response(JSON.stringify({ ok: true, hoursMap }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Horario consolidado para un docente (slots, materias y clases)
    if (action === 'teacher_schedule' || teacherId) {
      const [slotsRes, coursesRes, classesRes] = await Promise.all([
        supabase.from('school_time_slots').select('*').eq('school_id', targetSchoolId).order('order_index', { ascending: true }),
        supabase.from('courses').select('*').eq('school_id', targetSchoolId),
        supabase.from('classes').select('*').eq('school_id', targetSchoolId)
      ]);

      if (slotsRes.error) throw slotsRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (classesRes.error) throw classesRes.error;

      return new Response(JSON.stringify({
        ok: true,
        slots: slotsRes.data || [],
        courses: coursesRes.data || [],
        classes: classesRes.data || []
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Clases generales de la institución
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', targetSchoolId);

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, classes: data || [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[GET /api/school-admin/schedule]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const supabase = auth.admin;

    if (action === 'delete_slot') {
      const { classId } = body;
      if (!classId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta classId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let query = supabase.from('classes').delete().eq('id', classId);
      if (auth.user.role === 'school_admin') {
        query = query.eq('school_id', auth.user.school_id);
      }

      const { error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'create_class_slot') {
      const targetSchoolId = body.schoolId || auth.user.school_id;

      if (!targetSchoolId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      if (auth.user.role === 'school_admin' && targetSchoolId !== auth.user.school_id) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para programar clases en otra institución.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
      }

      const { subjectId, teacherId, classroom, slotId, dayOfWeek, dayIndex, startTime, endTime, roomLocation } = body;

      // 1. Validar colisión de salon
      const { data: roomConflict, error: roomErr } = await supabase
        .from('classes')
        .select('id, classroom, day_of_week, slot_id, course:courses(name), teacher:users(name)')
        .eq('school_id', targetSchoolId)
        .eq('classroom', classroom)
        .eq('day_of_week', dayOfWeek)
        .eq('slot_id', slotId)
        .maybeSingle();

      if (roomErr) throw roomErr;
      if (roomConflict) {
        // @ts-ignore
        const sName = roomConflict.course?.name || 'Otra Materia';
        // @ts-ignore
        const tName = roomConflict.teacher?.name || 'Docente';
        return new Response(JSON.stringify({ ok: false, error: `El salon ${classroom} ya esta ocupado el ${dayOfWeek} con ${sName} (${tName}).` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // 2. Validar colisión de docente
      if (teacherId) {
        const { data: teacherConflict, error: teacherErr } = await supabase
          .from('classes')
          .select('id, classroom, day_of_week, slot_id, course:courses(name), teacher:users(name)')
          .eq('school_id', targetSchoolId)
          .eq('teacher_id', teacherId)
          .eq('day_of_week', dayOfWeek)
          .eq('slot_id', slotId)
          .maybeSingle();

        if (teacherErr) throw teacherErr;
        if (teacherConflict) {
          // @ts-ignore
          const tchName = teacherConflict.teacher?.name || 'El docente';
          return new Response(JSON.stringify({ ok: false, error: `El profesor ${tchName} ya tiene una clase asignada el ${dayOfWeek} a esta hora en el salon ${teacherConflict.classroom}.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }

      // 3. Insertar clase
      const { error: insErr } = await supabase
        .from('classes')
        .insert({
          school_id: targetSchoolId,
          course_id: subjectId,
          teacher_id: teacherId || null,
          classroom: classroom,
          day_of_week: dayOfWeek,
          day_index: dayIndex || 0,
          slot_id: slotId,
          start_time: startTime,
          end_time: endTime,
          room_location: roomLocation || ('Salón ' + classroom)
        });

      if (insErr) throw insErr;
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion invalida.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('[POST /api/school-admin/schedule]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};