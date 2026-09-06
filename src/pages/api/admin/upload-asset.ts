import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';

/**
 * POST /api/admin/upload-asset
 * Sube logos o avatares a Supabase Storage desde el servidor (service_role).
 * Body: multipart/form-data
 *   - file: File
 *   - type: 'logo' | 'avatar'
 *   - slug: string (identificador de la escuela)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const auth = await requireAuth(request, ['super_admin']);
    if (!auth.ok) return auth.response;

    const supabase = auth.admin;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'logo';
    const slug = (formData.get('slug') as string) || 'unknown';

    if (!file || file.size === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No se recibio ningun archivo.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ ok: false, error: 'El archivo supera el limite de 5 MB.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Tipo de archivo no permitido. Usa PNG, JPEG, WebP, GIF o SVG.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ext = file.name.split('.').pop() || 'png';
    const folder = type === 'avatar' ? 'avatars' : 'logos';
    const filePath = `${folder}/${slug}-${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('school-assets')
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[upload-asset] Error subiendo archivo:', uploadError);
      return new Response(
        JSON.stringify({ ok: false, error: 'Error al subir el archivo al storage: ' + uploadError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data } = supabase.storage.from('school-assets').getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ ok: true, url: data.publicUrl, path: filePath }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[upload-asset] Error inesperado:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Error interno del servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
