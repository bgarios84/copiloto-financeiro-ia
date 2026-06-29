import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

// Rotas que exigem autenticação
const PROTECTED_ROUTES = ["/dashboard", "/accounts", "/transactions", "/investments", "/portfolio", "/budget", "/reports", "/ai", "/planning", "/alerts", "/settings"];

// Rotas de autenticação (redireciona para /dashboard se já logado)
const AUTH_ROUTES = ["/login"];

/**
 * Middleware Next.js (Edge Runtime)
 *
 * 1. Renova o JWT do Supabase (via updateSession)
 * 2. Redireciona rotas protegidas → /login quando sem sessão
 * 3. Redireciona rotas de auth → /dashboard quando com sessão
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verifica se a rota precisa de proteção ou é de auth
  const isProtected = PROTECTED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isAuthRoute  = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  // Se não for rota relevante, só renova sessão e segue
  if (!isProtected && !isAuthRoute) {
    return await updateSession(request);
  }

  // Para rotas relevantes, verifica a sessão
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Sem sessão tentando acessar rota protegida → /login
  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Com sessão tentando acessar rota de auth → /dashboard
  if (user && isAuthRoute) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    return NextResponse.redirect(dashUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
