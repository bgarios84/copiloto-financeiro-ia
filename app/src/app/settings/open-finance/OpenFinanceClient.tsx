"use client";

/**
 * Open Finance — Connection UI
 * Sprint 9.2
 *
 * Usa react-pluggy-connect (widget React oficial da Pluggy).
 * Instalar antes de rodar: npm install react-pluggy-connect
 * Docs: https://www.npmjs.com/package/react-pluggy-connect
 */

import * as React from "react";
import dynamic from "next/dynamic";
import {
  getConnectToken,
  saveConnection,
  deleteConnection,
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

  const [connecting, setConnecting] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

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

    // Ao definir o token, o <PluggyConnect> abaixo e renderizado.
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
        const exists = prev.find(
          (c) => c.provider_item_id === data.item.id,
        );
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

  function handleError(err: { message: string }) {
    setConnectToken(null);
    setConnecting(false);
    setFeedback({
      type:    "error",
      message: err.message ?? "Erro no widget de conexao.",
    });
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

  return (
    <>
      {/* Widget react-pluggy-connect — renderizado apenas quando connectToken esta definido */}
      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          language="pt"
          onSuccess={handleSuccess}
          onError={handleError}
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

      {/* Botao de conexao */}
      <button
        onClick={handleConnect}
        disabled={connecting || connectToken !== null}
        className="mb-8 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {connecting ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Conectando...
          </>
        ) : (
          <>
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
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
          {connections.map((conn) => (
            <li
              key={conn.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
            >
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
                    Conectado em{" "}
                    {new Date(conn.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={conn.status} />
                <button
                  onClick={() => handleDelete(conn.id)}
                  disabled={deletingId === conn.id}
                  className="text-[12px] text-zinc-500 transition hover:text-red-400 disabled:opacity-40"
                  title="Desconectar"
                >
                  {deletingId === conn.id ? "..." : "Desconectar"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
