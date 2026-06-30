"use client";

/**
 * Open Finance Banner — /accounts
 * Sprint 9.3B
 *
 * CTA embutido na tela de contas para conectar banco via Open Finance.
 * Reutiliza server actions de @/services/open-finance sem duplicar logica.
 *
 * Apos conexao bem-sucedida:
 *   1. saveConnection() — persiste a conexao
 *   2. syncConnectionAccounts() — importa contas automaticamente
 *   3. router.refresh() — re-fetch das contas do servidor
 *
 * Para gerenciamento avancado: /settings/open-finance
 */

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import {
  getConnectToken,
  saveConnection,
  syncConnectionAccounts,
} from "@/services/open-finance";

// Client-only — evita SSR do widget Pluggy
const PluggyConnect = dynamic(
  () =>
    import("react-pluggy-connect").then((m) => ({ default: m.PluggyConnect })),
  { ssr: false },
);

type BannerState = "idle" | "connecting" | "syncing";

export function OpenFinanceBanner() {
  const router = useRouter();

  const [connectToken, setConnectToken] = React.useState<string | null>(null);
  const [state,        setState]        = React.useState<BannerState>("idle");
  const [feedback,     setFeedback]     = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ── Abrir widget ──────────────────────────────────────────────────────────

  async function handleConnect() {
    setState("connecting");
    setFeedback(null);

    const result = await getConnectToken();
    if (result.error || !result.data) {
      setFeedback({ type: "error", message: result.error ?? "Erro ao gerar token." });
      setState("idle");
      return;
    }

    setConnectToken(result.data.connectToken);
    setState("idle");
  }

  // ── Callbacks do widget ───────────────────────────────────────────────────

  async function handleSuccess(data: { item: { id: string } }) {
    setConnectToken(null);
    setState("syncing");
    setFeedback(null);

    // 1. Salvar conexao
    const saveResult = await saveConnection(data.item.id);
    if (saveResult.error || !saveResult.data) {
      setFeedback({
        type:    "error",
        message: saveResult.error ?? "Erro ao salvar conexao.",
      });
      setState("idle");
      return;
    }

    // 2. Sincronizar contas automaticamente
    const syncResult = await syncConnectionAccounts(saveResult.data.id);
    setState("idle");

    if (syncResult.error) {
      setFeedback({
        type:    "error",
        message: `Banco conectado, mas erro ao sincronizar: ${syncResult.error}`,
      });
    } else {
      const n = syncResult.data.accountsSynced;
      setFeedback({
        type:    "success",
        message: `${n} conta${n !== 1 ? "s" : ""} importada${n !== 1 ? "s" : ""} com sucesso!`,
      });
      // 3. Re-fetch das contas do servidor
      router.refresh();
    }
  }

  function handleClose() {
    setConnectToken(null);
    setState("idle");
  }

  function handleError(err: { message: string }) {
    setConnectToken(null);
    setState("idle");
    setFeedback({ type: "error", message: err.message ?? "Erro no widget." });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isBusy = state !== "idle" || connectToken !== null;

  const buttonLabel =
    state === "connecting" ? "Abrindo..." :
    state === "syncing"    ? "Sincronizando..." :
                             "Conectar banco";

  return (
    <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
      {/* Widget Pluggy — visivel apenas com token */}
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          language="pt"
          includeSandbox={process.env.NODE_ENV !== "production"}
          onSuccess={handleSuccess}
          onError={handleError}
          onClose={handleClose}
        />
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <Zap className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              Conectar banco automaticamente
            </p>
            <p className="text-[12px] text-muted-foreground">
              Importe contas e saldos diretamente do seu banco via Open Finance.
            </p>
          </div>
        </div>

        <button
          onClick={handleConnect}
          disabled={isBusy}
          className="shrink-0 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isBusy && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {buttonLabel}
        </button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mt-3 rounded-lg border px-3 py-2 text-[12px] flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          <span>{feedback.message}</span>
          {feedback.type === "success" && (
            <a
              href="/settings/open-finance"
              className="shrink-0 underline underline-offset-2 opacity-80 hover:opacity-100"
            >
              Gerenciar conexoes
            </a>
          )}
        </div>
      )}
    </div>
  );
}
