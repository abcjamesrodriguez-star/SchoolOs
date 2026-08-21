import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requirePublicEnv(name: "PUBLIC_SUPABASE_URL" | "PUBLIC_SUPABASE_PUBLISHABLE_KEY") {
  const value = import.meta.env[name];
  if (!value) {
    throw new Error(`Falta ${name} en .env. Copia .env.example a .env y rellena las claves.`);
  }
  return value as string;
}

/** Cliente del navegador. Usa la publishable key. RLS aplica. */
export function createBrowserSupabase(): SupabaseClient {
  return createClient(requirePublicEnv("PUBLIC_SUPABASE_URL"), requirePublicEnv("PUBLIC_SUPABASE_PUBLISHABLE_KEY"));
}

export const supabase = createBrowserSupabase();
