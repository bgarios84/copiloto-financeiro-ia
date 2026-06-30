"use client";

/**
 * Open Finance — Connection UI
 * Sprint 9.2  — Connection Flow
 * Sprint 9.3B — Account Sync Button
 * Sprint 9.4  — Transaction Sync Button
 */

import * as React from "react";
import dynamic from "next/dynamic";
import {
  getConnectToken,
  saveConnection,
  deleteConnection,
  syncConnectionAccounts,
  syncConnectionTransactions,
} from "@/services/open-finance";
import type { OFConnectionWithInstitution } from "@/services/open-finance";
import { OPEN_FINANCE_CONNECTION_STATUS_LABELS } from "@/types/open-finance";

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

function Spinner() {
  return (
    <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-blue-400" />
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props {
  initialConnections: OFConnectionWithInstitution[];
  error:              string | null;
}

type PerConnectionAction = "accounts" | "transactions" | "deleting" | null;

export function OpenFinanceClient({ initialConnections, error }: Props) {
  const [connections, setConnections] =
    React.useState<OFConnectionWithInstitution[]>(initialConnections);

  const [connectToken, setConnectToken] = React.useState<string | null>(null);
  const [connecting,   setConnecting]   = React.useState(false);

  // Qual acao esta em curso para cada conexao: null = idle
  const [activeAction, setActiveAction] =
    React.useState<Record<string, PerConnectionAction>>({});

  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const anyBusy =
    connecting ||
    connectToken !== null ||
    Object.values(activeAction).some((v) => v !== null);

  function getAction(id: string): PerConnectionAction {
    return activeAction[id] ?? null;
  }

  function setAction(id: string, action: PerConnectionAction) {
    setActiveAction((prev) => ({ ...prev, [id]: action }));
  }

  // ── Abrir widget ────────────────────────────────────────────────────────────

  async function handleConnect() {
    setConnecting(true);
    setFeedback(null);

    const result = await getConnectToken();
    if (result.error || !result.data) {
      setFeedback({ type: "error", message: result.error ?? "Erro ao gerar token." });
      setConnecting(false);
      return;
    }
    setConnectToken(result.data.connectToken);
    setConnecting(false);
  }

  async function handleSuccess(data: { item: { id: string } }) {
    setConnectToken(null);
    setFeedback(null);

    const saveResult = await saveConnection(data.item.id);
    if (saveResult.error || !saveResult.data) {
      setFeedback({ type: "error", message: saveResult.error ?? "Erro ao salvar conexao." });
    } else {
      setConnections((prev) => {
        const exists = prev.find((c) => c.provider_item_id === data.item.id);
        if (exists) return prev;
        return [saveResult.data as OFConnectionWithInstitution, ...prev];
      });
      setFeedback({ type: "success", message: "Banco conectado! Clique em Sincronizar contas." });
    }
  }

  function handleClose() { setConnectToken(null); setConnecting(false); }

  function handleWidgetError(err: { message: string }) {
    setConnectToken(null);
    setConnecting(false);
    setFeedback({ type: "error", message: err.message ?? "Erro no widget." });
  }

  // ── Sincronizar contas ──────────────────────────────────────────────────────

  async function handleSyncAccounts(id: string) {
    setAction(id, "accounts");
    setFeedback(null);
    setConnections((prev) =>
      prev.map((c) => c.id === id ? { ...c, status: "syncing" } : c),
    );

    const result = await syncConnectionAccounts(id);

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      setConnections((prev) =>
        prev.map((c) => c.id === id ? { ...c, status: "error" } : c),
      );
    } else {
      const { accountsSynced, errors } = result.data;
      setFeedback({
        type: errors.length === 0 ? "success" : "error",
        message:
          errors.length === 0
            ? `${accountsSynced} conta(s) sincronizada(s).`
            : `${accountsSynced} conta(s) ok. Aviso: ${errors[0]}`,
      });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "connected", last_synced_at: new Date().toISOString() }
            : c,
        ),
      );
    }

    setAction(id, null);
  }

  // ── Sincronizar transacoes ──────────────────────────────────────────────────

  async function handleSyncTransactions(id: string) {
    setAction(id, "transactions");
    setFeedback(null);

    const result = await syncConnectionTransactions(id);

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      const { transactionsCreated, transactionsUpdated, errors } = result.data;
      const total = transactionsCreated + transactionsUpdated;
      setFeedback({
        type: errors.length === 0 ? "success" : "error",
        message:
          errors.length === 0
            ? `${total} transacao(oes) importada(s) (${transactionsCreated} nova(s), ${transactionsUpdated} atualizada(s)).`
            : `${total} transacao(oes) ok. Aviso: ${errors[0]}`,
      });
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, last_synced_at: new Date().toISOString() }
            : c,
        ),
      );
    }

    setAction(id, null);
  }

  // ── Remover conexao ─────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setAction(id, "deleting");
    setFeedback(null);
    const result = await deleteConnection(id);
    if (result.error) {
      setFeedback({ type: "error", message: result.error });
      setAction(id, null);
    } else {
      setConnections((prev) => prev.filter((c) => c.id !== id));
      setAction(id, null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
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

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
          {error}
        </div>
      )}

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

      {/* Botao principal */}
      <button
        onClick={handleConnect}
        disabled={anyBusy}
        className="mb-8 flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {connecting ? (
          <><Spinner /> Conectando...</>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Conectar banco
          </>
        )}
      </button>

      {/* Lista */}
      {connections.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-10 text-center">
          <p className="text-[13px] text-zinc-500">
            Nenhum banco conectado. Clique em{" "}
            <span className="text-white">"Conectar banco"</span> para comecar.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {connections.map((conn) => {
            const action     = getAction(conn.id);
            const isAccounts = action === "accounts";
            const isTxn      = action === "transactions";
            const isDeleting = action === "deleting";

            return (
              <li
                key={conn.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3"
              >
                {/* Linha principal */}
                <div className="flex items-center justify-between gap-3">
                  {/* Info */}
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

                  {/* Badge + Desconectar */}
                  <div className="flex items-center gap-3">
                    <StatusBadge status={conn.status} />
                    <button
                      onClick={() => handleDelete(conn.id)}
                      disabled={anyBusy}
                      className="text-[12px] text-zinc-500 transition hover:text-red-400 disabled:opacity-40"
                    >
                      {isDeleting ? "..." : "Desconectar"}
                    </button>
                  </div>
                </div>

                {/* Linha de acoes de sync */}
                <div className="mt-2.5 flex items-center gap-3 border-t border-zinc-800 pt-2.5">
                  {/* Sincronizar contas */}
                  <button
                    onClick={() => handleSyncAccounts(conn.id)}
                    disabled={anyBusy}
                    className="flex items-center gap-1.5 text-[12px] text-zinc-400 transition hover:text-blue-400 disabled:opacity-40"
                  >
                    {isAccounts ? <Spinner /> : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    )}
                    {isAccounts ? "Sincronizando..." : "Sincronizar contas"}
                  </button>

                  <span className="text-zinc-700">·</span>

                  {/* Sincronizar transacoes */}
                  <button
                    onClick={() => handleSyncTransactions(conn.id)}
                    disabled={anyBusy}
                    className="flex items-center gap-1.5 text-[12px] text-zinc-400 transition hover:text-violet-400 disabled:opacity-40"
                  >
                    {isTxn ? <Spinner /> : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    )}
                    {isTxn ? "Importando..." : "Sincronizar transacoes"}
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
