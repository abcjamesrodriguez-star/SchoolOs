import { createAdminSupabase } from '../lib/supabase-admin';

export interface ProvisionResult {
  userId: string;
  confirmUrl: string;
  emailSent: boolean;
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
  siteUrl?: string;
}

function resolveSiteUrl(providedUrl?: string): string {
  if (providedUrl && providedUrl.startsWith('http')) {
    return providedUrl.replace(/\/$/, '');
  }
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.SITE_URL
    ? (import.meta.env.SITE_URL as string)
    : (typeof process !== 'undefined' ? process.env.SITE_URL : undefined);
  return (envUrl || 'http://localhost:4321').replace(/\/$/, '');
}

/**
 * Genera el enlace criptográfico oficial de Supabase Auth para invitar o recuperar acceso.
 */
export async function generateRectorInviteLink(email: string, siteUrl?: string): Promise<string> {
  const admin = createAdminSupabase();
  const baseUrl = resolveSiteUrl(siteUrl);
  const redirectTo = `${baseUrl}/cambiar-password`;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: inviteLinkData, error: inviteErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: cleanEmail,
      options: { redirectTo },
    });

    if (!inviteErr && inviteLinkData?.properties?.action_link) {
      return inviteLinkData.properties.action_link;
    }
  } catch (_) {}

  // Fallback si el usuario ya confirmó o existe: generar link de recuperación oficial
  try {
    const { data: recoveryData, error: recErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: cleanEmail,
      options: { redirectTo },
    });

    if (!recErr && recoveryData?.properties?.action_link) {
      return recoveryData.properties.action_link;
    }
  } catch (_) {}

  return `${baseUrl}/cambiar-password`;
}

/**
 * Reenvía la invitación oficial por correo a través del motor SMTP nativo de Supabase Cloud.
 */
export async function resendRectorInviteEmail(email: string, siteUrl?: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminSupabase();
  const baseUrl = resolveSiteUrl(siteUrl);
  const redirectTo = `${baseUrl}/cambiar-password`;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { error } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo,
    });

    if (error) {
      // Si ya está registrado, enviar correo de recuperación de contraseña nativo
      const { error: resetErr } = await admin.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });
      if (resetErr) {
        return { ok: false, error: resetErr.message };
      }
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Error reenviando invitación con Supabase SMTP.' };
  }
}

/**
 * Aprovisiona la cuenta de directivo/rector usando exclusivamente Supabase Auth Nativo.
 * Despacha el correo de invitación a través del SMTP configurado en el Dashboard de Supabase.
 */
export async function provisionRectorAccount(payload: RectorProvisioningPayload): Promise<ProvisionResult> {
  if (typeof window !== 'undefined') {
    throw new Error('[rectorProvisioningService] Este servicio solo puede ejecutarse en el servidor.');
  }

  const admin = createAdminSupabase();
  const email = payload.email.trim().toLowerCase();
  const baseUrl = resolveSiteUrl(payload.siteUrl);
  const redirectTo = `${baseUrl}/cambiar-password`;
  let targetUserId: string | null = null;
  let emailSent = false;

  // 1. Verificar si ya existe en Supabase Auth
  let existingAuthUser: any = null;
  try {
    const { data: userList } = await admin.auth.admin.listUsers({ perPage: 1000 });
    existingAuthUser = userList?.users?.find((u: any) => (u.email || '').toLowerCase() === email);
  } catch (listErr) {
    console.warn('[rectorProvisioningService] Advertencia consultando listUsers:', listErr);
  }

  // Si existe en Auth pero NO está confirmado (por ejemplo, pruebas anteriores o borrado previo sin confirmar),
  // eliminamos el usuario obsoleto para generar una invitación 100% limpia y sin tokens caducados.
  if (existingAuthUser && !existingAuthUser.confirmed_at) {
    try {
      await admin.auth.admin.deleteUser(existingAuthUser.id);
      existingAuthUser = null;
    } catch (_) {}
  }

  // 2. Invitar o re-notificar nativamente con Supabase Auth (despacha correo por Supabase SMTP)
  if (!existingAuthUser) {
    // Usuario nuevo o recreado: invitar limpiamente
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        name: payload.name.trim(),
        role: 'school_admin',
        school_id: payload.schoolId,
        avatar_url: payload.avatarUrl || null,
      },
      redirectTo,
    });

    if (inviteErr) {
      // Si por alguna razón colisiona, buscarlo en public.users
      const { data: existingDbUser } = await admin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingDbUser?.id) {
        targetUserId = existingDbUser.id;
      } else {
        throw inviteErr;
      }
    } else if (inviteData?.user) {
      targetUserId = inviteData.user.id;
      emailSent = true;
    }
  } else {
    // Usuario ya confirmado previamente: enviar correo de reseteo/activación nativo
    targetUserId = existingAuthUser.id;
    const resendRes = await resendRectorInviteEmail(email, baseUrl);
    emailSent = resendRes.ok;
  }

  if (!targetUserId) {
    throw new Error('No se pudo crear ni localizar la cuenta Auth del directivo.');
  }

  // 3. Upsert en public.users con permisos institucionales
  // Preservar avatar_url si viene en el payload (el que se subió o seleccionó)
  const profilePayload: any = {
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
    status: payload.status || 'invited',
    password_reset_required: true,
  };
  if (payload.avatarUrl) {
    profilePayload.avatar_url = payload.avatarUrl;
  }

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

  // 5. Enlace oficial de activación:
  // IMPORTANTE: Si el correo fue despachado exitosamente por Supabase SMTP (emailSent === true),
  // NO llamamos a generateLink porque eso sobreescribiría y quemaría el token enviado en el correo.
  // Solo generamos enlace criptográfico manual como fallback si el envío SMTP no se realizó.
  let confirmUrl = `${baseUrl}/cambiar-password`;
  if (!emailSent) {
    confirmUrl = await generateRectorInviteLink(email, baseUrl);
  }

  return { userId: targetUserId, confirmUrl, emailSent };
}
