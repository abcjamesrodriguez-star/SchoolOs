import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';
import { buildLabExcelReport } from '../../../lib/excelReportGenerator';

async function verifyCourseAccess(supabase: any, user: any, courseId: string): Promise<boolean> {
  if (user.role === 'super_admin') return true;
  
  if (user.role === 'school_admin') {
    const { data } = await supabase.from('courses').select('id').eq('id', courseId).eq('school_id', user.school_id).maybeSingle();
    return Boolean(data);
  }

  if (user.role === 'teacher') {
    // 1. Verificación directa en classes (horario asignado)
    const { data: cls } = await supabase.from('classes').select('id').eq('course_id', courseId).eq('teacher_id', user.id).limit(1);
    if (cls && cls.length > 0) return true;

    // 2. Verificación si el curso le pertenece o es del mismo colegio
    const { data: crs } = await supabase.from('courses').select('id, teacher_id, school_id').eq('id', courseId).maybeSingle();
    if (crs) {
      if (crs.teacher_id === user.id) return true;
      if (user.school_id && crs.school_id === user.school_id) return true;
    }
    return false;
  }
  return false;
}

async function verifyTokenAccess(supabase: any, user: any, tokenId: string): Promise<boolean> {
  if (user.role === 'super_admin') return true;

  const { data: tok } = await supabase
    .from('lab_tokens')
    .select('id, course_id, teacher_id, course:courses(school_id)')
    .or(`id.eq."${tokenId}",token_id.eq."${tokenId}"`)
    .maybeSingle();

  if (!tok) return false;

  if (user.role === 'teacher') {
    if (tok.teacher_id === user.id) return true;
    const course = Array.isArray(tok.course) ? tok.course[0] : tok.course;
    if (user.school_id && course?.school_id === user.school_id) return true;
    return false;
  }

  if (user.role === 'school_admin') {
    const course = Array.isArray(tok.course) ? tok.course[0] : tok.course;
    return course?.school_id === user.school_id;
  }

  return false;
}

