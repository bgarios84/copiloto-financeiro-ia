"use client";

import * as React from "react";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { login, type LoginState } from "./actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ── Google Icon (SVG inline — sem lib extra) ──────────────────

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ── Submit Button ─────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "relative w-full flex items-center justify-center gap-2",
        "h-10 rounded-lg px-4 text-sm font-semibold text-white",
        "bg-gradient-to-r from-blue-600 to-blue-500",
        "shadow-md shadow-blue-500/25",
        "transition-all duration-200",
        "hover:opacity-90 hover:shadow-lg hover:shadow-blue-500/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Entrando...</span>
        </>
      ) : (
        "Entrar"
      )}
    </button>
  );
}

// ── LoginForm ─────────────────────────────────────────────────

const initialState: LoginState = {};

// Mensagens para erros vindos via ?error= na URL (OAuth callback)
const OAUTH_ERRORS: Record<string, string> = {
  oauth_cancelled: "Login com Google cancelado.",
  oauth_error:     "Erro ao autenticar com Google. Tente novamente.",
};

export function LoginForm() {
  const [state, formAction]  = useActionState(login, initialState);
  const [showPassword, setShowPassword] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [googleError,   setGoogleError]   = React.useState<string | null>(null);

  // Lê ?error= injetado pelo callback OAuth em caso de falha
  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");
  const oauthErrorMsg = urlError ? (OAUTH_ERRORS[urlError] ?? "Erro ao autenticar.") : null;

  // Mensagem de erro consolidada (prioridade: form action > oauth callback > google state)
  const errorMsg = state.error ?? oauthErrorMsg ?? googleError;

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setGoogleError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      setGoogleError("Erro ao conectar com Google. Tente novamente.");
      setGoogleLoading(false);
    }
    // Se sem erro: o browser redireciona para o Google — não resetar loading
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {errorMsg && (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-2.5 rounded-lg border px-3.5 py-3",
            "border-red-500/20 bg-red-500/10 text-red-400",
            "text-sm leading-snug"
          )}
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className={cn(
          "w-full flex items-center justify-center gap-2.5 h-10 rounded-lg px-4",
          "text-sm font-medium text-foreground",
          "border border-border bg-card",
          "transition-all duration-150",
          "hover:bg-secondary hover:border-border/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          "disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {googleLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Redirecionando...</span>
          </>
        ) : (
          <>
            <GoogleIcon className="h-4 w-4 shrink-0" />
            <span>Continuar com Google</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          ou
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Email + Password form */}
      <form action={formAction} className="space-y-4" noValidate>
        {/* Email */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-[13px] font-medium text-foreground/80">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="voce@exemplo.com"
            className={cn(
              "w-full h-10 rounded-lg px-3.5 text-sm",
              "bg-secondary border border-border",
              "text-foreground placeholder:text-muted-foreground",
              "transition-colors duration-150",
              "outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
              "disabled:opacity-50"
            )}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-[13px] font-medium text-foreground/80">
            Senha
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className={cn(
                "w-full h-10 rounded-lg pl-3.5 pr-10 text-sm",
                "bg-secondary border border-border",
                "text-foreground placeholder:text-muted-foreground",
                "transition-colors duration-150",
                "outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
                "disabled:opacity-50"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword
                ? <EyeOff className="h-4 w-4" />
                : <Eye    className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <SubmitButton />
      </form>
    </div>
  );
}
