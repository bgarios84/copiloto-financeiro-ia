import { redirect } from "next/navigation";
import { Sparkles, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Entrar",
  description: "Acesse sua conta do Copiloto Financeiro IA",
};

/**
 * /login — Server Component
 *
 * Verifica a sessão server-side antes de renderizar.
 * Usuários autenticados são redirecionados diretamente para /dashboard.
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-10 bg-sidebar relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold text-white tracking-tight">
              Copiloto Financeiro
            </span>
            <span className="text-[10px] text-sidebar-muted uppercase tracking-widest">
              IA · Beta
            </span>
          </div>
        </div>

        {/* Center copy */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
              Inteligência financeira<br />
              <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
                ao seu alcance.
              </span>
            </h1>
            <p className="text-base text-sidebar-muted max-w-sm leading-relaxed">
              Monitore patrimônio, investimentos e metas em tempo real — com IA que entende suas finanças.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {["Patrimônio em tempo real", "IA preditiva", "Metas inteligentes", "Multi-banco"].map((feat) => (
              <span
                key={feat}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[12px] text-sidebar-muted"
              >
                {feat}
              </span>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="relative flex items-center gap-2 text-[12px] text-sidebar-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Dados criptografados · Nunca compartilhados · SOC 2 Type II</span>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-10">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center gap-2.5 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[15px] font-semibold text-foreground">Copiloto Financeiro</span>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Bem-vindo de volta
            </h2>
            <p className="text-sm text-muted-foreground">
              Entre com sua conta para continuar
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <LoginForm />
          </div>

          {/* Footer */}
          <p className="text-center text-[12px] text-muted-foreground">
            Dados simulados · Não constitui aconselhamento financeiro
          </p>
        </div>
      </div>
    </div>
  );
}
