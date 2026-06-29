import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Service-Role Client
 *
 * Bypassa Row Level Security — use APENAS em Server Actions e Route Handlers
 * para operações administrativas (ex: gravar cotações de mercado).
 *
 * NUNCA importe este módulo em Client Components.
 *
 * Requer variável de ambiente:
 *   SUPABASE_SERVICE_ROLE_KEY — disponível no Supabase Dashboard → Settings → API
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL não configurada.");
  if (!key) throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY não configurada. " +
    "Adicione ao .env.local: SUPABASE_SERVICE_ROLE_KEY=<sua-chave>"
  );

  return createSupabaseClient(url, key, {
    auth: {
      // Desabilita persistência de sessão — este client é stateless
      autoRefreshToken:  false,
      persistSession:    false,
      detectSessionInUrl: false,
    },
  });
}
