import type { APIRoute } from "astro";
import { requireAuth } from "../../../lib/apiAuth";
import { passwordResetTicketService } from "../../../services/passwordResetTicketService";

/**
 * GET  /api/school-admin/password-tickets  -> Tickets propios del directivo autenticado
 * POST /api/school-admin/password-tickets  -> Crea solicitud de cambio de contraseña propia
 *   Body: { reason: string, resetMethod?: string }
 * Requiere rol school_admin.
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ["school_admin"]);
    if (!auth.ok) return auth.response;

    const tickets = await passwordResetTicketService.getMyTickets(auth.user.id);
    return new Response(JSON.stringify({ ok: true, tickets }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Error interno." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ["school_admin"]);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { reason, resetMethod } = body;

    if (!reason || !reason.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: "El motivo de la solicitud es obligatorio." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const ticketId = await passwordResetTicketService.createOwnSchoolAdminTicket({
      userId: auth.user.id,
      reason: reason.trim(),
      resetMethod: resetMethod || "manual_support",
    });

    return new Response(JSON.stringify({ ok: true, ticketId }), {
      status: 201, headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || "Error interno." }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
