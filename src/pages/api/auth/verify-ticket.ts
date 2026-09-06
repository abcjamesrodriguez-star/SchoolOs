export const prerender = false;

import type { APIRoute } from 'astro';
import { createAdminSupabase } from '../../../lib/supabase-admin';
import { verifyConfirmToken, hashToken } from '../../../lib/jwtConfirm';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta el token de confirmación.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tokenHash = hashToken(token);
    const supabase = createAdminSupabase();

    const { data: ticket, error: ticketErr } = await supabase
      .from('email_confirm_tickets')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ ok: false, error: 'Ticket de confirmación no encontrado o inválido.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let school = null;
    if (ticket.school_id) {
      const { data: schoolData } = await supabase
        .from('schools')
        .select('name, logo_url, slogan')
        .eq('id', ticket.school_id)
        .maybeSingle();
      school = schoolData;
    }

    return new Response(JSON.stringify({
      ok: true,
      email: ticket.target_email || ticket.email || '',
      status: ticket.status,
      school,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[GET /api/auth/verify-ticket]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, documentId, phone } = body;

    if (!token || !documentId || !phone) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tokenHash = hashToken(token);
    const supabase = createAdminSupabase();

    let success = false;
    let message = '';

    try {
      const { data, error } = await supabase.rpc('verify_email_confirm_ticket', {
        p_token_hash: tokenHash,
        p_document_id: documentId,
        p_phone: phone,
      });

      if (error) throw error;

      const row = Array.isArray(data) ? data[0] : data;
      success = row?.success ?? false;
      message = row?.message || (row?.success ? 'Identidad verificada exitosamente.' : 'Datos no coinciden.');
    } catch (rpcErr) {
      console.warn('[POST /api/auth/verify-ticket] RPC verify_email_confirm_ticket failed, using native verification fallback:', rpcErr);

      const { data: ticket, error: ticketErr } = await supabase
        .from('email_confirm_tickets')
        .select('*')
        .eq('token_hash', tokenHash)
        .maybeSingle();

      if (ticketErr || !ticket) {
        return new Response(JSON.stringify({ ok: false, error: 'Ticket de confirmación no encontrado o inválido.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (ticket.status === 'expired' || ticket.status === 'revoked') {
        return new Response(JSON.stringify({ ok: false, error: 'Este enlace ya no es válido.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data: userProfile, error: profileErr } = await supabase
        .from('users')
        .select('id, document_id, phone')
        .eq('id', ticket.user_id)
        .maybeSingle();

      if (profileErr || !userProfile) {
        return new Response(JSON.stringify({ ok: false, error: 'Perfil de usuario no encontrado.' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const storedDoc = (userProfile.document_id || '').replace(/\D/g, '');
      const storedPhone = (userProfile.phone || '').replace(/\D/g, '');
      const inputDoc = (documentId || '').replace(/\D/g, '');
      const inputPhone = (phone || '').replace(/\D/g, '');

      if (storedDoc && storedPhone) {
        if (storedDoc === inputDoc && storedPhone === inputPhone) {
          success = true;
          message = 'Identidad verificada exitosamente.';
        } else {
          success = false;
          message = 'La cédula o el teléfono no coinciden con los datos registrados.';
          try {
            await supabase
              .from('email_confirm_tickets')
              .update({ attempts: (ticket.attempts || 0) + 1 })
              .eq('id', ticket.id);
          } catch {}
        }
      } else {
        success = true;
        message = 'Identidad verificada exitosamente.';
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      success,
      message,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[POST /api/auth/verify-ticket]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
