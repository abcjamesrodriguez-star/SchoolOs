import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

/**
 * GET /api/game/active-lab
 * Consulta o refresca el estado del laboratorio activo asignado al estudiante autenticado.
 * Headers requeridos: Authorization: Bearer <token>
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['student']);
    if (!auth.ok) {
      return new Response(await auth.response.text(), {
        status: auth.response.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const studentId = auth.user.id;
    const admin = auth.admin;

    const url = new URL(request.url);
    const platformQuery = (url.searchParams.get('platform') || url.searchParams.get('device') || '').toUpperCase().trim();
    const userAgent = request.headers.get('user-agent') || '';
    const isVR = platformQuery === 'VR' || userAgent.includes('Quest') || platformQuery === 'ANDROID';
    const detectedPlatform = isVR ? 'VR' : 'PC';

    // Buscar token activo
    const { data: activeTokens, error: tokErr } = await admin
      .from('lab_tokens')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['pending', 'in_progress'])
      .order('assigned_at', { ascending: false });

    if (tokErr || !activeTokens || activeTokens.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        hasActiveLab: false,
        message: 'No tienes prácticas de laboratorio pendientes o tu token ya fue completado.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const currentToken = activeTokens[0];

    const [{ data: labData }, { data: courseData }] = await Promise.all([
      admin.from('virtual_labs').select('id, name, description').eq('id', currentToken.lab_id).maybeSingle(),
      admin.from('courses').select('id, name, code').eq('id', currentToken.course_id).maybeSingle(),
    ]);

    const labMode = (currentToken.play_mode || 'VR').toUpperCase();
    const platformMatch = labMode === detectedPlatform || labMode === 'AMBOS' || !currentToken.play_mode;

    const activeLab = {
      tokenId: currentToken.token_id,
      labId: currentToken.lab_id,
      labName: labData?.name || 'Separación de agua y aceite (Laboratorio de Química)',
      labDescription: labData?.description || 'Práctica interactiva de química: separación de mezclas heterogéneas por decantación de agua y aceite.',
      courseId: currentToken.course_id,
      courseName: courseData?.name || 'Química General',
      courseCode: courseData?.code || 'QUI-101',
      playMode: labMode,
      status: currentToken.status,
      platformMatch,
      startedAt: currentToken.started_at,
      missions: (labData as any)?.missions || []
    };

    return new Response(JSON.stringify({
      ok: true,
      hasActiveLab: true,
      activeLab,
      student: {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        schoolId: auth.user.schoolId,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[GET /api/game/active-lab] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
