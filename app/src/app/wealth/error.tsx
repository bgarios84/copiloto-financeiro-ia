"use client";

/**
 * Error Boundary — Patrimônio
 * Sprint 8.6 — Hardening Pré-Open Finance
 *
 * Captura erros de Server Components e exibe fallback amigável.
 * O botão "Tentar novamente" re-renderiza o segmento sem recarregar a página.
 */

import * as React from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log do erro para monitoramento (não expõe detalhes ao usuário)
    console.error("[error-boundary:wealth]", error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
        <svg
          className="h-6 w-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>

      <div className="space-y-1">
        <h2 className="text-[15px] font-semibold text-white">
          Algo deu errado
        </h2>
        <p className="max-w-sm text-[13px] text-zinc-400">
          Não foi possível carregar o patrimônio. Tente novamente ou recarregue a página.
        </p>
      </div>

      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
      >
        Tentar novamente
      </button>
    </div>
  );
}
