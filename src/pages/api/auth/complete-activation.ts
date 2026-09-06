export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminSupabase } from '../../../lib/supabase-admin';
import { verifyConfirmToken, hashToken } from '../../../lib/jwtConfirm';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, documentId, phone, password } = body;

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Token de confirmación requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Verificar firma criptográfica del JWT
    let payload;
    try {
      payload = verifyConfirmToken(token);
    } catch (err: any) {
      return new Response(JSON.stringify({ ok: false, error: 'El enlace de activación es inválido o ha expirado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { userId, email, schoolId } = payload;
    const tokenHash = hashToken(token);
    const supabase = createAdminSupabase();

    // 2. Verificar ticket en base de datos
    const { data: ticket, error: ticketErr } = await supabase
      .from('email_confirm_tickets')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ ok: false, error: 'No se encontró el ticket de activación asociado.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Si el ticket ya expiró o fue revocado
    if (ticket.status === 'expired' || ticket.status === 'revoked') {
      return new Response(JSON.stringify({ ok: false, error: 'Este enlace ya no es válido. Solicita un nuevo correo de activación.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Si el ticket está pendiente, validar documento y teléfono
    if (ticket.status === 'pending') {
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!userProfile) {
        return new Response(JSON.stringify({ ok: false, error: 'Perfil de usuario no encontrado.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Normalizar dígitos de documento y teléfono
      const storedDoc = (userProfile.document_id || '').replace(/\D/g, '');
      const storedPhone = (userProfile.phone || '').replace(/\D/g, '');
      const inputDoc = (documentId || '').replace(/\D/g, '');
      const inputPhone = (phone || '').replace(/\D/g, '');

      if (storedDoc && storedPhone) {
        if (storedDoc !== inputDoc || storedPhone !== inputPhone) {
          await supabase
            .from('email_confirm_tickets')
            .update({ attempts: (ticket.attempts || 0) + 1 })
            .eq('id', ticket.id);

          return new Response(JSON.stringify({ ok: false, error: 'La cédula o el teléfono no coinciden con los datos registrados.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // Marcar ticket como usado
      await supabase
        .from('email_confirm_tickets')
        .update({
          status: 'used',
          used_at: new Date().toISOString(),
          attempts: (ticket.attempts || 0) + 1
        })
        .eq('id', ticket.id);
    } else if (ticket.status === 'used') {
      // Permitir completar si fue verificado en los últimos 30 minutos
      const usedAtTime = ticket.used_at ? new Date(ticket.used_at).getTime() : 0;
      const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
      if (usedAtTime < thirtyMinutesAgo) {
        return new Response(JSON.stringify({ ok: false, error: 'El tiempo límite para asignar contraseña expiró. Solicita un nuevo enlace.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. Establecer contraseña definitiva en auth.users
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true,
    });

    if (authErr) {
      console.error('Error al actualizar contraseña en auth:', authErr);
      return new Response(JSON.stringify({ ok: false, error: 'No se pudo asignar la contraseña: ' + authErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Activar usuario en public.users y desmarcar password_reset_required
    const { data: updatedProfile, error: profileErr } = await supabase
      .from('users')
      .update({
        status: 'active',
        password_reset_required: false,
      })
      .eq('id', userId)
      .select('id, name, email, role, school_id')
      .single();

    if (profileErr) {
      console.warn('Advertencia al actualizar public.users:', profileErr);
    }

    // 5. Registrar en audit_logs
    try {
      await supabase.from('audit_logs').insert({
        actor_email: email,
        action: 'auth.password_set_and_account_activated',
        target_name: email,
        target_type: 'user',
        details: { ticketId: ticket.id, userId }
      });
    } catch {}

    return new Response(JSON.stringify({
      ok: true,
      message: '¡Cuenta activada y contraseña configurada exitosamente!',
      user: updatedProfile || { id: userId, email, role: 'school_admin' }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    console.error('Error en complete-activation:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor: ' + (err.message || err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
