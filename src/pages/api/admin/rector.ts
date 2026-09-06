import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';
import { provisionRectorAccount } from '../../../services/rectorProvisioningService';

/**
 * POST /api/admin/rector
 * Aprovisiona y configura el perfil de un directivo/rector para una institución.
 * Requiere rol super_admin.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const payload = body.action === 'provision' ? body : body;

    const {
      schoolId, name, email, phone, documentType, documentId,
      jobTitle, specialty, appointmentDate, status, avatarUrl
    } = payload;

    if (!schoolId || !name || !email) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan parámetros requeridos (schoolId, name, email).' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Aprovisionamiento centralizado y nativo en el servidor
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