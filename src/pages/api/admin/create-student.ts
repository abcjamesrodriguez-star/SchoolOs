export const prerender = false;

import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

/**
 * POST /api/admin/create-student
 * Crea un estudiante en Supabase Auth + public.users.
 * Requiere rol school_admin o super_admin.
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // ✅ Verificar sesión y rol antes de cualquier operación
    const auth = await requireAuth(request, ['school_admin', 'super_admin']);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin; // client con service_role — seguro en servidor

    const body = await request.json();
    const { email, password, name, school_id, document_id, role, specialty, job_title, avatar_url } = body;

    if (!school_id) {
      return new Response(JSON.stringify({ error: 'Falta school_id obligatorio para registrar el estudiante.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // school_admin solo puede crear estudiantes en su propia escuela
    if (auth.user.role === 'school_admin' && auth.user.schoolId !== school_id) {
      return new Response(JSON.stringify({ error: 'No puedes crear estudiantes en otra institución.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const normalizedDoc = (document_id || '').trim();
    let normalizedEmail = (email || '').trim().toLowerCase();

    // Si no se proporcionó correo explícito, generar correo institucional amigable con nombre y colegio
    if (!normalizedEmail && (name || normalizedDoc)) {
      let schoolSlug = 'colegio';
      if (school_id) {
        const { data: sch } = await supabase.from('schools').select('slug').eq('id', school_id).maybeSingle();
        if (sch?.slug) schoolSlug = sch.slug;
      }
      const cleanName = (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
      const parts = cleanName.split(/\s+/).filter(Boolean);
      let localPart = 'estudiante';
      if (parts.length === 1) localPart = parts[0];
      else if (parts.length === 2 || parts.length === 3) localPart = `${parts[0]}.${parts[1]}`;
      else if (parts.length >= 4) localPart = `${parts[0]}.${parts[2] || parts[1]}`;
      else if (normalizedDoc) localPart = `est.${normalizedDoc.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      normalizedEmail = `${localPart}@${schoolSlug}.edu.co`;
    }

    if (!normalizedEmail || !school_id) {
      return new Response(JSON.stringify({ error: 'Datos incompletos para crear el estudiante (código o correo requerido).' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar si el correo ya pertenece a otro estudiante registrado con distinto documento
    const { data: existingDbUser } = await supabase
      .from('users')
      .select('id, document_id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingDbUser && existingDbUser.document_id && normalizedDoc && existingDbUser.document_id !== normalizedDoc) {
      return new Response(JSON.stringify({
        error: `El correo institucional ${normalizedEmail} ya está asignado a otro estudiante (${existingDbUser.document_id}). Modifica el correo agregando un número o inicial.`
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initialPassword = (password || document_id || 'Estudiante2026*').trim();

    // 1. Crear directamente en Supabase Auth SIN despachar correos (email_confirm: true)
    let userId = '';
    const { data: userList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingAuth = userList?.users?.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);

    if (existingAuth) {
      userId = existingAuth.id;
      await supabase.auth.admin.updateUserById(userId, {
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          name: name || 'Estudiante',
          role: 'student',
          school_id,
          avatar_url: avatar_url || null,
        },
      });
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: initialPassword,
        email_confirm: true, // Ya confirmado para habilitar inicio de sesión directo
        user_metadata: {
          name: name || 'Estudiante',
          role: 'student',
          school_id,
          avatar_url: avatar_url || null,
        },
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      userId = created.user.id;
    }

    // 2. Guardar registro en public.users con password_reset_required: true
    const { error: dbError } = await supabase.from('users').upsert({
      id: userId,
      email: normalizedEmail,
      name: name?.trim() || 'Estudiante',
      role: 'student',
      school_id,
      document_type: 'EST',
      document_id: document_id || '',
      specialty: specialty || '',
      job_title: job_title || '',
      avatar_url: avatar_url || null,
      status: 'active',
      password_reset_required: true, // Forzar pantalla de primer login (confirmar avatar y contraseña)
    }, { onConflict: 'id' });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Auto-matricular al estudiante en las materias correspondientes a su salón
    if (job_title && school_id) {
      try {
        const { data: salonClasses } = await supabase
          .from('classes')
          .select('course_id')
          .eq('school_id', school_id)
          .eq('classroom', job_title);

        const courseIds = Array.from(new Set((salonClasses || []).map((c: any) => c.course_id).filter(Boolean)));
        if (courseIds.length > 0) {
          const enrollments = courseIds.map((cId: any) => ({
            course_id: cId,
            student_id: userId,
            status: 'enrolled',
          }));
          await supabase.from('course_students').upsert(enrollments, { onConflict: 'course_id,student_id' });
        }
      } catch (enrErr) {
        console.warn('[create-student] Error en auto-matriculación de materias:', enrErr);
      }
    }

    // 3. Registrar en auditoría
    try {
      await supabase.from('audit_logs').insert({
        actor_email: auth.user.email,
        action: 'user.created_student',
        target_name: normalizedEmail,
        target_type: 'user',
        details: { userId, school_id, role: 'student', document_id },
      });
    } catch {}

    return new Response(JSON.stringify({
      success: true,
      ok: true,
      userId,
      email: normalizedEmail,
      defaultPassword: initialPassword,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Error /api/admin/create-student:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