// GET /api/teacher/labs?action=catalog
// GET /api/teacher/labs?action=tokens&courseId=X
// GET /api/teacher/labs?action=students&courseId=X
export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher', 'school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const courseId = url.searchParams.get('courseId');
    const supabase = auth.admin;

    // --- 1. Catálogo de simuladores disponibles ---
    if (action === 'catalog') {
      const { data, error } = await supabase
        .from('virtual_labs')
        .select('id, name, description, created_at')
        .order('name', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, labs: data || [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- 2. Tokens de lab asignados al curso ---
    if (action === 'tokens') {
      if (!courseId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta courseId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyCourseAccess(supabase, auth.user, courseId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para acceder a los tokens de este curso.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Desambiguación explícita con student:users!student_id para evitar error 500 de PostgREST
      const { data, error } = await supabase
        .from('lab_tokens')
        .select(`
          *,
          student:users!student_id(id, name, email, avatar_url, job_title),
          lab:virtual_labs(id, name)
        `)
        .eq('course_id', courseId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Agrupar por estudiante y lab: el más reciente es el activo/principal y los anteriores son el histórico
      const tokensByStudentLab = new Map<string, any[]>();
      for (const tok of (data || [])) {
        const key = `${tok.student_id}_${tok.lab_id}`;
        if (!tokensByStudentLab.has(key)) {
          tokensByStudentLab.set(key, []);
        }
        tokensByStudentLab.get(key)!.push(tok);
      }

      const deduplicated: any[] = [];
      for (const [, group] of tokensByStudentLab.entries()) {
        const primary = { ...group[0] };
        
        // Historial completo de todos los intentos del alumno ordenados por fecha
        const historyAttempts = group
          .filter((t: any) => t.status === 'completed' || t.tasks_completed > 0)
          .map((t: any, idx: number) => {
            let feedback: any = {};
            try {
              if (t.feedback_text) feedback = JSON.parse(t.feedback_text);
            } catch (_) {}
            return {
              id: t.id,
              tokenId: t.token_id,
              attemptNumber: group.length - idx,
              status: t.status,
              tasksCompleted: t.tasks_completed,
              tasksMissing: t.tasks_missing,
              timeSpentSeconds: t.time_spent_seconds,
              assignedAt: t.assigned_at,
              completedAt: t.completed_at,
              score: feedback?.score ?? (t.tasks_completed > 0 ? t.tasks_completed : 0),
              percentage: feedback?.percentage ?? 0,
              feedback,
              playMode: t.play_mode,
            };
          });

        primary.totalAttempts = group.length;
        primary.attemptHistory = historyAttempts;
        deduplicated.push(primary);
      }

      return new Response(JSON.stringify({ ok: true, tokens: deduplicated }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- 3. Alumnos matriculados en el curso ---
    if (action === 'students') {
      if (!courseId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta courseId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyCourseAccess(supabase, auth.user, courseId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para consultar estudiantes de este curso.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('course_students')
        .select(`
          student_id,
          student:users!student_id(id, name, email, avatar_url, job_title)
        `)
        .eq('course_id', courseId);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, students: data || [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- 4. Exportar reporte completo de laboratorio en formato Excel (.xlsx) profesional ---
    if (action === 'export_excel' || action === 'export_xlsx') {
      if (!courseId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta courseId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyCourseAccess(supabase, auth.user, courseId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para exportar datos de este curso.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: tokens, error } = await supabase
        .from('lab_tokens')
        .select(`
          *,
          student:users!student_id(id, name, email, document_id, job_title),
          course:courses(id, name, code),
          lab:virtual_labs(id, name)
        `)
        .eq('course_id', courseId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      const { data: courseData } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('id', courseId)
        .maybeSingle();

      const excelBuffer = await buildLabExcelReport(
        tokens || [],
        courseData || undefined,
        auth.user.name
      );

      const filename = `Reporte_Laboratorio_Quimica_${new Date().toISOString().slice(0, 10)}.xlsx`;

      return new Response(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache',
        },
      });
    }

    // --- 5. Exportar reporte completo de laboratorio en formato CSV ---
    if (action === 'export_csv') {
      if (!courseId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta courseId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyCourseAccess(supabase, auth.user, courseId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para exportar datos de este curso.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: tokens, error } = await supabase
        .from('lab_tokens')
        .select(`
          *,
          student:users!student_id(id, name, email, document_id, job_title),
          course:courses(id, name, code),
          lab:virtual_labs(id, name)
        `)
        .eq('course_id', courseId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Deduplicar tokens más recientes por estudiante
      const deduplicated: any[] = [];
      const seen = new Set<string>();
      for (const tok of (tokens || [])) {
        const key = `${tok.student_id}_${tok.lab_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicated.push(tok);
        }
      }

      // Helper para escapar celdas CSV
      const escapeCsv = (val: any) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      };

      const headers = [
        '#',
        'ID_ESTUDIANTE',
        'NOMBRE_ESTUDIANTE',
        'CORREO_ESTUDIANTE',
        'GRUPO_SALON',
        'ASIGNATURA',
        'CODIGO_ASIGNATURA',
        'LABORATORIO',
        'TOKEN_ACCESO',
        'ESTADO_PRACTICA',
        'MODALIDAD',
        'CALIFICACION_10',
        'EFECTIVIDAD_PCT',
        'MISIONES_LOGRADAS',
        'MISIONES_TOTALES',
        'TIEMPO_TOTAL_SEGUNDOS',
        'TIEMPO_FORMATEADO',
        'FECHA_FINALIZACION_SIMULACION',
        'ENCUESTA_RESPONDIDA',
        'ENCUESTA_COMPRENSION_5',
        'ENCUESTA_USABILIDAD_5',
        'ENCUESTA_MOTIVACION_5',
        'ENCUESTA_MISION_DESAFIANTE',
        'ENCUESTA_SUGERENCIAS',
        'FECHA_ENVIO_ENCUESTA',
        'OBSERVACION_DOCENTE',
      ];

      const rows = deduplicated.map((tok, idx) => {
        let parsedFeedback: any = {};
        try {
          if (tok.feedback_text && typeof tok.feedback_text === 'string' && tok.feedback_text.startsWith('{')) {
            parsedFeedback = JSON.parse(tok.feedback_text);
          }
        } catch (_) {}

        const student = tok.student || {};
        const course = tok.course || {};
        const lab = tok.lab || {};
        const survey = parsedFeedback.survey || {};
        const hasSurvey = Boolean(survey.submittedAt);
        const isDone = tok.status === 'completed' || hasSurvey;

        const tasksCompleted = tok.tasks_completed || 0;
        const tasksMissing = tok.tasks_missing || 0;
        const totalTasks = tasksCompleted + tasksMissing || (isDone ? 4 : 0);

        const score = parsedFeedback.score !== undefined
          ? parsedFeedback.score
          : (totalTasks > 0 ? ((tasksCompleted / totalTasks) * 10).toFixed(1) : (isDone ? '10.0' : ''));

        const percentage = parsedFeedback.percentage !== undefined
          ? `${parsedFeedback.percentage}%`
          : (totalTasks > 0 ? `${Math.round((tasksCompleted / totalTasks) * 100)}%` : (isDone ? '100%' : ''));

        const timeSpent = tok.time_spent_seconds || 0;
        const formattedTime = timeSpent > 0 ? `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s` : '';

        const teacherNote = typeof tok.feedback_text === 'string' && !tok.feedback_text.startsWith('{')
          ? tok.feedback_text
          : (parsedFeedback.legacyNote || '');

        const effectiveDevice = (
          survey.deviceUsed ||
          parsedFeedback.device ||
          parsedFeedback.playMode ||
          tok.play_mode ||
          'PC'
        ).toUpperCase();

        return [
          idx + 1,
          student.document_id || '',
          student.name || 'Estudiante',
          student.email || '',
          student.job_title || '',
          course.name || 'Química',
          course.code || 'QUI-101',
          lab.name || 'Laboratorio Virtual de Química',
          tok.token_id || tok.id,
          isDone ? 'COMPLETADO (CONSUMIDO)' : tok.status === 'in_progress' ? 'EN PARTIDA' : 'PENDIENTE',
          effectiveDevice,
          isDone ? score : '',
          isDone ? percentage : '',
          tasksCompleted,
          totalTasks,
          timeSpent,
          formattedTime,
          tok.completed_at ? new Date(tok.completed_at).toLocaleString('es-CO') : '',
          hasSurvey ? 'SI' : 'NO',
          survey.understandingScore || '',
          survey.usabilityScore || '',
          survey.motivationScore || '',
          survey.challengingMission || '',
          survey.suggestions || '',
          survey.submittedAt ? new Date(survey.submittedAt).toLocaleString('es-CO') : '',
          teacherNote,
        ].map(escapeCsv).join(',');
      });

      // UTF-8 BOM (\uFEFF) para máxima compatibilidad con Microsoft Excel y LibreOffice
      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const filename = `Reporte_Laboratorio_Quimica_${new Date().toISOString().slice(0, 10)}.csv`;

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion no reconocida. Usa: catalog, tokens, students, export_csv' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/teacher/labs]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// PATCH /api/teacher/labs
// { tokenId, feedbackText }
export const PATCH: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher', 'school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { tokenId, feedbackText } = body;

    if (!tokenId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta tokenId' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const hasAccess = await verifyTokenAccess(auth.admin, auth.user, tokenId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar este token.' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error } = await auth.admin
      .from('lab_tokens')
      .update({ feedback_text: feedbackText ?? '' })
      .eq('id', tokenId);

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[PATCH /api/teacher/labs]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// POST /api/teacher/labs
// { action: 'update_feedback', tokenId, feedbackText }
// { action: 'assign_batch', labId, courseId }
// { action: 'assign_single', labId, courseId, studentId }
// { action: 'refresh_token', tokenId }
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher', 'school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const supabase = auth.admin;

    // --- 1. Actualizar feedback de un token ---
    if (action === 'update_feedback') {
      const { tokenId, feedbackText } = body;
      if (!tokenId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta tokenId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyTokenAccess(supabase, auth.user, tokenId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar este token.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('lab_tokens')
        .update({ feedback_text: feedbackText ?? '' })
        .eq('id', tokenId);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- 2. Asignar lab en batch a todos los alumnos del curso ---
    if (action === 'assign_batch') {
      const { labId, courseId } = body;
      if (!labId || !courseId) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan labId o courseId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyCourseAccess(supabase, auth.user, courseId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para asignar laboratorios a este curso.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validar que el laboratorio virtual solo se asigne a Química
      const { data: crsCheck } = await supabase
        .from('courses')
        .select('name, code')
        .eq('id', courseId)
        .maybeSingle();

      const isChem = Boolean(
        crsCheck?.name?.toLowerCase().includes('química') ||
        crsCheck?.name?.toLowerCase().includes('quimica') ||
        crsCheck?.code?.toUpperCase().includes('QUI')
      );

      if (!isChem) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'El Laboratorio Virtual está habilitado exclusivamente para la asignatura de Química.',
        }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Obtener alumnos matriculados en el curso
      const { data: studentsData, error: studErr } = await supabase
        .from('course_students')
        .select('student_id')
        .eq('course_id', courseId);

      if (studErr) throw studErr;
      let studentIds = (studentsData || []).map((s: any) => s.student_id);

      // Si no hay alumnos en course_students, auto-sincronizar
      if (studentIds.length === 0) {
        const { data: crsData } = await supabase
          .from('courses')
          .select('school_id')
          .eq('id', courseId)
          .maybeSingle();

        const schoolId = crsData?.school_id || auth.user.school_id;

        // Buscar salones del curso en classes
        const { data: cls } = await supabase.from('classes').select('classroom').eq('course_id', courseId);
        const classrooms = Array.from(new Set((cls || []).map((c: any) => c.classroom).filter(Boolean)));

        let stdQuery = supabase
          .from('users')
          .select('id')
          .eq('school_id', schoolId)
          .eq('role', 'student');

        if (classrooms.length > 0) {
          stdQuery = stdQuery.in('job_title', classrooms);
        }

        const { data: stds } = await stdQuery;

        if (stds && stds.length > 0) {
          const enrollments = stds.map((s: any) => ({
            course_id: courseId,
            student_id: s.id,
            status: 'enrolled',
          }));
          await supabase.from('course_students').upsert(enrollments, { onConflict: 'course_id,student_id' });
          studentIds = stds.map((s: any) => s.id);
        }
      }

      if (studentIds.length === 0) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'No se encontraron estudiantes matriculados en este curso o institución.',
        }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Consultar tokens existentes para estos estudiantes en este curso y laboratorio
      const { data: existingTokens } = await supabase
        .from('lab_tokens')
        .select('id, student_id, status')
        .eq('lab_id', labId)
        .eq('course_id', courseId)
        .in('student_id', studentIds);

      const existingByStudent = new Map((existingTokens || []).map((t: any) => [t.student_id, t]));
      const tokensToInsert: any[] = [];
      const tokensToUpdate: string[] = [];

      for (const sId of studentIds) {
        const existing = existingByStudent.get(sId);
        if (existing && existing.status === 'pending') {
          // Si ya tiene un token pendiente, regeneramos su token_id (JWT único fresco)
          tokensToUpdate.push(existing.id);
        } else {
          // Si no tiene token o ya lo terminó, creamos uno nuevo
          tokensToInsert.push({
            lab_id: labId,
            course_id: courseId,
            student_id: sId,
            teacher_id: auth.user.id,
            token_id: crypto.randomUUID(),
            status: 'pending',
            play_mode: 'PC',
            tasks_completed: 0,
            tasks_missing: 0,
            time_spent_seconds: 0,
            assigned_at: new Date().toISOString(),
          });
        }
      }

      // 1. Refrescar los pendientes existentes
      if (tokensToUpdate.length > 0) {
        for (const tId of tokensToUpdate) {
          await supabase
            .from('lab_tokens')
            .update({
              token_id: crypto.randomUUID(),
              assigned_at: new Date().toISOString(),
              started_at: null,
              completed_at: null,
              tasks_completed: 0,
              tasks_missing: 0,
              time_spent_seconds: 0,
            })
            .eq('id', tId);
        }
      }

      // 2. Insertar los nuevos
      let insertedRecords: any[] = [];
      if (tokensToInsert.length > 0) {
        const { data: insData, error: insErr } = await supabase
          .from('lab_tokens')
          .insert(tokensToInsert)
          .select();

        if (insErr) throw insErr;
        insertedRecords = insData || [];
      }

      return new Response(
        JSON.stringify({
          ok: true,
          assignedCount: studentIds.length,
          newCount: tokensToInsert.length,
          refreshedCount: tokensToUpdate.length,
          message: `Laboratorio asignado con éxito a ${studentIds.length} estudiante(s). Tokens listos.`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // --- 3. Asignar lab a un solo estudiante ---
    if (action === 'assign_single') {
      const { labId, courseId, studentId } = body;
      if (!labId || !courseId || !studentId) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan labId, courseId o studentId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyCourseAccess(supabase, auth.user, courseId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para asignar laboratorios a este curso.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Validar que el laboratorio virtual solo se asigne a Química
      const { data: crsCheck } = await supabase
        .from('courses')
        .select('name, code')
        .eq('id', courseId)
        .maybeSingle();

      const isChem = Boolean(
        crsCheck?.name?.toLowerCase().includes('química') ||
        crsCheck?.name?.toLowerCase().includes('quimica') ||
        crsCheck?.code?.toUpperCase().includes('QUI')
      );

      if (!isChem) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'El Laboratorio Virtual está habilitado exclusivamente para la asignatura de Química.',
        }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Generar nuevo token único
      const newTokenId = crypto.randomUUID();
      const { data: token, error: insErr } = await supabase
        .from('lab_tokens')
        .insert({
          lab_id: labId,
          course_id: courseId,
          student_id: studentId,
          teacher_id: auth.user.id,
          token_id: newTokenId,
          status: 'pending',
          play_mode: 'PC',
          tasks_completed: 0,
          tasks_missing: 0,
          time_spent_seconds: 0,
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insErr) throw insErr;

      return new Response(JSON.stringify({
        ok: true,
        message: 'Token de laboratorio generado con éxito.',
        token,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- 4. Refrescar/Reactivar Token para nuevo intento ---
    if (action === 'refresh_token') {
      const { tokenId } = body;
      if (!tokenId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta tokenId' }), {
          status: 400, headers: { 'Content-Type': 'application/json' },
        });
      }

      const hasAccess = await verifyTokenAccess(supabase, auth.user, tokenId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para refrescar este token.' }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      // Buscar el token completo existente por id o token_id
      const { data: targetToken, error: searchErr } = await supabase
        .from('lab_tokens')
        .select(`
          *,
          student:users!student_id(id, name, email, avatar_url, job_title),
          lab:virtual_labs(id, name)
        `)
        .or(`id.eq."${tokenId}",token_id.eq."${tokenId}"`)
        .maybeSingle();

      if (searchErr || !targetToken) {
        return new Response(JSON.stringify({ ok: false, error: 'Token no encontrado.' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }

      const newTokenId = crypto.randomUUID();
      let activeTokenResult: any = null;

      // ── PROTECCIÓN Y AUDITORÍA DE HISTORIAL ─────────────────────────
      // Si el intento ya fue completado (o tiene progreso previo), NUNCA SE SOBREESCRIBE.
      // Se conserva la fila completada intacta y se INSERTA una nueva fila para el nuevo intento.
      if (targetToken.status === 'completed' || targetToken.tasks_completed > 0) {
        const { data: inserted, error: insErr } = await supabase
          .from('lab_tokens')
          .insert({
            lab_id: targetToken.lab_id,
            course_id: targetToken.course_id,
            student_id: targetToken.student_id,
            teacher_id: auth.user.id,
            token_id: newTokenId,
            status: 'pending',
            play_mode: targetToken.play_mode || 'PC',
            tasks_completed: 0,
            tasks_missing: 0,
            time_spent_seconds: 0,
            assigned_at: new Date().toISOString(),
          })
          .select(`
            *,
            student:users!student_id(id, name, email, avatar_url, job_title),
            lab:virtual_labs(id, name)
          `)
          .single();

        if (insErr) throw insErr;
        activeTokenResult = inserted;
      } else {
        // Si el token aún estaba 'pending' y nunca se inició, solo renovamos su token_id
        const { data: updated, error: refErr } = await supabase
          .from('lab_tokens')
          .update({
            token_id: newTokenId,
            status: 'pending',
            tasks_completed: 0,
            tasks_missing: 0,
            time_spent_seconds: 0,
            completed_at: null,
            feedback_text: null,
            assigned_at: new Date().toISOString(),
          })
          .eq('id', targetToken.id)
          .select(`
            *,
            student:users!student_id(id, name, email, avatar_url, job_title),
            lab:virtual_labs(id, name)
          `)
          .maybeSingle();

        if (refErr) throw refErr;
        activeTokenResult = updated;
      }

      const studentName = targetToken?.student?.name || activeTokenResult?.student?.name || 'el estudiante';

      return new Response(JSON.stringify({
        ok: true,
        message: `Token reactivado con éxito para ${studentName}. Nuevo intento habilitado en su portal sin borrar el historial anterior.`,
        newTokenId,
        token: activeTokenResult,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion no reconocida. Usa: update_feedback, assign_batch, assign_single, refresh_token' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[POST /api/teacher/labs]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};