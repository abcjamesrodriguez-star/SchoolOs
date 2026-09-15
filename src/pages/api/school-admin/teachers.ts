import type { APIRoute } from 'astro';
import { requireAuth, getPublicSiteUrl } from '../../../lib/apiAuth';

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function provisionTeacherUser(
  supabase: any,
  email: string,
  name: string,
  schoolId: string,
  siteUrl: string,
  avatarUrl?: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const redirectTo = `${siteUrl}/cambiar-password`;
  
  // 1. Verificar si ya existe en Supabase Auth
  let existingAuthUser: any = null;
  try {
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    existingAuthUser = userList?.users?.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);
  } catch (listErr) {
    console.warn('[provisionTeacherUser] Error consultando listUsers:', listErr);
  }

  // Si existe en Auth pero NO está confirmado (por ejemplo, re-registro tras borrado, o token caducado),
  // eliminamos el usuario obsoleto para generar una invitación 100% limpia y sin tokens caducados.
  if (existingAuthUser && !existingAuthUser.confirmed_at) {
    try {
      await supabase.auth.admin.deleteUser(existingAuthUser.id);
      existingAuthUser = null;
    } catch (delErr) {
      console.warn('[provisionTeacherUser] Error eliminando auth user previo no confirmado:', delErr);
    }
  }

  if (existingAuthUser) {
    // Si ya está confirmado previamente, enviamos correo de recuperación/acceso
    try {
      await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    } catch (resetErr) {
      console.warn('[provisionTeacherUser] Error enviando reset password:', resetErr);
    }
    return existingAuthUser.id;
  }

  // 2. Invitar nativamente con Supabase Auth (despacha correo por Supabase SMTP)
  const { data: created, error: createErr } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    data: {
      name: name.trim(),
      role: 'teacher',
      school_id: schoolId,
      avatar_url: avatarUrl || null,
    },
    redirectTo,
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
    let targetSchoolId = auth.user.role === 'school_admin' ? auth.user.school_id : (requestedSchoolId || auth.user.school_id);

    // Si es super_admin y pasó un slug, resolver al UUID correspondiente
    if (targetSchoolId && !targetSchoolId.includes('-')) {
      const { data: s } = await auth.admin.from('schools').select('id').eq('slug', targetSchoolId).maybeSingle();
      if (s?.id) targetSchoolId = s.id;
    }

    if (!targetSchoolId) {
      return json({ ok: false, error: 'Falta schoolId' }, 400);
    }

    const { data, error } = await auth.admin
      .from('users')
      .select('id, name, email, specialty, job_title, document_id, avatar_url, phone, status, role')
      .eq('school_id', targetSchoolId)
      .eq('role', 'teacher')
      .order('name', { ascending: true });

    if (error) throw error;
    console.log(`[API /teachers GET] user=${auth.user.email} role=${auth.user.role} schoolId=${auth.user.school_id} target=${targetSchoolId} found=${data?.length}`);
    return json({ ok: true, data: data || [], teachers: data || [] }, 200);
  } catch (err: any) {
    return json({ ok: false, error: err?.message || 'Error interno' }, 500);
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
        return json({ ok: false, error: 'Faltan campos obligatorios.' }, 400);
      }

      const siteUrl = getPublicSiteUrl(request);
      await provisionTeacherUser(supabase, email, name || 'Docente', targetSchoolId, siteUrl);
      return json({ ok: true, message: 'Invitación oficial reenviada vía Supabase SMTP.' }, 200);
    }

    // Compatibilidad: update
    if (action === 'update') {
      const { teacherId, name, teacherCode, avatarUrl, specialty, jobTitle, phone } = body;
      if (!teacherId) {
        return json({ ok: false, error: 'teacherId es obligatorio' }, 400);
      }

      if (auth.user.role === 'school_admin') {
        const belongs = await verifyTeacherBelongsToSchool(supabase, teacherId, auth.user.school_id);
        if (!belongs) {
          return json({ ok: false, error: 'No tienes permisos para modificar este docente.' }, 403);
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
      return json({ ok: true }, 200);
    }

    // Compatibilidad: manage_status
    if (action === 'manage_status') {
      const { teacherId, isDelete, newStatus } = body;
      if (!teacherId) {
        return json({ ok: false, error: 'teacherId es obligatorio' }, 400);
      }

      if (auth.user.role === 'school_admin') {
        const belongs = await verifyTeacherBelongsToSchool(supabase, teacherId, auth.user.school_id);
        if (!belongs) {
          return json({ ok: false, error: 'No tienes permisos para gestionar este docente.' }, 403);
        }
      }

      if (isDelete) {
        // Obtener email del docente para purga limpia en Auth
        const { data: teacherUser } = await supabase.from('users').select('email').eq('id', teacherId).maybeSingle();

        await supabase.from('classes').delete().eq('teacher_id', teacherId);
        await supabase.from('users').delete().eq('id', teacherId);
        try { await supabase.auth.admin.deleteUser(teacherId); } catch (_) {}

        if (teacherUser?.email) {
          try {
            const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const matchingAuth = authList?.users?.filter((u: any) => (u.email || '').toLowerCase() === teacherUser.email.toLowerCase()) || [];
            for (const mu of matchingAuth) {
              await supabase.auth.admin.deleteUser(mu.id);
            }
          } catch (_) {}
        }
      } else {
        await supabase.from('users').update({ status: newStatus || 'active' }).eq('id', teacherId);
      }
      return json({ ok: true }, 200);
    }

    // Creación estándar de docente (action === 'create' o POST REST)
    const { email, name, schoolId, teacherCode, avatarUrl, specialty, jobTitle, phone } = body;
    const targetSchoolId = auth.user.role === 'school_admin' ? auth.user.school_id : (schoolId || auth.user.school_id);

    if (auth.user.role === 'school_admin' && schoolId && schoolId !== auth.user.school_id) {
      return json({ ok: false, error: 'No puedes crear docentes en otra institución.' }, 403);
    }

    if (!email || !name || !targetSchoolId) {
      return json({ ok: false, error: 'Faltan campos obligatorios (email, name, schoolId).' }, 400);
    }

    // Aprovisionar nativamente en Supabase Auth con invitación oficial
    const siteUrl = getPublicSiteUrl(request);
    const targetUserId = await provisionTeacherUser(supabase, email, name, targetSchoolId, siteUrl, avatarUrl);

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
      password_reset_required: true,
    }, { onConflict: 'id' });

    if (dbError) throw dbError;
    return json({ ok: true, userId: targetUserId }, 200);
  } catch (err: any) {
    console.error('[POST /api/school-admin/teachers]', err);
    return json({ ok: false, error: err?.message || 'Error interno' }, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { teacherId, name, teacherCode, avatarUrl, specialty, jobTitle, phone, status } = body;

    if (!teacherId) {
      return json({ ok: false, error: 'teacherId es obligatorio' }, 400);
    }

    if (auth.user.role === 'school_admin') {
      const belongs = await verifyTeacherBelongsToSchool(auth.admin, teacherId, auth.user.school_id);
      if (!belongs) {
        return json({ ok: false, error: 'No tienes permisos para modificar este docente.' }, 403);
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

    return json({ ok: true }, 200);
  } catch (err: any) {
    return json({ ok: false, error: err?.message || 'Error interno' }, 500);
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
      return json({ ok: false, error: 'teacherId es requerido para eliminar' }, 400);
    }

    if (auth.user.role === 'school_admin') {
      const belongs = await verifyTeacherBelongsToSchool(auth.admin, teacherId, auth.user.school_id);
      if (!belongs) {
        return json({ ok: false, error: 'No tienes permisos para eliminar este docente.' }, 403);
      }
    }

    const supabase = auth.admin;
    const { data: teacherUser } = await supabase.from('users').select('email').eq('id', teacherId).maybeSingle();

    await supabase.from('classes').delete().eq('teacher_id', teacherId);
    await supabase.from('users').delete().eq('id', teacherId);
    try { await supabase.auth.admin.deleteUser(teacherId); } catch (_) {}

    if (teacherUser?.email) {
      try {
        const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const matchingAuth = authList?.users?.filter((u: any) => (u.email || '').toLowerCase() === teacherUser.email.toLowerCase()) || [];
        for (const mu of matchingAuth) {
          await supabase.auth.admin.deleteUser(mu.id);
        }
      } catch (_) {}
    }

    return json({ ok: true, message: 'Docente eliminado correctamente' }, 200);
  } catch (err: any) {
    return json({ ok: false, error: err?.message || 'Error interno' }, 500);
  }
};