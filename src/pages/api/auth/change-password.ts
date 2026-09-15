import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { newPassword, avatarUrl } = body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return new Response(
        JSON.stringify({ ok: false, error: 'La contrasena debe tener al menos 8 caracteres.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = auth.admin;

    const { error: pwError } = await supabase.auth.admin.updateUserById(auth.user.id, {
      password: newPassword,
      email_confirm: true,
    });

    if (pwError) {
      return new Response(
        JSON.stringify({ ok: false, error: pwError.message || 'Error al actualizar la contrasena.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const updatePayload: any = {
      password_reset_required: false,
      password_last_changed_at: new Date().toISOString(),
      status: 'active',
    };
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
      updatePayload.avatar_url = avatarUrl.trim();
    }

    const { error: flagError } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', auth.user.id);

    if (flagError) {
      console.warn('[change-password] No se pudo actualizar users:', flagError.message);
    }

    return new Response(
      JSON.stringify({ ok: true, message: 'Cuenta activada y contrasena actualizada correctamente.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[/api/auth/change-password]', err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Error interno.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};