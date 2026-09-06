import type { APIRoute } from 'astro';
import { createAdminSupabase } from '../../../lib/supabase-admin';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, teacherCode, phone, password, avatarUrl } = body;

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'Token de activación requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!teacherCode || !phone || !password) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Debes ingresar tu código docente, tu número de WhatsApp y tu nueva contraseña.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'La contraseña debe tener al menos 6 caracteres.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 1. Decodificar el token de activación
    let payload: any;
    try {
      if (token.includes('.')) {
        const parts = token.split('.');
        const rawPayload = Buffer.from(parts[1], 'base64url').toString('utf-8');
        payload = JSON.parse(rawPayload);
      } else {
        const raw = Buffer.from(token, 'base64url').toString('utf-8');
        payload = JSON.parse(raw);
      }
    } catch (e) {
      return new Response(
        JSON.stringify({ ok: false, error: 'El enlace de activación es inválido o está corrupto.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const expSec = payload.exp ? (payload.exp > 10000000000 ? Math.floor(payload.exp / 1000) : payload.exp) : null;

    if (expSec && nowSec > expSec) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Este enlace de activación ha expirado (48 horas). Solicita a la rectoría un nuevo envío.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const teacherId = payload.teacherId || payload.userId;
    const supabase = createAdminSupabase();

    // 2. Obtener el expediente del docente en public.users
    const { data: teacher, error: userErr } = await supabase
      .from('users')
      .select('id, name, email, role, school_id, document_id, phone, avatar_url, status')
      .eq('id', teacherId)
      .maybeSingle();

    if (userErr || !teacher) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Expediente docente no encontrado en la institución.' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Validar el Código Docente ingresado contra el registrado (Constatación de Identidad)
    const cleanInputCode = teacherCode.trim().toUpperCase().replace(/\s+/g, '');
    const cleanStoredCode = (teacher.document_id || '').trim().toUpperCase().replace(/\s+/g, '');

    const inputDigits = cleanInputCode.replace(/\D/g, '');
    const storedDigits = cleanStoredCode.replace(/\D/g, '');

    const isMatch =
      cleanInputCode === cleanStoredCode ||
      (inputDigits.length > 0 && inputDigits === storedDigits);

    if (!isMatch) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `El código docente ingresado (${teacherCode}) no coincide con el registrado. Revisa el código en tu correo o contrato.`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Validar el WhatsApp / Teléfono si la rectoría registró uno previo
    if (teacher.phone) {
      const inputPhoneDigits = phone.replace(/\D/g, '');
      const storedPhoneDigits = teacher.phone.replace(/\D/g, '');
      if (storedPhoneDigits.length >= 6 && inputPhoneDigits.length >= 6) {
        if (!inputPhoneDigits.includes(storedPhoneDigits) && !storedPhoneDigits.includes(inputPhoneDigits)) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'El número de WhatsApp ingresado no coincide con el registrado en tu vinculación oficial.',
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // 5. Actualizar contraseña en Supabase Auth
    const { error: authErr } = await supabase.auth.admin.updateUserById(teacherId, {
      password: password,
      email_confirm: true,
    });

    if (authErr) {
      throw new Error('Error al actualizar contraseña de acceso: ' + authErr.message);
    }

    // 6. Actualizar perfil del docente en public.users (estado activo, teléfono y avatar)
    const updatePayload: any = {
      phone: phone.trim(),
      status: 'active',
      password_reset_required: false,
      last_login_at: new Date().toISOString(),
    };

    if (avatarUrl) {
      updatePayload.avatar_url = avatarUrl;
    }

    const { data: updatedTeacher, error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', teacherId)
      .select('id, name, email, role, school_id, phone, status, avatar_url')
      .single();

    if (updateErr) {
      throw new Error('Error al actualizar estado del docente: ' + updateErr.message);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        user: updatedTeacher,
        message: '¡Cuenta docente activada exitosamente! Bienvenido a tu portal académico.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error en /api/auth/activate-teacher:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
