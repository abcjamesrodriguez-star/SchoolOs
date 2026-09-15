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
 * POST /api/game/submit
 * Recibe los resultados finales de las misiones desde Unity,
 * calcula la calificación, marca la plataforma técnica (VR / PC / AMBOS) y QUEMA el token.
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
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader) {
      const auth = await requireAuth(request, ['student']);
      if (auth.ok) {
        studentId = auth.user.id;
      }
    }

    const tokenId = body.tokenId || body.token;
    const timeSpentSeconds = typeof body.timeSpentSeconds === 'number' ? body.timeSpentSeconds : 120;
    
    // Extraer misiones enviadas por Unity en cualquier formato (array u objeto)
    const rawMissionsInput = body.missions || body.tasks || body.misiones || body.evaluatedMissions || body.missionResults || body.results;
    let missions: any[] = [];
    if (Array.isArray(rawMissionsInput)) {
      missions = rawMissionsInput;
    } else if (rawMissionsInput && typeof rawMissionsInput === 'object') {
      missions = Object.entries(rawMissionsInput).map(([key, val]) => {
        if (val && typeof val === 'object') {
          return { mission: key, ...val };
        }
        return { mission: key, pass: val };
      });
    }

    // Detección automática del dispositivo
    const rawDevice = (body.device || body.resolvedIn || body.playMode || body.platform || '').toUpperCase().trim();
    const userAgent = request.headers.get('user-agent') || '';
    const isVR = rawDevice === 'VR' || rawDevice === 'ANDROID' || rawDevice === 'QUEST' || userAgent.includes('Quest');
    const detectedDevice = isVR ? 'VR' : (rawDevice === 'AMBOS' ? 'AMBOS' : 'PC');

    // 1. Buscar token en DB
    let tokenQuery = admin.from('lab_tokens').select('*');

    if (tokenId) {
      tokenQuery = tokenQuery.or(`token_id.eq."${tokenId}",id.eq."${tokenId}"`);
    } else if (studentId) {
      tokenQuery = tokenQuery.eq('student_id', studentId).in('status', ['in_progress', 'pending']).order('assigned_at', { ascending: false });
    } else {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Se requiere tokenId o sesión de estudiante activa.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: tokenRecords, error: tokErr } = await tokenQuery;

    if (tokErr || !tokenRecords || tokenRecords.length === 0) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Token de laboratorio no encontrado.',
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
        error: 'Este token ya ha sido consumido y quemado. Para presentar un nuevo intento, solicita a tu docente reactivar la práctica.',
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Extraer feedback existente
    let parsedFeedback: any = {};
    try {
      if (tokenRecord.feedback_text && tokenRecord.feedback_text.startsWith('{')) {
        parsedFeedback = JSON.parse(tokenRecord.feedback_text);
      }
    } catch (_) {}

    // Detección de plataforma efectiva (híbrido si usó PC y VR)
    const prevDevice = parsedFeedback.resolvedIn || parsedFeedback.device || tokenRecord.play_mode;
    let finalDevice = detectedDevice;
    if ((prevDevice === 'PC' && detectedDevice === 'VR') || (prevDevice === 'VR' && detectedDevice === 'PC')) {
      finalDevice = 'AMBOS';
    }

    // 3. Evaluar misiones (soporta 'pass' / 'not pass', booleanos, y formatos mission/name)
    function parseMissionPassed(m: any): boolean {
      if (m === true) return true;
      if (m === false) return false;
      if (!m) return false;
      if (typeof m.passed === 'boolean') return m.passed;
      if (typeof m.pass === 'boolean') return m.pass;
      if (typeof m.success === 'boolean') return m.success;
      if (typeof m.completed === 'boolean') return m.completed;

      const raw = String(m.passed ?? m.pass ?? m.status ?? m.result ?? m.state ?? m.value ?? '').toLowerCase().trim();
      if (raw === 'pass' || raw === 'passed' || raw === 'true' || raw === 'ok' || raw === 'aprobado' || raw === 'success' || raw === '1') {
        return true;
      }
      if (raw === 'not pass' || raw === 'not_pass' || raw === 'notpass' || raw === 'fail' || raw === 'failed' || raw === 'false' || raw === '0' || raw === 'reprobado') {
        return false;
      }
      return false;
    }

    function parseMissionName(m: any, idx: number): string {
      if (typeof m === 'string') return m;
      return m.mission || m.name || m.title || m.description || `Misión ${idx + 1}`;
    }

    const processedMissions = Array.isArray(missions) && missions.length > 0
      ? missions.map((m: any, idx: number) => {
          const isPassed = parseMissionPassed(m);
          return {
            mission: parseMissionName(m, idx),
            passed: isPassed,
            status: isPassed ? 'pass' : 'not pass'
          };
        })
      : (Array.isArray(parsedFeedback.missions) && parsedFeedback.missions.length > 0 ? parsedFeedback.missions : []);

    const totalMissions = processedMissions.length;
    const tasksCompleted = processedMissions.filter(m => m.passed === true).length;
    const tasksMissing = totalMissions - tasksCompleted;
    const percentage = totalMissions > 0 ? Math.round((tasksCompleted / totalMissions) * 100) : 0;
    const score = totalMissions > 0 ? Number(((tasksCompleted / totalMissions) * 10).toFixed(1)) : 0.0;
    const completedAt = new Date().toISOString();

    const updatedFeedback = {
      ...parsedFeedback,
      missions: processedMissions,
      percentage,
      score,
      timeSpentSeconds,
      completedAt,
      resolvedIn: finalDevice,
      device: finalDevice,
      playMode: finalDevice,
      markedByUnity: true,
      unityRawPlatform: rawDevice || 'Unity',
    };

    // 4. QUEMAR EL TOKEN: status = 'completed'
    const updatePayload: any = {
      status: 'completed',
      completed_at: completedAt,
      tasks_completed: tasksCompleted,
      tasks_missing: tasksMissing,
      time_spent_seconds: timeSpentSeconds,
      feedback_text: JSON.stringify(updatedFeedback),
      play_mode: finalDevice === 'VR' ? 'VR' : 'PC', // Compatible con constraint DB
    };

    const { error: updErr } = await admin
      .from('lab_tokens')
      .update(updatePayload)
      .eq('id', tokenRecord.id);

    if (updErr) {
      console.error('[POST /api/game/submit] Error quemando token:', updErr);
      return new Response(JSON.stringify({ ok: false, error: 'Error al registrar resultados en el servidor.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      burned: true,
      status: 'completed',
      score,
      percentage,
      tasksCompleted,
      totalMissions,
      timeSpentSeconds,
      resolvedIn: finalDevice,
      device: finalDevice,
      markedByUnity: true,
      message: `¡Práctica completada con éxito! Calificación: ${score}/10 (${percentage}%). Token quemado.`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[POST /api/game/submit] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
