import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /auth/callback
 *
 * Ponto de retorno do fluxo OAuth (Google, etc.).
 * O Supabase redireciona aqui após autorização com ?code=<authorization_code>.
 *
 * Fluxo:
 * 1. Supabase redireciona para esta rota com ?code=...
 * 2. Trocamos o code por uma sessão via exchangeCodeForSession()
 * 3. Redirecionamos para /dashboard (ou /login em caso de erro)
 *
 * IMPORTANTE: a URL desta rota deve estar cadastrada no Supabase Dashboard
 * em Authentication → URL Configuration → Redirect URLs:
 *   http://localhost:3000/auth/callback   (desenvolvimento)
 *   https://seudominio.com/auth/callback  (produção)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Erro retornado pelo provider (ex: usuário cancelou)
  if (error) {
    console.error("[auth/callback] OAuth error:", error, errorDescription);
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", "oauth_cancelled");
    return NextResponse.redirect(loginUrl.toString());
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
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
              // Server Component — ignorar silenciosamente
            }
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", exchangeError.message);
  }

  // Fallback: redireciona para login com erro genérico
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "oauth_error");
  return NextResponse.redirect(loginUrl.toString());
}
