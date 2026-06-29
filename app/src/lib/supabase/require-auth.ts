import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * requireAuth
 *
 * Helper para Server Components e Server Actions que exigem autenticação.
 * Verifica a sessão server-side e redireciona para /login se não autenticado.
 * Retorna o User autenticado para uso na página.
 *
 * O middleware já protege as rotas antes de chegarem aqui —
 * este helper serve como segunda camada de segurança e fornece o User.
 *
 * @example
 * // Em qualquer Server Component / layout:
 * import { requireAuth } from "@/lib/supabase/require-auth";
 *
 * export default async function ProtectedPage() {
 *   const user = await requireAuth();
 *   return <div>Olá, {user.email}</div>;
 * }
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
