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
 * POST /api/game/start
 * Inicia la sesión de simulación cuando el estudiante pulsa "INICIAR PRÁCTICA" en Unity.
 * Valida que el token no esté quemado y cambia su estado a 'in_progress'.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const admin = createAdminSupabase();
    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {}

    let studentId: string | null = null;

    // Intentar autenticar con JWT si viene en cabecera
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader) {
      const auth = await requireAuth(request, ['student']);
      if (!auth.ok) {
        return new Response(await auth.response.text(), {
          status: auth.response.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      studentId = auth.user.id;
    }

    const requestedTokenId = body.tokenId || body.token;
    const requestedDevice = (body.device || body.platform || '').toUpperCase().trim();
    const safeMode = requestedDevice === 'VR' ? 'VR' : (requestedDevice === 'PC' ? 'PC' : undefined);

    // 1. Buscar token en DB
    let tokenQuery = admin.from('lab_tokens').select('*');

    if (requestedTokenId) {
      tokenQuery = tokenQuery.or(`token_id.eq."${requestedTokenId}",id.eq."${requestedTokenId}"`);
    } else if (studentId) {
      tokenQuery = tokenQuery.eq('student_id', studentId).in('status', ['pending', 'in_progress']).order('assigned_at', { ascending: false });
    } else {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Se requiere tokenId o cabecera de autenticación Authorization: Bearer <token>',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: tokenRecords, error: tokErr } = await tokenQuery;

    if (tokErr || !tokenRecords || tokenRecords.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No se encontró un token de laboratorio activo para iniciar.',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const tokenRecord = tokenRecords[0];

    // BLOQUEO ESTRICTO: Token ya completado/quemado
    if (tokenRecord.status === 'completed') {
      return new Response(JSON.stringify({
        ok: false,
        status: 'token_burned',
        error: 'Este token ya ha sido consumido y tu práctica finalizada. Solicita a tu docente de Química que reactive tu intento.',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Transicionar a 'in_progress'
    const startedAt = tokenRecord.started_at || new Date().toISOString();
    const updatePayload: any = {
      status: 'in_progress',
      started_at: startedAt,
    };

    if (safeMode) {
      updatePayload.play_mode = safeMode;
    }

    const { error: updErr } = await admin
      .from('lab_tokens')
      .update(updatePayload)
      .eq('id', tokenRecord.id);

    if (updErr) {
      console.error('[POST /api/game/start] Error updating token status:', updErr);
      return new Response(JSON.stringify({ ok: false, error: 'Error al iniciar la sesión en el servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      message: 'Práctica iniciada con éxito en el simulador.',
      tokenId: tokenRecord.token_id,
      status: 'in_progress',
      startedAt,
      playMode: safeMode || tokenRecord.play_mode || 'VR',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[POST /api/game/start] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
