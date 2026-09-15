import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';
import { createAdminSupabase } from '../../../lib/supabase-admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

/**
 * POST /api/game/change-password
 * Permite a Unity (PC o VR) actualizar la contraseña del estudiante
 * cuando se detecta mustChangePassword: true en su primer login.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const admin = createAdminSupabase();
    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {
      return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let studentId: string | null = null;

    // 1. Intentar autenticar vía JWT (Authorization: Bearer <token>)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader) {
      const auth = await requireAuth(request);
      if (auth.ok && auth.user) {
        studentId = auth.user.id;
      }
    }

    // 2. Si no viene JWT, permitir resolución por studentId o tokenId enviado en el body
    if (!studentId) {
      if (body.studentId) {
        studentId = body.studentId;
      } else if (body.tokenId || body.token) {
        const tokenId = body.tokenId || body.token;
        const { data: tokData } = await admin
          .from('lab_tokens')
          .select('student_id')
          .or(`token_id.eq."${tokenId}",id.eq."${tokenId}"`)
          .maybeSingle();
        if (tokData?.student_id) {
          studentId = tokData.student_id;
        }
      }
    }

    if (!studentId) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No se pudo identificar al estudiante. Envía la cabecera Authorization: Bearer <token> o studentId.',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const newPassword = (body.newPassword || body.password || '').trim();
    if (!newPassword || newPassword.length < 8) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'La nueva contraseña debe tener al menos 8 caracteres.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Actualizar contraseña en Supabase Auth
    const { error: pwErr } = await admin.auth.admin.updateUserById(studentId, {
      password: newPassword,
      email_confirm: true,
    });

    if (pwErr) {
      console.error('[POST /api/game/change-password] Error en Supabase Auth:', pwErr);
      return new Response(JSON.stringify({
        ok: false,
        error: pwErr.message || 'Error al actualizar la contraseña en el servidor de autenticación.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 4. Apagar la bandera password_reset_required en users
    const now = new Date().toISOString();
    const updatePayload: any = {
      password_reset_required: false,
      password_last_changed_at: now,
      status: 'active',
      updated_at: now,
    };

    if (body.avatarUrl && typeof body.avatarUrl === 'string') {
      updatePayload.avatar_url = body.avatarUrl;
    }

    const { error: userErr } = await admin
      .from('users')
      .update(updatePayload)
      .eq('id', studentId);

    if (userErr) {
      console.warn('[POST /api/game/change-password] Advertencia actualizando users:', userErr.message);
    }

    return new Response(JSON.stringify({
      ok: true,
      passwordChanged: true,
      message: '¡Contraseña actualizada con éxito! Ahora puedes iniciar tus prácticas en el simulador.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[POST /api/game/change-password] Error inesperado:', err);
    return new Response(JSON.stringify({
      ok: false,
      error: err?.message || 'Error interno del servidor.',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
