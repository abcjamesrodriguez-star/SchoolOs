import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { data: fullProfile } = await auth.admin
      .from('users')
      .select('*')
      .eq('id', auth.user.id)
      .maybeSingle();

    let school = null;
    const targetSchoolId = fullProfile?.school_id || auth.user.schoolId;
    if (targetSchoolId) {
      const { data: schoolData } = await auth.admin
        .from('schools')
        .select('*')
        .eq('id', targetSchoolId)
        .maybeSingle();
      school = schoolData;
    }

    const profile = {
      id: auth.user.id,
      email: auth.user.email,
      name: fullProfile?.name || auth.user.name,
      role: auth.user.role,
      schoolId: targetSchoolId,
      schoolName: school?.name,
      schoolSlug: school?.slug,
      schoolStatus: school?.status,
      status: auth.user.status,
      avatarUrl: fullProfile?.avatar_url || undefined,
      phone: fullProfile?.phone || undefined,
      documentType: fullProfile?.document_type || undefined,
      documentId: fullProfile?.document_id || undefined,
      createdAt: fullProfile?.created_at,
      lastLoginAt: fullProfile?.last_login_at || undefined,
      passwordResetRequired: fullProfile?.password_reset_required || false,
      updatedAt: fullProfile?.updated_at || fullProfile?.created_at,
    };

    return new Response(JSON.stringify({ ok: true, profile, school }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};