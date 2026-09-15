import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin', 'school_admin']);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin;
    const body = await request.json();
    const { userId, newPassword, requireChangeOnNextLogin } = body;

    if (!userId || !newPassword) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan parámetros obligatorios: userId y newPassword.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return new Response(JSON.stringify({ ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Obtener datos del usuario objetivo
    const { data: targetUser, error: userErr } = await supabase
      .from('users')
      .select('id, name, email, role, school_id')
      .eq('id', userId)
      .maybeSingle();

    if (userErr || !targetUser) {
      return new Response(JSON.stringify({ ok: false, error: 'Usuario no encontrado en la base de datos.' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Validar permisos multi-tenant
    if (auth.user.role === 'school_admin') {
      if (targetUser.school_id !== auth.user.schoolId) {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Acceso denegado: No puedes modificar contraseñas de otra institución.',
        }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }

      if (targetUser.role === 'super_admin' || targetUser.role === 'school_admin') {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Acceso denegado: Un directivo no puede cambiar la contraseña de administradores o rectores.',
        }), {
          status: 403, headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Actualizar contraseña directamente en Supabase Auth
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword.trim(),
    });

    if (authErr) {
      console.error('[reset-password] Error de Supabase Auth:', authErr);
      return new Response(JSON.stringify({ ok: false, error: 'Error al cambiar la contraseña en Auth: ' + authErr.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Actualizar tabla public.users
    const now = new Date().toISOString();
    await supabase
      .from('users')
      .update({
        password_reset_required: Boolean(requireChangeOnNextLogin),
        password_last_changed_at: now,
      })
      .eq('id', userId);

    // 5. Cerrar cualquier ticket de cambio pendiente si existía
    try {
      await supabase
        .from('password_reset_tickets')
        .update({
          status: 'completed',
          completed_by: auth.user.id,
          completed_by_email: auth.user.email,
          completed_at: now,
        })
        .eq('target_user_id', userId)
        .in('status', ['pending', 'approved', 'failed']);
    } catch (_) {}

    // 6. Registro de auditoría
    try {
      await supabase.from('audit_logs').insert({
        actor_id: auth.user.id,
        actor_email: auth.user.email,
        action: 'auth.password_reset_direct',
        target_name: targetUser.email,
        target_type: 'user',
        details: {
          targetUserId: targetUser.id,
          targetRole: targetUser.role,
          targetName: targetUser.name,
          requireChangeOnNextLogin: Boolean(requireChangeOnNextLogin),
          changedByRole: auth.user.role,
        },
      });
    } catch (_) {}

    return new Response(JSON.stringify({
      ok: true,
      message: 'Contraseña actualizada con éxito para ' + (targetUser.name || targetUser.email) + '.',
      targetEmail: targetUser.email,
      targetName: targetUser.name,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[POST /api/admin/reset-password]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
