import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

async function verifyCourseAccess(supabase: any, user: any, courseId: string): Promise<boolean> {
  if (user.role === 'super_admin') return true;
  if (user.role === 'school_admin') {
    const { data } = await supabase.from('courses').select('id').eq('id', courseId).eq('school_id', user.school_id).maybeSingle();
    return Boolean(data);
  }
  if (user.role === 'teacher') {
    const { data } = await supabase.from('classes').select('id').eq('course_id', courseId).eq('teacher_id', user.id).limit(1);
    return Boolean(data && data.length > 0);
  }
  return false;
}

// GET /api/teacher/labs?action=catalog
// GET /api/teacher/labs?action=tokens&courseId=X
export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher', 'school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const courseId = url.searchParams.get('courseId');
    const supabase = auth.admin;

    // --- Catalogo de labs ---
    if (action === 'catalog') {
      const { data, error } = await supabase
        .from('virtual_labs')
        .select('id, name, description, subject, grade_level, thumbnail_url')
        .order('name', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, labs: data || [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Tokens de lab asignados al curso ---
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

      const { data, error } = await supabase
        .from('lab_tokens')
        .select('*, student:users(name, avatar_url)')
        .eq('course_id', courseId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, tokens: data || [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // --- Alumnos del curso ---
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
        .select('student_id')
        .eq('course_id', courseId);

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, students: data || [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion no reconocida. Usa: catalog, tokens, students' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/teacher/labs]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function verifyTokenAccess(supabase: any, user: any, tokenId: string): Promise<boolean> {
  if (user.role === 'super_admin') return true;
  const { data: tok } = await supabase
    .from('lab_tokens')
    .select('id, course_id, teacher_id, course:courses(school_id)')
    .eq('id', tokenId)
    .maybeSingle();

  if (!tok) return false;
  if (user.role === 'teacher') {
    return tok.teacher_id === user.id;
  }
  if (user.role === 'school_admin') {
    const course = Array.isArray(tok.course) ? tok.course[0] : tok.course;
    return course?.school_id === user.school_id;
  }
  return false;
}

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
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['teacher', 'school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const supabase = auth.admin;

    // --- Actualizar feedback de un token ---
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

    // --- Asignar lab en batch a todos los alumnos del curso ---
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

      // Obtener alumnos del curso
      const { data: studentsData, error: studErr } = await supabase
        .from('course_students')
        .select('student_id')
        .eq('course_id', courseId);

      if (studErr) throw studErr;
      if (!studentsData || studentsData.length === 0) {
        return new Response(JSON.stringify({ ok: false, error: 'No hay estudiantes en este curso.' }), {
          status: 404, headers: { 'Content-Type': 'application/json' },
        });
      }

      const studentIds = studentsData.map((s: any) => s.student_id);

      // Intentar RPC assign_lab_batch con fallback nativo en servidor
      let result = null;
      try {
        const { data, error } = await supabase.rpc('assign_lab_batch', {
          p_lab_id: labId,
          p_course_id: courseId,
          p_student_ids: studentIds,
        });
        if (error) throw error;
        result = data;
      } catch (rpcErr) {
        console.warn('[POST /api/teacher/labs] RPC assign_lab_batch failed, falling back to direct insertion:', rpcErr);
        const tokensToInsert = studentIds.map((studentId: string) => ({
          lab_id: labId,
          course_id: courseId,
          student_id: studentId,
          teacher_id: auth.user.id,
          status: 'pending',
        }));
        const { data: inserted, error: insErr } = await supabase
          .from('lab_tokens')
          .insert(tokensToInsert)
          .select();
        if (insErr) throw insErr;
        result = inserted;
      }

      return new Response(
        JSON.stringify({ ok: true, assignedCount: studentIds.length, result }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion no reconocida. Usa: update_feedback, assign_batch' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[POST /api/teacher/labs]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};