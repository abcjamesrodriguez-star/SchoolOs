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
 * GET & POST /api/game/history
 * Permite a Unity (PC/VR) o la web consultar el historial completo de intentos del estudiante.
 * Admite:
 *   - Cabecera: Authorization: Bearer <token>
 *   - Query param: ?studentId=... o ?email=...
 *   - Body JSON: { studentId, email, identifier }
 */
export const GET: APIRoute = async ({ request }) => {
  return handleHistoryRequest(request);
};

export const POST: APIRoute = async ({ request }) => {
  return handleHistoryRequest(request);
};

async function handleHistoryRequest(request: Request) {
  try {
    const admin = createAdminSupabase();
    let studentId: string | null = null;

    // 1. Intentar por JWT
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader) {
      const auth = await requireAuth(request, ['student', 'teacher', 'school_admin', 'super_admin']);
      if (auth.ok) {
        studentId = auth.user.id;
      }
    }

    // 2. Si no hay JWT o se especifica en Query/Body
    const url = new URL(request.url);
    let targetIdentifier = url.searchParams.get('studentId') || url.searchParams.get('email') || url.searchParams.get('identifier');

    if (!targetIdentifier && request.method === 'POST') {
      try {
        const body = await request.clone().json();
        targetIdentifier = body.studentId || body.email || body.identifier;
      } catch (_) {}
    }

    if (targetIdentifier) {
      if (targetIdentifier.includes('-') && targetIdentifier.length === 36) {
        studentId = targetIdentifier;
      } else {
        const { data: user } = await admin
          .from('users')
          .select('id')
          .or(`email.eq."${targetIdentifier}",document_id.eq."${targetIdentifier}"`)
          .maybeSingle();
        if (user?.id) studentId = user.id;
      }
    }

    if (!studentId) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Se requiere Authorization: Bearer <token> o parámetro studentId/email.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Consultar todos los tokens del estudiante
    const { data: tokens, error: tokErr } = await admin
      .from('lab_tokens')
      .select(`
        *,
        lab:virtual_labs(id, name, description),
        course:courses(id, name, code)
      `)
      .eq('student_id', studentId)
      .order('assigned_at', { ascending: false });

    if (tokErr) {
      console.error('[GET /api/game/history] Error fetching tokens:', tokErr);
      return new Response(JSON.stringify({ ok: false, error: 'Error al consultar historial.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const allTokens = tokens || [];
    const completedTokens = allTokens.filter(t => t.status === 'completed');
    const activeToken = allTokens.find(t => t.status === 'pending' || t.status === 'in_progress');

    let bestScore = 0;
    let totalScoreSum = 0;

    const historyItems = completedTokens.map((t, idx) => {
      let feedback: any = {};
      try {
        if (t.feedback_text) feedback = JSON.parse(t.feedback_text);
      } catch (_) {}

      const score = Number(feedback.score ?? (t.tasks_completed > 0 ? t.tasks_completed : 0));
      const percentage = Number(feedback.percentage ?? (t.tasks_completed > 0 ? Math.round((t.tasks_completed / 14) * 100) : 0));
      
      if (score > bestScore) bestScore = score;
      totalScoreSum += score;

      return {
        id: t.id,
        tokenId: t.token_id,
        attemptNumber: completedTokens.length - idx,
        status: t.status,
        labName: t.lab?.name || 'Separación de agua y aceite',
        courseName: t.course?.name || 'Química',
        score,
        percentage,
        timeSpentSeconds: t.time_spent_seconds || feedback.timeSpentSeconds || 0,
        completedAt: t.completed_at || feedback.completedAt,
        assignedAt: t.assigned_at,
        device: feedback.device || t.play_mode || 'PC',
        tasksCompleted: t.tasks_completed || feedback.tasksCompleted || 0,
        totalTasks: (feedback.missions?.length) || (t.tasks_completed + t.tasks_missing) || 14,
        missions: feedback.missions || [],
      };
    });

    const averageScore = completedTokens.length > 0
      ? Number((totalScoreSum / completedTokens.length).toFixed(1))
      : 0;

    return new Response(JSON.stringify({
      ok: true,
      hasHistory: historyItems.length > 0,
      totalAttempts: allTokens.length,
      completedAttempts: completedTokens.length,
      bestScore,
      averageScore,
      currentAttemptNumber: allTokens.length + (activeToken ? 0 : 1),
      hasActiveLab: Boolean(activeToken),
      activeLab: activeToken ? {
        tokenId: activeToken.token_id,
        status: activeToken.status,
        labName: activeToken.lab?.name || 'Separación de agua y aceite',
        courseName: activeToken.course?.name || 'Química',
        assignedAt: activeToken.assigned_at,
        attemptNumber: allTokens.length,
      } : null,
      history: historyItems,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[handleHistoryRequest] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
