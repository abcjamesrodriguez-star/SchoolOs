import type { APIRoute } from 'astro';
import { createAdminSupabase } from '../../../lib/supabase-admin';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const identifier = body?.identifier;

    if (!identifier || typeof identifier !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'Identificador requerido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const clean = identifier.trim();
    const supabase = createAdminSupabase();

    // 1. Buscar por document_id (insensible a mayúsculas)
    let { data: user } = await supabase
      .from('users')
      .select('email, role, status, document_id')
      .ilike('document_id', clean)
      .maybeSingle();

    // 2. Si no se encontró por document_id, buscar por email
    if (!user) {
      const { data: byEmail } = await supabase
        .from('users')
        .select('email, role, status, document_id')
        .ilike('email', clean)
        .maybeSingle();
      user = byEmail;
    }

    if (!user || !user.email) {
      return new Response(JSON.stringify({ ok: false, error: 'No se encontró ningún estudiante o cuenta con ese código.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, email: user.email, role: user.role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[/api/auth/lookup-identifier]', err);
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
