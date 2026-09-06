import { createAdminSupabase } from '../lib/supabase-admin';
import { createConfirmToken, hashToken, getConfirmUrl } from '../lib/jwtConfirm';
import { sendConfirmRectorEmail } from '../lib/email';

export interface ProvisionResult {
  userId: string;
  confirmUrl: string;
  emailSent?: boolean;
}

export interface RectorProvisioningPayload {
  schoolId: string;
  name: string;
  email: string;
  password?: string;
  status?: 'active' | 'invited' | 'suspended';
  avatarUrl?: string | null;
  documentType?: string;
  documentId?: string | null;
  phone?: string | null;
  jobTitle?: string;
  specialty?: string | null;
  appointmentDate?: string | null;
}

/**
 * Servicio de servidor para aprovisionar la cuenta directiva de una institución.
 * Se ejecuta exclusivamente en Node.js (Astro SSR y API Routes).
 */
export async function provisionRectorAccount(payload: RectorProvisioningPayload): Promise<ProvisionResult> {
  if (typeof window !== 'undefined') {
    throw new Error('[rectorProvisioningService] Este servicio solo puede ejecutarse en el servidor.');
  }

  const admin = createAdminSupabase();
  const email = payload.email.trim().toLowerCase();
  let targetUserId: string | null = null;

  // 1. Buscar si el usuario ya existe en Supabase Auth
  try {
    const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const existing = userList?.users?.find(u => (u.email || '').toLowerCase() === email);
    if (existing) {
      targetUserId = existing.id;
    }
  } catch (listErr) {
    console.warn('[rectorProvisioningService] Advertencia consultando listUsers:', listErr);
  }

  // 2. Si no existe en Auth, crearlo administrativamente
  if (!targetUserId) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: payload.password || 'Rector2026!*',
      email_confirm: true,
      user_metadata: {
        name: payload.name.trim(),
        role: 'school_admin',
        school_id: payload.schoolId,
      },
    });

    if (createErr) {
      // Si falló por ya existir, buscarlo en public.users
      const { data: existingDbUser } = await admin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingDbUser?.id) {
        targetUserId = existingDbUser.id;
      } else {
        throw createErr;
      }
    } else if (created.user) {
      targetUserId = created.user.id;
    }
  }

  if (!targetUserId) {
    throw new Error('No se pudo crear ni localizar la cuenta Auth del directivo.');
  }

  // 3. Upsert en public.users con permisos y metadatos
  const profilePayload = {
    id: targetUserId,
    name: payload.name.trim(),
    email,
    role: 'school_admin',
    school_id: payload.schoolId,
    document_type: payload.documentType || 'CC',
    document_id: payload.documentId?.trim() || null,
    phone: payload.phone?.trim() || null,
    job_title: payload.jobTitle || 'Rector General',
    specialty: payload.specialty?.trim() || null,
    appointment_date: payload.appointmentDate || null,
    avatar_url: payload.avatarUrl || null,
    status: payload.status || 'invited',
    password_reset_required: true,
  };

  const { error: upsertError } = await admin
    .from('users')
    .upsert(profilePayload, { onConflict: 'id' });

  if (upsertError) {
    throw upsertError;
  }

  // 4. Vincular el rector en la tabla public.schools
  const { error: schoolError } = await admin
    .from('schools')
    .update({
      rector_name: payload.name.trim(),
      rector_email: email,
    })
    .eq('id', payload.schoolId);

  if (schoolError) {
    console.warn('[rectorProvisioningService] Advertencia actualizando rector en schools:', schoolError);
  }

  // 5. Generar JWT de confirmación y ticket de activación
  let confirmUrl = '';
  let emailSent = false;
  try {
    const token = createConfirmToken({ userId: targetUserId, email, schoolId: payload.schoolId });
    const tokenHash = hashToken(token);
    confirmUrl = getConfirmUrl(token);

    // Guardar ticket en la base de datos (con fallback si el RPC no existe)
    try {
      await admin.rpc('create_email_confirm_ticket', { p_user_id: targetUserId, p_token_hash: tokenHash });
    } catch {
      await admin.from('email_confirm_tickets').insert({
        user_id: targetUserId,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    // 6. Enviar correo de confirmación directamente desde Node.js (Nodemailer / SMTP)
    try {
      const { data: school } = await admin
        .from('schools')
        .select('name,slogan')
        .eq('id', payload.schoolId)
        .maybeSingle();

      const mailRes = await sendConfirmRectorEmail({
        to: email,
        rectorName: payload.name.trim(),
        schoolName: school?.name || 'Institución',
        schoolSlogan: school?.slogan || undefined,
        schoolId: payload.schoolId,
        confirmUrl,
      });

      emailSent = mailRes.ok;
    } catch (mailErr) {
      console.warn('[rectorProvisioningService] Correo no enviado, link generado:', confirmUrl, mailErr);
    }
  } catch (jwtErr) {
    console.warn('[rectorProvisioningService] No se pudo generar ticket JWT:', jwtErr);
  }

  return { userId: targetUserId, confirmUrl, emailSent };
}
