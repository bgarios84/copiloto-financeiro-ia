"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  error?: string;
}

/**
 * Server Action: login
 *
 * Autentica o usuário com email e senha via Supabase Auth.
 * Em caso de sucesso, redireciona para /dashboard.
 * Em caso de erro, retorna a mensagem para exibição no formulário.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email    = formData.get("email")?.toString().trim()    ?? "";
  const password = formData.get("password")?.toString().trim() ?? "";

  // Validação básica client-side já cobre, mas validamos aqui também
  if (!email || !password) {
    return { error: "Preencha e-mail e senha." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Traduzir mensagens do Supabase para pt-BR
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("invalid_credentials")
    ) {
      return { error: "E-mail ou senha incorretos." };
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Confirme seu e-mail antes de entrar." };
    }
    if (error.message.includes("Too many requests")) {
      return { error: "Muitas tentativas. Aguarde alguns minutos." };
    }
    return { error: "Ocorreu um erro. Tente novamente." };
  }

  // Redireciona server-side (não retorna — lança Next.js redirect)
  redirect("/dashboard");
}
