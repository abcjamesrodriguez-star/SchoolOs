import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Solo servidor (páginas Astro, endpoints). Salta RLS.
 * No importar esto desde componentes React del cliente.
 */
export function createAdminSupabase(): SupabaseClient {
  const url = import.meta.env.SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL;
  const secret = import.meta.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    throw new Error("Falta SUPABASE_URL o SUPABASE_SECRET_KEY en .env (solo servidor).");
  }

  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
