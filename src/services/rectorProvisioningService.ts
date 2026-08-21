import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

function createIsolatedAuthClient() {
  return createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
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

export async function provisionRectorAccount(payload: RectorProvisioningPayload): Promise<string> {
  const email = payload.email.trim().toLowerCase();
  const isolatedAuth = createIsolatedAuthClient();
  let targetUserId: string | null = null;

  const { data: authData, error: authError } = await isolatedAuth.auth.signUp({
    email,
    password: payload.password || 'Rector2026!*',
    options: {
      data: {
        name: payload.name,
        role: 'school_admin',
        school_id: payload.schoolId,
      },
    },
  });

  if (authError) {
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingError || !existingUser?.id) {
      throw authError;
    }

    targetUserId = existingUser.id;
  } else if (authData.user?.id) {
    targetUserId = authData.user.id;
  }

  if (!targetUserId) {
    throw new Error('No se pudo crear o localizar el usuario Auth del rector.');
  }

  const profilePayload = {
    id: targetUserId,
    name: payload.name,
    email,
    role: 'school_admin',
    school_id: payload.schoolId,
    document_type: payload.documentType || 'CC',
    document_id: payload.documentId || null,
    phone: payload.phone || null,
    job_title: payload.jobTitle || 'Rector General',
    specialty: payload.specialty || null,
    appointment_date: payload.appointmentDate || null,
    avatar_url: payload.avatarUrl || null,
    status: payload.status || 'active',
  };

  const { error: upsertError } = await supabase
    .from('users')
    .upsert(profilePayload);

  if (upsertError) {
    throw upsertError;
  }

  const { error: schoolError } = await supabase
    .from('schools')
    .update({
      rector_name: payload.name,
      rector_email: email,
    })
    .eq('id', payload.schoolId);

  if (schoolError) {
    throw schoolError;
  }

  return targetUserId;
}
