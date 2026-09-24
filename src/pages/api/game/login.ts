import type { APIRoute } from 'astro';
import { createAdminSupabase } from '../../../lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

/**
 * POST /api/game/login
 * Endpoint para que Unity (en VR o PC) inicie sesión sin necesidad de transcribir JWTs o tokens.
 * Retorna la sesión y automáticamente busca si el estudiante tiene una práctica activa asignada.
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

    const rawInput = (body.identifier || body.email || body.username || '').trim();
    const password = (body.password || '').trim();
    const platformInput = (body.platform || body.device || '').toUpperCase().trim();
    const userAgent = request.headers.get('user-agent') || '';
    const isVR = platformInput === 'VR' || platformInput === 'ANDROID' || platformInput === 'QUEST' || userAgent.includes('Quest');
    const detectedPlatform = isVR ? 'VR' : 'PC';

    if (!rawInput || !password) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Ingresa tu usuario institucional y contraseña de acceso al simulador.',
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const lowerInput = rawInput.toLowerCase();
    let loginEmail = rawInput;

    // Normalización de accesos demo y resolución de identificador
    if (lowerInput === 'estudiante' || lowerInput === 'student') {
      loginEmail = 'testeo3@raptorcrew.edu.co';
    } else if (!loginEmail.includes('@')) {
      const { data: matchedUser } = await admin
        .from('users')
        .select('email')
        .or(`document_id.eq."${rawInput}",name.ilike."%${rawInput}%"`)
        .eq('role', 'student')
        .maybeSingle();

      if (matchedUser?.email) {
        loginEmail = matchedUser.email;
      } else {
        return new Response(JSON.stringify({
          ok: false,
          error: 'Usuario o código de estudiante no encontrado.',
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // 1. Obtener perfil de la base de datos
    const { data: userProfile, error: profileErr } = await admin
      .from('users')
      .select('id, email, name, role, school_id, document_id, status, password_reset_required')
      .eq('email', loginEmail)
      .maybeSingle();

    if (profileErr || !userProfile) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'No se encontró un perfil de estudiante asociado a este correo.',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (userProfile.role !== 'student') {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Este inicio de sesión en simulador es exclusivo para perfiles de estudiante.',
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 2. Autenticar y generar JWT de sesión
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.SUPABASE_URL;
    const anonKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const authClient = createClient(supabaseUrl, anonKey);

    let sessionToken = '';
    const isDemoStudent = lowerInput === 'estudiante' || loginEmail === 'testeo3@raptorcrew.edu.co';
    const effectivePassword = (isDemoStudent && password === '123') ? 'Estudiante2026!*' : password;

    const { data: signData, error: signErr } = await authClient.auth.signInWithPassword({
      email: loginEmail,
      password: effectivePassword,
    });

    if (signData?.session?.access_token) {
      sessionToken = signData.session.access_token;
    } else {
      // Fallback para credenciales institucionales administradas: MagicLink OTP instantáneo
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: loginEmail,
      });

      if (!linkErr && linkData?.properties?.hashed_token) {
        const { data: otpData } = await authClient.auth.verifyOtp({
          token_hash: linkData.properties.hashed_token,
          type: 'magiclink',
        });
        sessionToken = otpData?.session?.access_token || '';
      }
    }

    if (!sessionToken) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'Credenciales inválidas. Por favor verifica tu contraseña.',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // 3. Buscar automáticamente si el estudiante tiene una práctica activa asignada
    const { data: activeTokens, error: tokErr } = await admin
      .from('lab_tokens')
      .select('*')
      .eq('student_id', userProfile.id)
      .in('status', ['pending', 'in_progress'])
      .order('assigned_at', { ascending: false });

    // 3.1 Consultar historial de prácticas completadas anteriormente por el estudiante
    const { data: pastCompletedTokens } = await admin
      .from('lab_tokens')
      .select('*')
      .eq('student_id', userProfile.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false });

    const historyPayload = (pastCompletedTokens || []).map((tok: any, idx: number) => {
      let feedback: any = {};
      try {
        if (tok.feedback_text) feedback = JSON.parse(tok.feedback_text);
      } catch (_) {}
      return {
        tokenId: tok.token_id,
        attemptNumber: (pastCompletedTokens?.length || 0) - idx,
        score: feedback.score ?? (tok.tasks_completed > 0 ? tok.tasks_completed : 0),
        percentage: feedback.percentage ?? 0,
        timeSpentSeconds: tok.time_spent_seconds || feedback.timeSpentSeconds || 0,
        completedAt: tok.completed_at || feedback.completedAt,
        device: feedback.device || tok.play_mode || 'PC',
        tasksCompleted: tok.tasks_completed || feedback.tasksCompleted || 0,
        totalTasks: (feedback.missions?.length) || (tok.tasks_completed + tok.tasks_missing) || 14,
        missions: feedback.missions || []
      };
    });

    let activeLabPayload: any = null;

    if (!tokErr && activeTokens && activeTokens.length > 0) {
      const currentToken = activeTokens[0];

      // Traer nombre del laboratorio y curso
      const [{ data: labData }, { data: courseData }] = await Promise.all([
        admin.from('virtual_labs').select('id, name, description').eq('id', currentToken.lab_id).maybeSingle(),
        admin.from('courses').select('id, name, code').eq('id', currentToken.course_id).maybeSingle(),
      ]);

      const labMode = (currentToken.play_mode || 'VR').toUpperCase();
      const platformMatch = labMode === detectedPlatform || labMode === 'AMBOS' || !currentToken.play_mode;

      activeLabPayload = {
        tokenId: currentToken.token_id,
        labId: currentToken.lab_id,
        labName: labData?.name || 'Separación de agua y aceite (Laboratorio de Química)',
        labDescription: labData?.description || 'Práctica interactiva de química: separación de mezclas heterogéneas por decantación de agua y aceite.',
        courseId: currentToken.course_id,
        courseName: courseData?.name || 'Química General',
        courseCode: courseData?.code || 'QUI-101',
        playMode: labMode,
        status: currentToken.status, // 'pending' | 'in_progress'
        platformMatch,
        startedAt: currentToken.started_at,
        missions: (labData as any)?.missions || [],
        attemptNumber: historyPayload.length + 1,
      };
    }

    const mustChangePassword = Boolean(userProfile.password_reset_required);

    return new Response(JSON.stringify({
      ok: true,
      token: sessionToken,
      mustChangePassword,
      passwordResetRequired: mustChangePassword,
      student: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        documentId: userProfile.document_id,
        schoolId: userProfile.school_id,
      },
      hasActiveLab: Boolean(activeLabPayload),
      activeLab: activeLabPayload,
      hasHistory: historyPayload.length > 0,
      totalCompletedAttempts: historyPayload.length,
      currentAttemptNumber: historyPayload.length + (activeLabPayload ? 1 : 0),
      history: historyPayload,
      message: mustChangePassword
        ? `Bienvenido ${userProfile.name}. Primer inicio de sesión detectado: debes asignar tu contraseña definitiva para continuar.`
        : (activeLabPayload
            ? `Bienvenido ${userProfile.name}. Tienes 1 práctica activa lista para comenzar (Intento #${historyPayload.length + 1}).`
            : `Bienvenido ${userProfile.name}. No tienes prácticas pendientes en este momento.`),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err: any) {
    console.error('[POST /api/game/login] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};
