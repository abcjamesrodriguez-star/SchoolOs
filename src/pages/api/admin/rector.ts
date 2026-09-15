import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';
import {
  provisionRectorAccount,
  generateRectorInviteLink,
  resendRectorInviteEmail,
} from '../../../services/rectorProvisioningService';

/**
 * POST /api/admin/rector
 * Aprovisiona, reenvía o genera enlaces de invitación institucional con Supabase Auth Nativo.
 * Requiere rol super_admin.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const siteUrl = new URL(request.url).origin;

    // Acción 1: Generar enlace criptográfico oficial de Supabase Auth ("Copiar Link")
    if (body.action === 'generate_link') {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta email para generar el enlace.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const inviteLink = await generateRectorInviteLink(email, siteUrl);
      return new Response(JSON.stringify({
        ok: true,
        actionLink: inviteLink,
        confirmUrl: inviteLink,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Acción 2: Reenviar invitación por correo vía Supabase SMTP ("Reenviar Correo")
    if (body.action === 'resend') {
      const email = body.email?.trim().toLowerCase();
      if (!email) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta email para reenviar la invitación.' }), {
          status: 400, headers: { 'Content-Type': 'application/json' }
        });
      }

      const resendResult = await resendRectorInviteEmail(email, siteUrl);
      if (!resendResult.ok) {
        return new Response(JSON.stringify({ ok: false, error: resendResult.error || 'Error al reenviar.' }), {
          status: 500, headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        ok: true,
        message: `Invitación oficial reenviada vía Supabase SMTP a ${email}.`,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Acción 3: Aprovisionamiento inicial del directivo
    const payload = body;
    const {
      schoolId, name, email, phone, documentType, documentId,
      jobTitle, specialty, appointmentDate, status, avatarUrl
    } = payload;

    if (!schoolId || !name || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan parámetros requeridos (schoolId, name, email).' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Aprovisionamiento centralizado y nativo en el servidor con Supabase Auth
    const result = await provisionRectorAccount({
      schoolId,
      name,
      email,
      phone,
      documentType,
      documentId,
      jobTitle,
      specialty,
      appointmentDate,
      status,
      avatarUrl,
      siteUrl,
    });

    // Registrar en auditoría
    try {
      await auth.admin.from('audit_logs').insert({
        actor_email: auth.user.email,
        action: 'user.provisioned_rector',
        target_name: email.trim(),
        target_type: 'user',
        details: { schoolId, actorId: auth.user.id, userId: result.userId }
      });
    } catch {}

    return new Response(JSON.stringify({
      ok: true,
      user: { id: result.userId, email: email.trim(), name: name.trim() },
      confirmUrl: result.confirmUrl,
      emailSent: result.emailSent || false,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('Error /api/admin/rector:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor.' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const schoolId = url.searchParams.get('schoolId');

    if (!schoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    const { data, error } = await auth.admin
      .from('users')
      .select('*')
      .eq('school_id', schoolId)
      .eq('role', 'school_admin');

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, rectors: data || [] }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
};