import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase Browser Client
 *
 * Use em Client Components ("use client").
 * Cria uma instância singleton por render — seguro chamar em hooks.
 *
 * @example
 * const supabase = createClient()
 * const { data } = await supabase.auth.getUser()
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
