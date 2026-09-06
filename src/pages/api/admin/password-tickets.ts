import type { APIRoute } from "astro";
import { requireAuth } from "../../../lib/apiAuth";
import { passwordResetTicketService } from "../../../services/passwordResetTicketService";

/**
 * GET   /api/admin/password-tickets           -> Lista la cola de tickets pendientes
 * POST  /api/admin/password-tickets           -> Crea un nuevo ticket administrativo
 * PUT   /api/admin/password-tickets           -> Ejecuta el cambio de contraseña de un ticket (REST)
 * PATCH /api/admin/password-tickets           -> Idem (REST)
 * Requiere rol super_admin.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ["super_admin"]);
    if (!auth.ok) return auth.response;

    const tickets = await passwordResetTicketService.getTicketQueue();
    return new Response(JSON.stringify({ ok: true, tickets }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Error interno." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

async function handleExecuteTicket(request: Request, body: any) {
  const auth = await requireAuth(request, ["super_admin"]);
  if (!auth.ok) return auth.response;

  const { ticketId, newPassword } = body;
  if (!ticketId || !newPassword) {
    return new Response(
      JSON.stringify({ ok: false, error: "Faltan parametros: ticketId y newPassword son obligatorios." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (newPassword.length < 8) {
    return new Response(
      JSON.stringify({ ok: false, error: "La contrasena debe tener minimo 8 caracteres." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const result = await passwordResetTicketService.executeTicket({
      ticketId,
      newPassword,
      actorUserId: auth.user.id,
      actorEmail: auth.user.email,
    });

    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[executeTicket]", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Error al ejecutar ticket." }), {
      status: 422, headers: { "Content-Type": "application/json" },
    });
  }
}

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    return handleExecuteTicket(request, body);
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Error procesando solicitud." }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }
};

export const PATCH = PUT;

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ["super_admin"]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { action } = body;

    // --- execute_ticket (compatibilidad backwards con frontend existente) ---
    if (action === "execute_ticket") {
      return handleExecuteTicket(request, body);
    }

    // --- create_ticket (o POST directo de nuevo ticket) ---
    const targetUserId = body.targetUserId;
    const reason = body.reason;
    const resetMethod = body.resetMethod || "temporary_password";
    const requiresSecondApproval = body.requiresSecondApproval || false;

    if (!targetUserId || !reason) {
      return new Response(
        JSON.stringify({ ok: false, error: "Faltan parametros: targetUserId y reason son obligatorios." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ticketId = await passwordResetTicketService.createSuperAdminTicket({
      targetUserId,
      reason,
      resetMethod,
      requiresSecondApproval,
    });

    return new Response(JSON.stringify({ ok: true, ticketId }), {
      status: 201, headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[POST /api/admin/password-tickets]", err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Error interno." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
