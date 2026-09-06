import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

async function createSchoolRecord(supabase: any, dataToCreate: any) {
  if (!dataToCreate || !dataToCreate.name || !dataToCreate.slug) {
    throw new Error('Faltan campos obligatorios (nombre o slug de la escuela).');
  }

  const payload: any = {
    name: dataToCreate.name.trim(),
    slug: dataToCreate.slug.trim(),
    domain: dataToCreate.domain || `${dataToCreate.slug.trim()}.schoolos.edu`,
    location: dataToCreate.location || null,
    country: dataToCreate.country || 'Colombia',
    timezone: dataToCreate.timezone || 'America/Bogota (UTC-5)',
    plan_name: dataToCreate.planName || 'Professional',
    contact_email: dataToCreate.contactEmail || `admin@${dataToCreate.slug.trim()}.edu`,
    status: dataToCreate.status || 'active',
    audit_status: 'none',
    student_count: 0,
    teacher_count: 0,
    active_classes_count: 0,
  };

  if (dataToCreate.logoUrl) payload.logo_url = dataToCreate.logoUrl;
  if (dataToCreate.slogan) payload.slogan = dataToCreate.slogan;
  if (dataToCreate.address) payload.address = dataToCreate.address;
  if (dataToCreate.phone) payload.phone = dataToCreate.phone;
  if (dataToCreate.brandColor) payload.brand_color = dataToCreate.brandColor;
  if (dataToCreate.rectorName) payload.rector_name = dataToCreate.rectorName;
  if (dataToCreate.rectorEmail) payload.rector_email = dataToCreate.rectorEmail;

  const { data: createdSchool, error: insertError } = await supabase
    .from('schools')
    .insert(payload)
    .select()
    .single();

  if (insertError) throw insertError;
  return createdSchool;
}

