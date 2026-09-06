import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

async function provisionStudentUser(supabase: any, email: string, name: string, schoolId: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = userList?.users?.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);
    if (existing) return existing.id;
  } catch (_) {}

  const tempPassword = 'Est' + Math.random().toString(36).slice(-6) + '!*';
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      name: name.trim(),
      role: 'student',
      school_id: schoolId,
    },
  });

  if (createErr) {
    const { data: dbUser } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
    if (dbUser?.id) return dbUser.id;
    throw createErr;
  }

  return created.user.id;
}

async function executeStudentTransfer(supabase: any, studentId: string, targetGroup: string) {
  // Intentar primero RPC si está disponible en la base de datos
  const { error: rpcErr } = await supabase.rpc('transfer_student', {
    p_student_id: studentId,
    p_target_group: targetGroup,
  });

  if (!rpcErr) return;

  // Fallback nativo en TypeScript:
  const { data: student, error: stdErr } = await supabase
    .from('users')
    .select('id, school_id')
    .eq('id', studentId)
    .single();

  if (stdErr || !student) throw stdErr || new Error('Estudiante no encontrado');

  // 1. Actualizar grupo
  await supabase.from('users').update({ job_title: targetGroup }).eq('id', studentId);

  // 2. Eliminar matrículas anteriores
  await supabase.from('course_students').delete().eq('student_id', studentId);

  // 3. Matricular en los cursos del nuevo grupo
  const { data: newCourses } = await supabase
    .from('courses')
    .select('id')
    .eq('school_id', student.school_id)
    .eq('grade_level', targetGroup);

  if (Array.isArray(newCourses) && newCourses.length > 0) {
    const enrollments = newCourses.map((c: any) => ({
      course_id: c.id,
      student_id: studentId,
      status: 'enrolled',
    }));
    await supabase.from('course_students').upsert(enrollments, { onConflict: 'course_id,student_id' });
  }
}

async function executeStudentDelete(supabase: any, studentId: string) {
  // Intentar primero RPC si existe
  const { error: rpcErr } = await supabase.rpc('delete_user_completely', {
    p_user_id: studentId,
  });

  if (!rpcErr) return;

  // Fallback nativo:
  await supabase.from('course_students').delete().eq('student_id', studentId);
  try { await supabase.from('grades').delete().eq('student_id', studentId); } catch (_) {}
  try { await supabase.from('attendances').delete().eq('student_id', studentId); } catch (_) {}
  await supabase.from('users').delete().eq('id', studentId);
  try { await supabase.auth.admin.deleteUser(studentId); } catch (_) {}
}

async function verifyStudentBelongsToSchool(supabase: any, studentId: string, schoolId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .eq('role', 'student')
    .maybeSingle();
  return Boolean(data);
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const requestedSchoolId = url.searchParams.get('schoolId');
    const targetSchoolId = auth.user.role === 'school_admin' ? auth.user.school_id : (requestedSchoolId || auth.user.school_id);

    if (auth.user.role === 'school_admin' && requestedSchoolId && requestedSchoolId !== auth.user.school_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para consultar estudiantes de otra institución.' }), { status: 403 });
    }

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Escuela no asociada.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: students, error } = await auth.admin
      .from('users')
      .select('*, school:schools(id,name)')
      .eq('school_id', targetSchoolId)
      .eq('role', 'student')
      .order('name', { ascending: true });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, data: students || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/school-admin/students]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;
    const supabase = auth.admin;

    // Compatibilidad: resend_invitation
    if (action === 'resend_invitation') {
      const { email, name, schoolId } = body;
      const targetSchoolId = auth.user.role === 'school_admin' ? auth.user.school_id : (schoolId || auth.user.school_id);
      if (!email || !targetSchoolId) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios.' }), { status: 400 });
      }

      await provisionStudentUser(supabase, email, name || 'Estudiante', targetSchoolId);
      return new Response(JSON.stringify({ ok: true, message: 'Invitación procesada.' }), { status: 200 });
    }

    // Compatibilidad: update
    if (action === 'update') {
      const { studentId, name, documentId, email } = body;
      if (!studentId) {
        return new Response(JSON.stringify({ ok: false, error: 'studentId es obligatorio' }), { status: 400 });
      }

      if (auth.user.role === 'school_admin') {
        const belongs = await verifyStudentBelongsToSchool(supabase, studentId, auth.user.school_id);
        if (!belongs) {
          return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar este estudiante.' }), { status: 403 });
        }
      }

      const { error: dbUpdateError } = await supabase.from('users').update({
        name,
        document_id: documentId,
        email,
      }).eq('id', studentId);

      if (dbUpdateError) throw dbUpdateError;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Compatibilidad: transfer
    if (action === 'transfer') {
      const { studentId, targetGroup } = body;
      if (!studentId || !targetGroup) {
        return new Response(JSON.stringify({ ok: false, error: 'studentId y targetGroup son obligatorios' }), { status: 400 });
      }

      if (auth.user.role === 'school_admin') {
        const belongs = await verifyStudentBelongsToSchool(supabase, studentId, auth.user.school_id);
        if (!belongs) {
          return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para transferir este estudiante.' }), { status: 403 });
        }
      }

      await executeStudentTransfer(supabase, studentId, targetGroup);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Compatibilidad: delete
    if (action === 'delete') {
      const { studentId } = body;
      if (!studentId) {
        return new Response(JSON.stringify({ ok: false, error: 'studentId es obligatorio' }), { status: 400 });
      }

      if (auth.user.role === 'school_admin') {
        const belongs = await verifyStudentBelongsToSchool(supabase, studentId, auth.user.school_id);
        if (!belongs) {
          return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para eliminar este estudiante.' }), { status: 403 });
        }
      }

      await executeStudentDelete(supabase, studentId);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Accion no reconocida.' }), { status: 400 });
  } catch (err: any) {
    console.error('[POST /api/school-admin/students]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { studentId, name, documentId, email, targetGroup } = body;

    if (!studentId) {
      return new Response(JSON.stringify({ ok: false, error: 'studentId es obligatorio' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin') {
      const belongs = await verifyStudentBelongsToSchool(auth.admin, studentId, auth.user.school_id);
      if (!belongs) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar este estudiante.' }), { status: 403 });
      }
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (documentId !== undefined) updates.document_id = documentId;
    if (email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      const { error } = await auth.admin.from('users').update(updates).eq('id', studentId);
      if (error) throw error;
    }

    if (targetGroup) {
      await executeStudentTransfer(auth.admin, studentId, targetGroup);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};

export const PATCH = PUT;

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const studentId = url.searchParams.get('id') || (await request.json().catch(() => ({})))?.studentId;

    if (!studentId) {
      return new Response(JSON.stringify({ ok: false, error: 'studentId es requerido para eliminar' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin') {
      const belongs = await verifyStudentBelongsToSchool(auth.admin, studentId, auth.user.school_id);
      if (!belongs) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para eliminar este estudiante.' }), { status: 403 });
      }
    }

    await executeStudentDelete(auth.admin, studentId);
    return new Response(JSON.stringify({ ok: true, message: 'Estudiante eliminado correctamente' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};