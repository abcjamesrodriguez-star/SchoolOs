import type { APIRoute } from 'astro';
import { createAdminSupabase } from '../../../lib/supabase-admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

// Manejador Preflight para que navegadores (WebGL) y dispositivos (VR) no sean bloqueados por CORS
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const supabase = createAdminSupabase();
    const url = new URL(request.url);
    const tokenId = url.searchParams.get('tokenId');

    if (!tokenId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta el parámetro tokenId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

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

    let parsedFeedback: any = {};
    try {
      if (tokenRecord.feedback_text && tokenRecord.feedback_text.startsWith('{')) {
        parsedFeedback = JSON.parse(tokenRecord.feedback_text);
      }
    } catch (_) {}

    const totalMissions = (tokenRecord.tasks_completed || 0) + (tokenRecord.tasks_missing || 0);
    const score = parsedFeedback?.score !== undefined
      ? parsedFeedback.score
      : (totalMissions > 0 ? ((tokenRecord.tasks_completed / totalMissions) * 10).toFixed(1) : 0);

    const resolvedIn = (
      parsedFeedback?.resolvedIn ||
      parsedFeedback?.device ||
      parsedFeedback?.playMode ||
      parsedFeedback?.survey?.deviceUsed ||
      tokenRecord.play_mode ||
      'PC'
    ).toUpperCase();

    return new Response(JSON.stringify({
      ok: true,
      data: {
        tokenId: tokenRecord.token_id,
        status: tokenRecord.status,
        tasksCompleted: tokenRecord.tasks_completed || 0,
        tasksMissing: tokenRecord.tasks_missing || 0,
        totalMissions,
        score,
        resolvedIn,
        device: resolvedIn,
        markedByUnity: Boolean(parsedFeedback?.markedByUnity),
        timeSpentSeconds: tokenRecord.time_spent_seconds || 0,
        feedback: parsedFeedback,
        hasSurvey: Boolean(parsedFeedback?.survey?.submittedAt),
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createAdminSupabase();
    let body: any = {};
    try {
      body = await request.json();
    } catch (_) {
      return new Response(JSON.stringify({ ok: false, error: 'Cuerpo de la petición JSON inválido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { tokenId, timeSpentSeconds, missions, playMode, device } = body;

    if (!tokenId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta el parámetro obligatorio tokenId.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 1. Buscar la boleta/token en la base de datos (por token_id o por id)
    const { data: tokenRecord, error: tokErr } = await supabase
      .from('lab_tokens')
      .select('*')
      .or(`token_id.eq."${tokenId}",id.eq."${tokenId}"`)
      .maybeSingle();

    if (tokErr || !tokenRecord) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Token de sesión no encontrado en el sistema. Verifica que el token sea correcto.',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. REGLA DE UN SOLO USO: Si ya fue completado, rechazar intento
    if (tokenRecord.status === 'completed') {
      return new Response(JSON.stringify({
        ok: false,
        status: 'already_completed',
        error: 'Este token ya fue utilizado previamente. Solicita al docente que reactive o refresque tu intento.',
        completedAt: tokenRecord.completed_at,
        tasksCompleted: tokenRecord.tasks_completed,
        tasksMissing: tokenRecord.tasks_missing,
      }), {
        status: 409, // Conflict
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Procesar las misiones (soporta 'pass' / 'not pass', booleanos, y formatos mission/name)
    function parseMissionPassed(m: any): boolean {
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

    let tasksCompleted = 0;
    let tasksMissing = 0;
    const processedMissions: Array<{ mission: string; passed: boolean; status?: string }> = [];

    if (Array.isArray(missions) && missions.length > 0) {
      missions.forEach((m: any, idx: number) => {
        const title = m.mission || m.title || m.name || `Misión ${idx + 1}`;
        const passed = parseMissionPassed(m);
        if (passed) tasksCompleted++;
        else tasksMissing++;
        processedMissions.push({ mission: title, passed, status: passed ? 'pass' : 'not pass' });
      });
    } else if (missions && typeof missions === 'object') {
      Object.entries(missions).forEach(([key, val]) => {
        const passed = typeof val === 'boolean' ? val : (String(val).toLowerCase().trim() === 'pass' || String(val).toLowerCase().trim() === 'true');
        if (passed) tasksCompleted++;
        else tasksMissing++;
        processedMissions.push({ mission: key, passed, status: passed ? 'pass' : 'not pass' });
      });
    }

    const totalMissions = tasksCompleted + tasksMissing;
    const percentage = totalMissions > 0 ? parseFloat(((tasksCompleted / totalMissions) * 100).toFixed(1)) : 0.0;
    const score = totalMissions > 0 ? parseFloat(((tasksCompleted / totalMissions) * 10.0).toFixed(1)) : 0.0;

    // Detección automática y precisa de la plataforma donde Unity resolvió la práctica
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const rawInput = (
      body.resolvedIn ||
      body.device ||
      body.playMode ||
      body.play_mode ||
      body.platform ||
      body.mode ||
      ''
    ).toUpperCase().trim();

    let detectedDevice = 'PC';
    if (
      rawInput === 'VR' ||
      rawInput.includes('QUEST') ||
      rawInput.includes('OCULUS') ||
      rawInput.includes('OPENXR') ||
      rawInput === 'ANDROID' // Builds de Meta Quest en Unity compilan para Android nativo
    ) {
      detectedDevice = 'VR';
    } else if (
      rawInput === 'AMBOS' ||
      rawInput === 'BOTH' ||
      rawInput === 'HIBRIDO' ||
      rawInput.includes('HYBRID')
    ) {
      detectedDevice = 'AMBOS';
    } else if (
      rawInput === 'PC' ||
      rawInput.includes('WINDOWS') ||
      rawInput.includes('WEBGL') ||
      rawInput.includes('STANDALONE') ||
      rawInput.includes('MAC')
    ) {
      detectedDevice = 'PC';
    } else if (userAgent.includes('quest') || userAgent.includes('oculus')) {
      detectedDevice = 'VR';
    } else {
      detectedDevice = (tokenRecord.play_mode || 'PC').toUpperCase();
    }

    // Si el estudiante ya había resuelto misiones en otra plataforma (ej. comenzó en PC y luego pasó a VR), marcar AMBOS
    let previousDevice = null;
    try {
      if (tokenRecord.feedback_text && tokenRecord.feedback_text.startsWith('{')) {
        const prev = JSON.parse(tokenRecord.feedback_text);
        previousDevice = (prev.resolvedIn || prev.device || prev.playMode || '').toUpperCase();
      }
    } catch (_) {}

    let finalDevice = detectedDevice;
    if (
      previousDevice &&
      previousDevice !== detectedDevice &&
      (previousDevice === 'PC' || previousDevice === 'VR') &&
      (detectedDevice === 'PC' || detectedDevice === 'VR')
    ) {
      finalDevice = 'AMBOS';
    }

    // 4. Quemar el token a 'completed' y guardar los resultados calculados y marcados por Unity
    const updatePayload: any = {
      status: 'completed',
      tasks_completed: tasksCompleted,
      tasks_missing: tasksMissing,
      time_spent_seconds: Number(timeSpentSeconds) || 0,
      completed_at: new Date().toISOString(),
      play_mode: finalDevice === 'VR' ? 'VR' : 'PC', // Compatible con constraint DB
      feedback_text: JSON.stringify({
        missions: processedMissions,
        percentage,
        score,
        resolvedIn: finalDevice,
        device: finalDevice,
        playMode: finalDevice,
        markedByUnity: true,
        unityRawPlatform: rawInput || userAgent,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        completedAt: new Date().toISOString(),
      }),
    };

    const { error: updErr } = await supabase
      .from('lab_tokens')
      .update(updatePayload)
      .eq('id', tokenRecord.id);

    if (updErr) {
      console.error('[POST /api/labs/submit] Error al actualizar token:', updErr);
      return new Response(JSON.stringify({ ok: false, error: 'Error al registrar los resultados en la base de datos.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 4.1. Sincronizar automáticamente en el boletín oficial de calificaciones (student_scores)
    try {
      const evalId = '180e8836-56d1-43ac-8175-7c754a922c3c';
      if (tokenRecord.student_id) {
        const { data: existingScore } = await supabase
          .from('student_scores')
          .select('id')
          .eq('evaluation_id', evalId)
          .eq('student_id', tokenRecord.student_id)
          .maybeSingle();

        if (existingScore) {
          await supabase.from('student_scores').update({
            score,
            feedback_text: `Simulación Unity completada: ${tasksCompleted}/${totalMissions} misiones resueltas (${percentage}%)`,
            updated_at: new Date().toISOString(),
          }).eq('id', existingScore.id);
        } else {
          await supabase.from('student_scores').insert({
            evaluation_id: evalId,
            student_id: tokenRecord.student_id,
            score,
            feedback_text: `Simulación Unity completada: ${tasksCompleted}/${totalMissions} misiones resueltas (${percentage}%)`,
          });
        }
      }
    } catch (e) {
      console.warn('[POST /api/labs/submit] Advertencia sincronizando nota en student_scores:', e);
    }

    // 5. Respuesta exitosa de confirmación (desbloquea el wait para la encuesta)
    return new Response(JSON.stringify({
      ok: true,
      confirmed: true,
      status: 'completed',
      message: 'Laboratorio completado y calificado con éxito en el servidor.',
      data: {
        tokenId: tokenRecord.token_id,
        dbId: tokenRecord.id,
        studentName: (tokenRecord.student as any)?.name || 'Estudiante',
        tasksCompleted,
        tasksMissing,
        totalMissions,
        percentage,
        score,
        resolvedIn: finalDevice,
        device: finalDevice,
        playMode: finalDevice,
        markedByUnity: true,
        timeSpentSeconds: Number(timeSpentSeconds) || 0,
        readyForSurvey: true,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[POST /api/labs/submit] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