async function purgeSchoolRecord(supabase: any, schoolId: string, actor: any) {
  if (!schoolId) {
    throw new Error('Falta schoolId obligatorio');
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(schoolId);
  const schoolQuery = supabase.from('schools').select('*');
  const { data: targetSchool } = isUuid
    ? await schoolQuery.eq('id', schoolId).maybeSingle()
    : await schoolQuery.eq('slug', schoolId).maybeSingle();

  const realSchoolId = targetSchool?.id || schoolId;
  const schoolSlug = targetSchool?.slug || '';
  const rectorEmail = (targetSchool?.rector_email || '').toLowerCase().trim();

  // 1. Obtener usuarios asociados
  const userFilters = [`school_id.eq.${realSchoolId}`];
  if (rectorEmail) userFilters.push(`email.eq.${rectorEmail}`);

  const { data: schoolUsers } = await supabase
    .from('users')
    .select('id, email, name, role')
    .or(userFilters.join(','));

  const userIdsSet = new Set<string>();
  const userEmailsSet = new Set<string>();

  (schoolUsers || []).forEach((u: any) => {
    if (u.id) userIdsSet.add(u.id);
    if (u.email) userEmailsSet.add(u.email.toLowerCase().trim());
  });

  try {
    const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    (authList?.users || []).forEach((au: any) => {
      const mSchoolId = au.user_metadata?.school_id || au.user_metadata?.schoolId;
      const auMail = (au.email || '').toLowerCase().trim();
      if (mSchoolId === realSchoolId || (schoolSlug && mSchoolId === schoolSlug) || (rectorEmail && auMail === rectorEmail)) {
        userIdsSet.add(au.id);
        if (au.email) userEmailsSet.add(auMail);
      }
    });
  } catch (authListErr) {
    console.warn('[PURGE_SCHOOL] Advertencia listando auth users:', authListErr);
  }

  const allUserIds = Array.from(userIdsSet);
  const allUserEmails = Array.from(userEmailsSet);

  // 2. Borrar tickets
  if (allUserIds.length > 0) {
    await supabase.from('email_confirm_tickets').delete().in('user_id', allUserIds);
    await supabase.from('password_reset_tickets').delete().in('user_id', allUserIds);
  }
  if (allUserEmails.length > 0) {
    await supabase.from('password_reset_tickets').delete().in('target_email', allUserEmails);
  }

  // 3. Borrar dependencias académicas
  const academicTables = [
    'attendances',
    'grades',
    'evaluations',
    'guides',
    'classes',
    'courses',
    'students',
    'teachers',
    'school_memberships',
    'invitations',
  ];

  for (const table of academicTables) {
    try {
      await supabase.from(table).delete().eq('school_id', realSchoolId);
    } catch {}
  }

  // 4. Borrar usuarios
  if (allUserIds.length > 0) {
    await supabase.from('users').delete().in('id', allUserIds);
  }
  if (allUserEmails.length > 0) {
    await supabase.from('users').delete().in('email', allUserEmails);
  }
  await supabase.from('users').delete().eq('school_id', realSchoolId);
  if (schoolSlug) {
    await supabase.from('users').delete().eq('school_id', schoolSlug);
  }

  // 5. Borrar cuentas de Supabase Auth
  for (const uid of allUserIds) {
    try {
      await supabase.auth.admin.deleteUser(uid);
    } catch (_) {}
  }

  // 6. Eliminar registro de escuela
  const { error: delSchoolErr } = await supabase.from('schools').delete().eq('id', realSchoolId);
  if (delSchoolErr) throw delSchoolErr;

  // 7. Auditoría
  try {
    await supabase.from('audit_logs').insert({
      actor_email: actor.email,
      action: 'school.purged_permanent',
      target_name: targetSchool?.name || realSchoolId,
      target_type: 'school',
      details: {
        schoolId: realSchoolId,
        schoolName: targetSchool?.name,
        purgedUsersCount: allUserIds.length,
        purgedAt: new Date().toISOString(),
        purgedByUserId: actor.id,
      },
    });
  } catch {}

  return {
    purgedSchoolId: realSchoolId,
    purgedUsersCount: allUserIds.length,
    schoolName: targetSchool?.name,
  };
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const slug = url.searchParams.get('slug');

    let query = auth.admin.from('schools').select('*');
    if (id) {
      const { data, error } = await query.eq('id', id).maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, school: data }), { status: 200 });
    }
    if (slug) {
      const { data, error } = await query.eq('slug', slug).maybeSingle();
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, school: data }), { status: 200 });
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, schools: data || [] }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin;
    const body = await request.json();
    const { action, schoolId, updates, rectorId, school } = body;

    // Compatibilidad: purge / delete
    if (action === 'delete_school' || action === 'purge_school') {
      const result = await purgeSchoolRecord(supabase, schoolId, auth.user);
      return new Response(
        JSON.stringify({
          ok: true,
          message: `Institución "${result.schoolName || result.purgedSchoolId}" purgada con éxito.`,
          ...result,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Compatibilidad: quick_activate_rector
    if (action === 'quick_activate_rector') {
      if (!rectorId) {
        return new Response(JSON.stringify({ ok: false, error: 'Falta rectorId' }), { status: 400 });
      }
      const { data, error } = await supabase
        .from('users')
        .update({ status: 'active', password_reset_required: false })
        .eq('id', rectorId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, user: data }), { status: 200 });
    }

    // Compatibilidad: suspend_or_reactivate
    if (action === 'suspend_or_reactivate') {
      if (!schoolId || !updates?.status) {
        return new Response(JSON.stringify({ ok: false, error: 'Faltan parámetros (schoolId o status)' }), { status: 400 });
      }
      const { data, error } = await supabase
        .from('schools')
        .update({ status: updates.status })
        .eq('id', schoolId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, school: data }), { status: 200 });
    }

    // Creación de escuela (action === 'create_school' o llamada POST REST directa)
    const dataToCreate = school || (action === 'create_school' ? (school || updates) : body);
    const createdSchool = await createSchoolRecord(supabase, dataToCreate);

    return new Response(JSON.stringify({ ok: true, school: createdSchool }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error en /api/admin/school:', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { schoolId, updates } = body;
    const targetId = schoolId || body.id;
    const patchData = updates || body;

    if (!targetId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta schoolId' }), { status: 400 });
    }

    const schoolPayload: any = {};
    if (patchData.name !== undefined) schoolPayload.name = patchData.name;
    if (patchData.slug !== undefined) schoolPayload.slug = patchData.slug;
    if (patchData.slogan !== undefined) schoolPayload.slogan = patchData.slogan;
    if (patchData.brandColor !== undefined) schoolPayload.brand_color = patchData.brandColor;
    if (patchData.logoUrl !== undefined) schoolPayload.logo_url = patchData.logoUrl;
    if (patchData.domain !== undefined) schoolPayload.domain = patchData.domain;
    if (patchData.contactEmail !== undefined) schoolPayload.contact_email = patchData.contactEmail;
    if (patchData.location !== undefined) schoolPayload.location = patchData.location;
    if (patchData.country !== undefined) schoolPayload.country = patchData.country;
    if (patchData.address !== undefined) schoolPayload.address = patchData.address;
    if (patchData.phone !== undefined) schoolPayload.phone = patchData.phone;
    if (patchData.timezone !== undefined) schoolPayload.timezone = patchData.timezone;
    if (patchData.planName !== undefined) schoolPayload.plan_name = patchData.planName;
    if (patchData.status !== undefined) schoolPayload.status = patchData.status;

    const { data: updatedSchool, error: updateErr } = await auth.admin
      .from('schools')
      .update(schoolPayload)
      .eq('id', targetId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ ok: true, school: updatedSchool }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), { status: 500 });
  }
};

export const PUT = PATCH;

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const idFromQuery = url.searchParams.get('id') || url.searchParams.get('schoolId');
    const body = await request.json().catch(() => ({}));
    const schoolId = idFromQuery || body.schoolId || body.id;

    if (!schoolId) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta id de escuela a eliminar' }), { status: 400 });
    }

    const result = await purgeSchoolRecord(auth.admin, schoolId, auth.user);
    return new Response(JSON.stringify({ ok: true, message: 'Escuela eliminada exitosamente.', ...result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno al eliminar' }), { status: 500 });
  }
};
