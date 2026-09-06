export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const DELETE: APIRoute = async ({ request }) => {
  try {
    // 🛡️ REQUISITO DE SEGURIDAD: Solo Super Admin o School Admin pueden eliminar usuarios
    const auth = await requireAuth(request, ['super_admin', 'school_admin']);
    if (!auth.ok) {
      return auth.response;
    }

    const supabase = auth.admin;
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const url = new URL(request.url);
    const userId = body.userId || body.id || url.searchParams.get('userId') || url.searchParams.get('id');
    const email = body.email || url.searchParams.get('email');

    if (!userId && !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Se requiere userId o email para eliminar.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Obtener perfil de usuario si existe
    let targetUserId = userId;
    let targetEmail = email ? email.trim().toLowerCase() : null;
    let targetProfile: any = null;

    if (targetUserId) {
      const { data: u } = await supabase.from('users').select('*').eq('id', targetUserId).maybeSingle();
      if (u) {
        targetProfile = u;
        targetEmail = targetEmail || u.email;
      }
    } else if (targetEmail) {
      const { data: u } = await supabase.from('users').select('*').eq('email', targetEmail).maybeSingle();
      if (u) {
        targetProfile = u;
        targetUserId = u.id;
      }
    }

    // 2. Si no se encontró por tabla users, buscar en auth.users
    if (!targetUserId) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const found = listData?.users?.find(
        (u) => (targetEmail && u.email === targetEmail) || (userId && u.id === userId)
      );
      if (found) {
        targetUserId = found.id;
        targetEmail = targetEmail || found.email;
      }
    }

    if (!targetUserId && !targetEmail) {
      return new Response(JSON.stringify({ ok: false, error: 'Usuario no encontrado en el sistema.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Validaciones de Autorización por Rol (Control de Acceso Basado en Roles)
    if (auth.user.role === 'school_admin') {
      // Un school_admin solo puede eliminar estudiantes o profesores de su propio colegio
      if (!targetProfile) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'No tienes permisos para eliminar este usuario porque no pertenece a tu institución.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (targetProfile.school_id !== auth.user.schoolId) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Acceso denegado: Este usuario pertenece a otra institución educativa.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (targetProfile.role === 'super_admin' || targetProfile.role === 'school_admin') {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Acceso denegado: Un directivo no puede eliminar a otros administradores o rectores.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Impedir que un super_admin se auto-elimine accidentalmente
    if (targetUserId === auth.user.id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Operación bloqueada por seguridad: No puedes eliminar tu propia cuenta en uso.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[DELETE_USER] Eliminando usuario ID: ${targetUserId}, Email: ${targetEmail} por ${auth.user.email} (${auth.user.role})`);

    // 4. Borrar tickets de confirmación y restablecimiento
    if (targetUserId) {
      await supabase.from('email_confirm_tickets').delete().eq('user_id', targetUserId);
      await supabase.from('password_reset_tickets').delete().eq('user_id', targetUserId);
    }
    if (targetEmail) {
      await supabase.from('password_reset_tickets').delete().eq('target_email', targetEmail);
    }

    // 5. Desvincular de rectoría en instituciones escolares
    if (targetEmail) {
      await supabase
        .from('schools')
        .update({
          rector_name: null,
          rector_email: null,
        })
        .eq('rector_email', targetEmail);
    }

    // 6. Desvincular de cursos o clases si es docente
    if (targetUserId) {
      try {
        await supabase.from('course_teachers').delete().eq('teacher_id', targetUserId);
      } catch {}
      try {
        await supabase.from('course_students').delete().eq('student_id', targetUserId);
      } catch {}
      try {
        await supabase.from('courses').update({ teacher_id: null }).eq('teacher_id', targetUserId);
      } catch {}
      try {
        await supabase.from('classes').update({ teacher_id: null }).eq('teacher_id', targetUserId);
      } catch {}
    }

    // 7. Eliminar de public.users
    if (targetUserId) {
      const { error: pubErr } = await supabase.from('users').delete().eq('id', targetUserId);
      if (pubErr) console.warn('[DELETE_USER] Advertencia al borrar public.users:', pubErr);
    }
    if (targetEmail) {
      await supabase.from('users').delete().eq('email', targetEmail);
    }

    // 8. Eliminar de auth.users (Supabase Auth)
    if (targetUserId) {
      const { error: authErr } = await supabase.auth.admin.deleteUser(targetUserId);
      if (authErr) {
        console.warn('[DELETE_USER] Advertencia al borrar auth.users:', authErr.message);
      }
    }

    // 9. Auditoría
    try {
      await supabase.from('audit_logs').insert({
        actor_email: auth.user.email,
        action: 'user.deleted_permanent',
        target_name: targetEmail || targetUserId,
        target_type: 'user',
        details: {
          userId: targetUserId,
          email: targetEmail,
          deletedAt: new Date().toISOString(),
          deletedByRole: auth.user.role,
          deletedByEmail: auth.user.email,
        },
      });
    } catch {}

    return new Response(
      JSON.stringify({
        ok: true,
        message: `Usuario ${targetEmail || targetUserId} eliminado definitivamente de la base de datos por ${auth.user.email}.`,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[DELETE_USER_ERROR]:', err);
    return new Response(
      JSON.stringify({ ok: false, error: 'Error al eliminar usuario: ' + (err.message || err) }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async (context) => DELETE(context);
