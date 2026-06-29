import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase Server Client
 *
 * Use em Server Components, Server Actions e Route Handlers.
 * Lê e escreve cookies via next/headers — NUNCA exposto ao browser.
 *
 * @example
 * const supabase = await createClient()
 * const { data: { user } } = await supabase.auth.getUser()
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components não podem setar cookies.
            // O middleware trata isso — pode ignorar aqui com segurança.
          }
        },
      },
    }
  );
}
