"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Server Action: logout
 *
 * Encerra a sessão do usuário no Supabase e redireciona para /login.
 * Pode ser chamado via <form action={logout}> em Client ou Server Components.
 *
 * @example
 * // Client Component
 * import { logout } from "@/lib/auth/actions";
 * <form action={logout}><button type="submit">Sair</button></form>
 */
export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
