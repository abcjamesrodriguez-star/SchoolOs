import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

async function provisionTeacherUser(supabase: any, email: string, name: string, schoolId: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  
  // 1. Verificar si ya existe en Supabase Auth
  try {
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existing = userList?.users?.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);
    if (existing) {
      return existing.id;
    }
  } catch (_) {}

  // 2. Crear cuenta auth con contraseña temporal
  const tempPassword = 'Docente' + Math.random().toString(36).slice(-6) + '!*';
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      name: name.trim(),
      role: 'teacher',
      school_id: schoolId,
    },
  });

  if (createErr) {
    // Si ya existe por colisión, buscarlo en public.users
    const { data: dbUser } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
    if (dbUser?.id) return dbUser.id;
    throw createErr;
  }

  return created.user.id;
}

async function verifyTeacherBelongsToSchool(supabase: any, teacherId: string, schoolId: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('id', teacherId)
    .eq('school_id', schoolId)
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
      return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para consultar docentes de otra institución.' }), { status: 403 });
    }

    if (!targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    const { data, error } = await auth.admin
      .from('users')
      .select('id, name, email, specialty, job_title, document_id, avatar_url, phone, status')
      .eq('school_id', targetSchoolId)
      .eq('role', 'teacher')
      .order('name', { ascending: true });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, data: data || [] }), { status: 200 });
  } catch (err: any) {
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

    // Compatibilidad: resend_invitation
    if (action === 'resend_invitation') {
      const { email, name, schoolId } = body;
      const targetSchoolId = auth.user.role === 'school_admin' ? auth.user.school_id : (schoolId || auth.user.school_id);
      if (!email || !targetSchoolId) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios.' }), { status: 400 });
      }

      await provisionTeacherUser(supabase, email, name || 'Docente', targetSchoolId);
      return new Response(JSON.stringify({ ok: true, message: 'Invitación procesada.' }), { status: 200 });
    }

    // Compatibilidad: update
    if (action === 'update') {
      const { teacherId, name, teacherCode, avatarUrl, specialty, jobTitle, phone } = body;
      if (!teacherId) {
        return new Response(JSON.stringify({ ok: false, error: 'teacherId es obligatorio' }), { status: 400 });
      }

      if (auth.user.role === 'school_admin') {
        const belongs = await verifyTeacherBelongsToSchool(supabase, teacherId, auth.user.school_id);
        if (!belongs) {
          return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar este docente.' }), { status: 403 });
        }
      }

      const { error: dbUpdateError } = await supabase.from('users').update({
        name,
        document_id: teacherCode,
        avatar_url: avatarUrl,
        specialty,
        job_title: jobTitle,
        phone,
      }).eq('id', teacherId);

      if (dbUpdateError) throw dbUpdateError;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Compatibilidad: manage_status
    if (action === 'manage_status') {
      const { teacherId, isDelete, newStatus } = body;
      if (!teacherId) {
        return new Response(JSON.stringify({ ok: false, error: 'teacherId es obligatorio' }), { status: 400 });
      }

      if (auth.user.role === 'school_admin') {
        const belongs = await verifyTeacherBelongsToSchool(supabase, teacherId, auth.user.school_id);
        if (!belongs) {
          return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para gestionar este docente.' }), { status: 403 });
        }
      }

      if (isDelete) {
        await supabase.from('classes').delete().eq('teacher_id', teacherId);
        await supabase.from('users').delete().eq('id', teacherId);
        try { await supabase.auth.admin.deleteUser(teacherId); } catch (_) {}
      } else {
        await supabase.from('users').update({ status: newStatus || 'active' }).eq('id', teacherId);
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    // Creación estándar de docente (action === 'create' o POST REST)
    const { email, name, schoolId, teacherCode, avatarUrl, specialty, jobTitle, phone } = body;
    const targetSchoolId = auth.user.role === 'school_admin' ? auth.user.school_id : (schoolId || auth.user.school_id);

    if (auth.user.role === 'school_admin' && schoolId && schoolId !== auth.user.school_id) {
      return new Response(JSON.stringify({ ok: false, error: 'No puedes crear docentes en otra institución.' }), { status: 403 });
    }

    if (!email || !name || !targetSchoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios (email, name, schoolId).' }), { status: 400 });
    }

    // Aprovisionar nativamente en Supabase Auth sin depender de Edge Functions externas
    const targetUserId = await provisionTeacherUser(supabase, email, name, targetSchoolId);

    // Guardar perfil docente en public.users
    const { error: dbError } = await supabase.from('users').upsert({
      id: targetUserId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role: 'teacher',
      school_id: targetSchoolId,
      document_type: 'DOC',
      document_id: teacherCode || null,
      avatar_url: avatarUrl || null,
      specialty: specialty || null,
      job_title: jobTitle || 'Docente',
      phone: phone || null,
      status: 'invited',
    }, { onConflict: 'id' });

    if (dbError) throw dbError;
    return new Response(JSON.stringify({ ok: true, userId: targetUserId }), { status: 200 });
  } catch (err: any) {
    console.error('[POST /api/school-admin/teachers]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { teacherId, name, teacherCode, avatarUrl, specialty, jobTitle, phone, status } = body;

    if (!teacherId) {
      return new Response(JSON.stringify({ ok: false, error: 'teacherId es obligatorio' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin') {
      const belongs = await verifyTeacherBelongsToSchool(auth.admin, teacherId, auth.user.school_id);
      if (!belongs) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para modificar este docente.' }), { status: 403 });
      }
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (teacherCode !== undefined) updates.document_id = teacherCode;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;
    if (specialty !== undefined) updates.specialty = specialty;
    if (jobTitle !== undefined) updates.job_title = jobTitle;
    if (phone !== undefined) updates.phone = phone;
    if (status) updates.status = status;

    const { error } = await auth.admin.from('users').update(updates).eq('id', teacherId);
    if (error) throw error;

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
    const teacherId = url.searchParams.get('id') || (await request.json().catch(() => ({})))?.teacherId;

    if (!teacherId) {
      return new Response(JSON.stringify({ ok: false, error: 'teacherId es requerido para eliminar' }), { status: 400 });
    }

    if (auth.user.role === 'school_admin') {
      const belongs = await verifyTeacherBelongsToSchool(auth.admin, teacherId, auth.user.school_id);
      if (!belongs) {
        return new Response(JSON.stringify({ ok: false, error: 'No tienes permisos para eliminar este docente.' }), { status: 403 });
      }
    }

    await auth.admin.from('classes').delete().eq('teacher_id', teacherId);
    await auth.admin.from('users').delete().eq('id', teacherId);
    try { await auth.admin.auth.admin.deleteUser(teacherId); } catch (_) {}

    return new Response(JSON.stringify({ ok: true, message: 'Docente eliminado correctamente' }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};