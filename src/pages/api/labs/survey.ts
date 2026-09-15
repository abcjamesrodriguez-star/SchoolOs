import type { APIRoute } from 'astro';
import { createAdminSupabase } from '../../../lib/supabase-admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createAdminSupabase();
    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {
      return new Response(JSON.stringify({ ok: false, error: 'JSON inválido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { tokenId, answers } = body;

    if (!tokenId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta tokenId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 1. Buscar token en DB
    const { data: tokenRecord, error: tokErr } = await supabase
      .from('lab_tokens')
      .select('*')
      .or(`token_id.eq."${tokenId}",id.eq."${tokenId}"`)
      .maybeSingle();

    if (tokErr || !tokenRecord) {
      return new Response(JSON.stringify({ ok: false, error: 'Token no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Extraer feedback existente o parsear
    let currentFeedback: any = {};
    try {
      if (tokenRecord.feedback_text && tokenRecord.feedback_text.startsWith('{')) {
        currentFeedback = JSON.parse(tokenRecord.feedback_text);
      } else {
        currentFeedback = { legacyNote: tokenRecord.feedback_text || '' };
      }
    } catch (_) {
      currentFeedback = { legacyNote: tokenRecord.feedback_text || '' };
    }

    // BLOQUEO: Si el token ya fue consumido y la encuesta enviada, no permitir sobreescribir
    if (tokenRecord.status === 'completed' && currentFeedback?.survey?.submittedAt) {
      return new Response(JSON.stringify({
        ok: false,
        status: 'token_burned',
        error: 'Este token ya ha sido consumido y tu encuesta finalizada. Para presentar un nuevo intento, solicita a tu docente de Química que reactive tu token.',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Extraer plataforma / dispositivo utilizado (PC, VR o AMBOS)
    const rawDevice = (answers?.deviceUsed || answers?.device || answers?.playMode || '').toUpperCase().trim();
    const studentDevice = rawDevice === 'VR' ? 'VR' : (rawDevice === 'AMBOS' || rawDevice === 'HIBRIDO' || rawDevice === 'BOTH') ? 'AMBOS' : 'PC';

    // Si Unity ya marcó en qué se resolvió la simulación, respetamos la marca de Unity o combinamos si se usaron ambos
    let finalDevice = currentFeedback.resolvedIn || currentFeedback.device || studentDevice;
    if ((currentFeedback.resolvedIn === 'VR' && studentDevice === 'PC') || (currentFeedback.resolvedIn === 'PC' && studentDevice === 'VR')) {
      finalDevice = 'AMBOS';
    }
    if (studentDevice === 'AMBOS' || rawDevice === 'AMBOS') {
      finalDevice = 'AMBOS';
    }

    currentFeedback.resolvedIn = currentFeedback.resolvedIn || finalDevice;
    currentFeedback.device = finalDevice;
    currentFeedback.playMode = finalDevice;
    currentFeedback.survey = {
      deviceUsed: studentDevice,
      effectiveDevice: finalDevice,
      understandingScore: answers?.understandingScore || answers?.q1 || null,
      usabilityScore: answers?.usabilityScore || answers?.q2 || null,
      motivationScore: answers?.motivationScore || answers?.q3 || null,
      challengingMission: answers?.challengingMission || answers?.q4 || '',
      suggestions: answers?.suggestions || answers?.q5 || '',
      submittedAt: new Date().toISOString(),
    };

    // 4. Preparar payload de actualización: SIEMPRE marcar como completed
    const completedAt = tokenRecord.completed_at || new Date().toISOString();
    let tasksCompleted = tokenRecord.tasks_completed || 0;
    let tasksMissing = tokenRecord.tasks_missing || 0;
    let timeSpentSeconds = tokenRecord.time_spent_seconds || 0;

    // Conservar datos reales de simulación previa si existen
    if (currentFeedback.missions && currentFeedback.missions.length > 0) {
      currentFeedback.timeSpentSeconds = timeSpentSeconds;
      currentFeedback.completedAt = completedAt;
    }

    const updatePayload: any = {
      feedback_text: JSON.stringify(currentFeedback),
      status: 'completed',
      completed_at: completedAt,
      tasks_completed: tasksCompleted,
      tasks_missing: tasksMissing,
      time_spent_seconds: timeSpentSeconds,
      play_mode: deviceUsed === 'VR' ? 'VR' : 'PC', // Compatible con el constraint DB
    };

    const { error: updErr } = await supabase
      .from('lab_tokens')
      .update(updatePayload)
      .eq('id', tokenRecord.id);

    if (updErr) {
      console.error('[POST /api/labs/survey] Error guardando encuesta:', updErr);
      return new Response(JSON.stringify({ ok: false, error: 'Error al registrar la encuesta en el servidor.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      confirmed: true,
      message: 'Encuesta de investigación registrada exitosamente.',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[POST /api/labs/survey] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
