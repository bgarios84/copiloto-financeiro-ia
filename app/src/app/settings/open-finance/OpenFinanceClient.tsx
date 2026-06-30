"use client";

/**
 * Open Finance — Connection UI
 * Sprint 9.2 — Connection Flow
 * Sprint 9.3B — Sync Button
 */

import * as React from "react";
import dynamic from "next/dynamic";
import {
  getConnectToken,
  saveConnection,
  deleteConnection,
  syncConnectionAccounts,
} from "@/services/open-finance";
import type { OFConnectionWithInstitution } from "@/services/open-finance";
import { OPEN_FINANCE_CONNECTION_STATUS_LABELS } from "@/types/open-finance";

// Carregamento dinamico (client-only) para evitar problemas de SSR.
// Requer: npm install react-pluggy-connect
const PluggyConnect = dynamic(
  () =>
    import("react-pluggy-connect").then((m) => ({ default: m.PluggyConnect })),
  { ssr: false },
);

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    connected:           "bg-emerald-500/15 text-emerald-400",
    syncing:             "bg-blue-500/15 text-blue-400",
    expired:             "bg-amber-500/15 text-amber-400",
    error:               "bg-red-500/15 text-red-400",
    disconnected:        "bg-zinc-500/15 text-zinc-400",
    pending:             "bg-zinc-500/15 text-zinc-400",
    pending_user_action: "bg-amber-500/15 text-amber-400",
  };
  const label =
    OPEN_FINANCE_CONNECTION_STATUS_LABELS[
      status as keyof typeof OPEN_FINANCE_CONNECTION_STATUS_LABELS
    ] ?? status;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${colors[status] ?? "bg-zinc-500/15 text-zinc-400"}`}
    >
      {label}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  initialConnections: OFConnectionWithInstitution[];
  error:              string | null;
}

export function OpenFinanceClient({ initialConnections, error }: Props) {
  const [connections, setConnections] =
    React.useState<OFConnectionWithInstitution[]>(initialConnections);

  // connectToken definido apenas enquanto o widget deve estar visivel.
  const [connectToken, setConnectToken] = React.useState<string | null>(null);

  const [connecting,  setConnecting]  = React.useState(false);
  const [syncingId,   setSyncingId]   = React.useState<string | null>(null);
  const [deletingId,  setDeletingId]  = React.useState<string | null>(null);
  const [feedback,    setFeedback]    = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ── Abrir widget ────────────────────────────────────────────────────────────

  async function handleConnect() {
    setConnecting(true);
    setFeedback(null);

    const tokenResult = await getConnectToken();
    if (tokenResult.error || !tokenResult.data) {
      setFeedback({
        type:    "error",
        message: tokenResult.error ?? "Erro ao gerar token de conexao.",
      });
      setConnecting(false);
      return;
    }

    setConnectToken(tokenResult.data.connectToken);
    setConnecting(false);
  }

  // ── Callbacks do widget ─────────────────────────────────────────────────────

  async function handleSuccess(data: { item: { id: string } }) {
    setConnectToken(null);
    setFeedback(null);

    const saveResult = await saveConnection(data.item.id);
    if (saveResult.error || !saveResult.data) {
      setFeedback({
        type:    "error",
        message: saveResult.error ?? "Erro ao salvar conexao.",
      });
    } else {
      setConnections((prev) => {
        const exists = prev.find((c) => c.provider_item_id === data.item.id);
        if (exists) return prev;
        return [saveResult.data as OFConnectionWithInstitution, ...prev];
      });
      setFeedback({ type: "success", message: "Banco conectado com sucesso!" });
    }
  }

  function handleClose() {
    setConnectToken(null);
    setConnecting(false);
  }

  function handleWidgetError(err: { message: string }) {
    setConnectToken(null);
    setConnecting(false);
    setFeedback({
      type:    "error",
      message: err.message ?? "Erro no widget de conexao.",
    });
  }

  // ── Sincronizar contas ──────────────────────────────────────────────────────

  async function handleSync(connectionId: string) {
    setSyncingId(connectionId);
    setFeedback(null);

    // Reflete status "syncing" imediatamente na UI
    setConnections((prev) =>
      prev.map((c) =>
        c.id === connectionId ? { ...c, status: "syncing" } : c,
      ),
    );

    const result = await syncConnectionAccounts(connectionId);

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      // Reverte status visual para o estado anterior
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId ? { ...c, status: "error" } : c,
        ),
      );
    } else {
      const { accountsSynced, errors } = result.data;
      const msg =
        errors.length === 0
          ? `${accountsSynced} conta(s) sincronizada(s) com sucesso.`
          : `${accountsSynced} conta(s) sincronizada(s). Avisos: ${errors[0]}`;
      setFeedback({ type: errors.length === 0 ? "success" : "error", message: msg });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === connectionId
            ? { ...c, status: "connected", last_synced_at: new Date().toISOString() }
            : c,
        ),
      );
    }

    setSyncingId(null);
  }

  // ── Remover conexao ─────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    setFeedback(null);
    const result = await deleteConnection(id);
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setConnections((prev) => prev.filter((c) => c.id !== id));
    }
    setDeletingId(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isBusy = connecting || syncingId !== null || deletingId !== null;

  return (
    <>
      {/* Widget Pluggy — visivel apenas quando connectToken esta definido */}
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          language="pt"
          includeSandbox={process.env.NODE_ENV !== "production"}
          onSuccess={handleSuccess}
          onError={handleWidgetError}
          onClose={handleClose}
        />
      )}

      {/* Erro de inicializacao da pagina */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

      {/* Feedback de acao */}
      {feedback && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-[13px] ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Botao adicionar conexao */}
      <button
        onClick={handleConnect}
        disabled={isBusy || connectToken !== null}
        className="mb-8 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {connecting ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Conectando...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Conectar banco
          </>
        )}
      </button>

      {/* Lista de conexoes */}
      {connections.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-10 text-center">
          <p className="text-[13px] text-zinc-500">
            Nenhum banco conectado ainda. Clique em{" "}
            <span className="text-white">"Conectar banco"</span> para comecar.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {connections.map((conn) => {
            const isSyncing  = syncingId  === conn.id;
            const isDeleting = deletingId === conn.id;

            return (
              <li
                key={conn.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                {/* Info da instituicao */}
                <div className="flex items-center gap-3">
                  {conn.institution?.logo_url ? (
                    <img
                      src={conn.institution.logo_url}
                      alt={conn.institution.short_name}
                      className="h-8 w-8 rounded-full object-contain"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[11px] text-zinc-400">
                      {(conn.institution?.short_name ?? "?")[0]}
                    </div>
                  )}
                  <div>
                    <p className="text-[13px] font-medium text-white">
                      {conn.institution?.name ?? "Instituicao desconhecida"}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {conn.last_synced_at
                        ? `Sincronizado em ${new Date(conn.last_synced_at).toLocaleString("pt-BR")}`
                        : `Conectado em ${new Date(conn.created_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-3">
                  <StatusBadge status={conn.status} />

                  {/* Botao Sincronizar */}
                  <button
                    onClick={() => handleSync(conn.id)}
                    disabled={isBusy}
                    title="Sincronizar contas"
                    className="flex items-center gap-1 text-[12px] text-zinc-400 transition hover:text-blue-400 disabled:opacity-40"
                  >
                    {isSyncing ? (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-blue-400" />
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {isSyncing ? "Sincronizando..." : "Sincronizar"}
                  </button>

                  {/* Botao Desconectar */}
                  <button
                    onClick={() => handleDelete(conn.id)}
                    disabled={isBusy}
                    title="Desconectar"
                    className="text-[12px] text-zinc-500 transition hover:text-red-400 disabled:opacity-40"
                  >
                    {isDeleting ? "..." : "Desconectar"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
