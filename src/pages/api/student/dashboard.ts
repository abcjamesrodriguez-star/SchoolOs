import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['student']);
    if (!auth.ok) return auth.response;

    const studentId = auth.user.id;
    const supabase = auth.admin;

    // 1. Perfil completo del estudiante
    const { data: student, error: stdErr } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, school_id, job_title, specialty, phone, document_id')
      .eq('id', studentId)
      .maybeSingle();

    if (stdErr || !student) {
      return new Response(JSON.stringify({ ok: false, error: 'Estudiante no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const schoolId = student.school_id || auth.user.schoolId;
    const classroom = student.job_title; // Salón asignado (ej. 'tallermultiple-1')
    const gradeLevel = student.specialty; // Grado asignado (ej. '10° Grado')

    // 2. Información de la institución
    let school = null;
    if (schoolId) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, slug')
        .eq('id', schoolId)
        .maybeSingle();
      school = schoolData;
    }

    // 3. Auto-sincronización reactiva: verificar si el salón tiene cursos y asegurar matrícula
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

    // 4. Cursos matriculados
    const { data: enrollments } = await supabase
      .from('course_students')
      .select('course_id, status')
      .eq('student_id', studentId)
      .in('status', ['active', 'enrolled']);

    const courseIds = (enrollments || []).map((e: any) => e.course_id);

    // 5. Clases de Hoy (según el salón del alumno)
    const now = new Date();
    const dayIndex = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNamesEs = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const todayEn = dayNamesEn[dayIndex];
    const todayEs = dayNamesEs[dayIndex];

    let todaySchedule: any[] = [];
    if (classroom) {
      const { data: classesToday } = await supabase
        .from('classes')
        .select('*')
        .or(`classroom.eq."${classroom}",classroom.eq."${gradeLevel || classroom}"`);

      const filteredToday = (classesToday || []).filter((c: any) => {
        const d = (c.day_of_week || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return d === todayEn || d === todayEs || d === String(dayIndex);
      });

      if (filteredToday.length > 0) {
        // Enriquecer con profesores, cursos y time_slots
        const teacherIds = Array.from(new Set(filteredToday.map((c: any) => c.teacher_id).filter(Boolean)));
        const classCourseIds = Array.from(new Set(filteredToday.map((c: any) => c.course_id).filter(Boolean)));
        const slotIds = Array.from(new Set(filteredToday.map((c: any) => c.slot_id || c.time_slot_id).filter(Boolean)));
        const uuidSlots = slotIds.filter((id: any) => typeof id === 'string' && id.includes('-') && id.length >= 32);

        const [{ data: teachers }, { data: courseDetails }, { data: dbSlots }] = await Promise.all([
          teacherIds.length > 0
            ? supabase.from('users').select('id, name, avatar_url').in('id', teacherIds)
            : Promise.resolve({ data: [] }),
          classCourseIds.length > 0
            ? supabase.from('courses').select('id, name, color, code').in('id', classCourseIds)
            : Promise.resolve({ data: [] }),
          uuidSlots.length > 0
            ? supabase.from('school_time_slots').select('id, name, start_time, end_time, is_break').in('id', uuidSlots)
            : Promise.resolve({ data: [] }),
        ]);

        const teachersMap = new Map((teachers || []).map((t: any) => [t.id, t]));
        const coursesMap = new Map((courseDetails || []).map((c: any) => [c.id, c]));
        const slotsMap = new Map((dbSlots || []).map((s: any) => [s.id, s]));

        // Hora actual en formato HH:MM
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        todaySchedule = filteredToday.map((c: any) => {
          const course = coursesMap.get(c.course_id);
          const teacher = teachersMap.get(c.teacher_id);
          const slot = slotsMap.get(c.slot_id || c.time_slot_id);

          const startTime = c.start_time || slot?.start_time || '08:00';
          const endTime = c.end_time || slot?.end_time || '09:00';

          let status: 'upcoming' | 'active' | 'done' = 'upcoming';
          if (currentTime > endTime) {
            status = 'done';
          } else if (currentTime >= startTime && currentTime <= endTime) {
            status = 'active';
          }

          return {
            id: c.id,
            time: `${startTime} – ${endTime}`,
            startTime,
            endTime,
            courseId: c.course_id,
            courseName: course?.name || 'Materia',
            courseColor: course?.color || '#3B82F6',
            room: c.classroom || classroom,
            teacherName: teacher?.name ? `Prof. ${teacher.name}` : 'Docente Asignado',
            teacherAvatarUrl: teacher?.avatar_url || '/avatars/women/fila-1-columna-1.png',
            status,
            statusLabel: status === 'active' ? 'EN VIVO AHORA' : status === 'done' ? 'Concluida ✓' : 'Siguiente clase',
          };
        }).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      }
    }

    // 6. Evaluaciones urgentes pendientes
    let pendingEvaluations: any[] = [];
    if (courseIds.length > 0) {
      const { data: evals } = await supabase
        .from('evaluations')
        .select('id, course_id, title, type, max_score, weight_percentage, evaluation_date, created_at')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      // Buscar si el estudiante ya tiene nota en estas evaluaciones
      const evalIds = (evals || []).map((e: any) => e.id);
      let scoredEvalIds = new Set<string>();
      if (evalIds.length > 0) {
        const { data: scores } = await supabase
          .from('student_scores')
          .select('evaluation_id')
          .eq('student_id', studentId)
          .in('evaluation_id', evalIds);
        scoredEvalIds = new Set((scores || []).map((s: any) => s.evaluation_id));
      }

      // Traer nombres de cursos para las evaluaciones
      const { data: evalCourses } = await supabase
        .from('courses')
        .select('id, name')
        .in('id', courseIds);
      const evalCoursesMap = new Map((evalCourses || []).map((c: any) => [c.id, c.name]));

      pendingEvaluations = (evals || [])
        .filter((e: any) => !scoredEvalIds.has(e.id))
        .map((e: any) => ({
          evaluationId: e.id,
          courseId: e.course_id,
          courseName: evalCoursesMap.get(e.course_id) || 'Materia',
          evaluationTitle: e.title,
          type: e.type,
          maxScore: e.max_score,
          dueLabel: e.evaluation_date ? `Vence: ${new Date(e.evaluation_date).toLocaleDateString('es-ES')}` : 'Activa ahora',
        }));
    }

    // 7. Laboratorios Virtuales activos
    const { data: rawTokens } = await supabase
      .from('lab_tokens')
      .select('id, lab_id, course_id, token_id, status, play_mode, tasks_completed, tasks_missing, time_spent_seconds, assigned_at, feedback_text')
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: false });

    let activeLabs: any[] = [];
    if (rawTokens && rawTokens.length > 0) {
      const labIds = Array.from(new Set(rawTokens.map((t: any) => t.lab_id).filter(Boolean)));
      const labCourseIds = Array.from(new Set(rawTokens.map((t: any) => t.course_id).filter(Boolean)));

      const [{ data: labCatalog }, { data: labCourses }] = await Promise.all([
        labIds.length > 0
          ? supabase.from('virtual_labs').select('id, name, description').in('id', labIds)
          : Promise.resolve({ data: [] }),
        labCourseIds.length > 0
          ? supabase.from('courses').select('id, name, code').in('id', labCourseIds)
          : Promise.resolve({ data: [] }),
      ]);

      const labMap = new Map((labCatalog || []).map((l: any) => [l.id, l]));
      const courseMap = new Map((labCourses || []).map((c: any) => [c.id, c]));

      // Deduplicar para mostrar el token más reciente por laboratorio
      const seenLabs = new Set<string>();
      const deduplicatedTokens: any[] = [];
      for (const tok of rawTokens) {
        if (!seenLabs.has(tok.lab_id)) {
          seenLabs.add(tok.lab_id);
          deduplicatedTokens.push(tok);
        }
      }

      activeLabs = deduplicatedTokens
        .filter((t: any) => {
          const course = courseMap.get(t.course_id);
          if (!course) return true;
          // El laboratorio virtual es exclusivo de Química
          return Boolean(
            course.name?.toLowerCase().includes('química') ||
            course.name?.toLowerCase().includes('quimica') ||
            course.code?.toUpperCase().includes('QUI')
          );
        })
        .map((t: any) => {
          const lab = labMap.get(t.lab_id);
          const course = courseMap.get(t.course_id);
          return {
            id: t.id,
            tokenId: t.token_id,
            labName: lab?.name || 'Laboratorio Virtual de Química',
            labDescription: lab?.description || '',
            courseName: course?.name || 'Química',
            courseCode: course?.code || 'QUI',
            status: t.status,
            playMode: t.play_mode || 'PC',
            tasksCompleted: t.tasks_completed || 0,
            tasksMissing: t.tasks_missing || 0,
            timeSpentSeconds: t.time_spent_seconds || 0,
            feedbackText: t.feedback_text || null,
            assignedAt: t.assigned_at,
          };
        });
    }

    // 8. Promedio General del Estudiante
    const { data: allScores } = await supabase
      .from('student_scores')
      .select('score')
      .eq('student_id', studentId);

    let generalAverage = 0;
    if (allScores && allScores.length > 0) {
      const total = allScores.reduce((acc: number, curr: any) => acc + Number(curr.score || 0), 0);
      generalAverage = parseFloat((total / allScores.length).toFixed(1));
    }

    const payload = {
      profile: {
        id: student.id,
        name: student.name,
        email: student.email,
        avatarUrl: student.avatar_url,
        classroom: classroom || 'Sin salón asignado',
        grade: gradeLevel || 'Sin grado asignado',
        schoolId: school?.id || schoolId,
        schoolName: school?.name || 'Colegio',
        coursesCount: courseIds.length,
        generalAverage,
        averageLabel: generalAverage >= 9 ? 'Excelente' : generalAverage >= 7 ? 'Sobresaliente' : generalAverage >= 5 ? 'Aceptable' : 'En progreso',
      },
      todaySchedule,
      pendingEvaluations,
      activeLabs,
    };

    return new Response(JSON.stringify({ ok: true, data: payload }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/student/dashboard] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
