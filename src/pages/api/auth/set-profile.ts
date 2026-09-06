export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

/**
 * POST /api/auth/set-profile
 *
 * Activa el perfil del usuario recién registrado (rector, docente o alumno).
 * El usuario ya está autenticado con su token JWT de invitación.
 * Solo puede actualizar SU PROPIA fila — el servidor valida que user.id == id en la fila.
 *
 * Body: { documentId, phone, avatarUrl }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Cualquier rol autenticado puede activar su propio perfil
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin; // service_role — safe en servidor
    const userId = auth.user.id;

    const body = await request.json();
    const { documentId, phone, avatarUrl } = body;

    // Actualizar SOLO la propia fila — sin eq dinámico de fuera
    const { error } = await supabase
      .from('users')
      .update({
        document_id: documentId || null,
        phone: phone || null,
        avatar_url: avatarUrl || null,
        status: 'active',
        password_reset_required: false,
      })
      .eq('id', userId); // siempre el usuario autenticado — no manipulable

    if (error) {
      console.error('Error set-profile:', error);
      return new Response(
        JSON.stringify({ ok: false, error: 'Error al guardar el perfil: ' + error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Registrar activación en auditoría
    try {
      await supabase.from('audit_logs').insert({
        actor_email: auth.user.email,
        action: 'auth.profile_activated',
        target_name: auth.user.email,
        target_type: 'user',
        details: { userId, role: auth.user.role },
      });
    } catch {}

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error /api/auth/set-profile:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
