"use client";

/**
 * Open Finance -- Sync Center
 * Sprint 9.7 -- Central de Sincronizacao
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  getConnectToken,
  getReconnectToken,
  saveConnection,
  deleteConnection,
  syncConnectionAccounts,
  syncConnectionTransactions,
} from "@/services/open-finance";
import type { OFConnectionDetail } from "@/services/open-finance/queries";

const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((m) => ({ default: m.PluggyConnect })),
  { ssr: false },
);

// -- Helpers ------------------------------------------------------------------

const STATUS_CFG: Record<string, { label: string; dot: string; ring: string; text: string }> = {
  connected:           { label: "Sincronizado",    dot: "bg-emerald-400",              ring: "border-emerald-500/25 bg-emerald-500/8",  text: "text-emerald-400" },
  syncing:             { label: "Sincronizando",   dot: "bg-blue-400 animate-pulse",   ring: "border-blue-500/25 bg-blue-500/8",        text: "text-blue-400"    },
  error:               { label: "Erro",            dot: "bg-red-400",                  ring: "border-red-500/25 bg-red-500/8",          text: "text-red-400"     },
  pending:             { label: "Pendente",        dot: "bg-zinc-500",                 ring: "border-zinc-700 bg-zinc-800/40",          text: "text-zinc-400"    },
  disconnected:        { label: "Desconectado",    dot: "bg-zinc-500",                 ring: "border-zinc-700 bg-zinc-800/40",          text: "text-zinc-400"    },
  pending_user_action: { label: "Acao necessaria", dot: "bg-amber-400",                ring: "border-amber-500/25 bg-amber-500/8",      text: "text-amber-400"   },
  expired:             { label: "Expirado",        dot: "bg-amber-400",                ring: "border-amber-500/25 bg-amber-500/8",      text: "text-amber-400"   },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.ring} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function Spinner({ size = "sm" }: { size?: "sm" | "xs" }) {
  const cls = size === "xs"
    ? "h-2.5 w-2.5 border-[1.5px]"
    : "h-3.5 w-3.5 border-2";
  return (
    <span className={`${cls} animate-spin rounded-full border-zinc-600 border-t-blue-400 inline-block`} />
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</span>
      <span className="text-[13px] font-medium text-zinc-200">{value}</span>
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day:    "2-digit",
    month:  "2-digit",
    year:   "2-digit",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

// -- Componente principal -----------------------------------------------------

interface Props {
  initialConnections: OFConnectionDetail[];
  error:              string | null;
}

export function OpenFinanceClient({ initialConnections, error }: Props) {
  const router = useRouter();

  const [connections, setConnections] =
    React.useState<OFConnectionDetail[]>(initialConnections);

  const [connectToken,   setConnectToken]   = React.useState<string | null>(null);
  const [connecting,     setConnecting]     = React.useState(false);
  const [syncingIds,     setSyncingIds]     = React.useState<Set<string>>(new Set());
  const [syncAllBusy,    setSyncAllBusy]    = React.useState(false);
  const [deletingId,     setDeletingId]     = React.useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{
    type: "success" | "error"; message: string;
  } | null>(null);

  const anyBusy =
    connecting || connectToken !== null || syncingIds.size > 0 || syncAllBusy ||
    deletingId !== null || reconnectingId !== null;

  // Mostra todas as conexoes visiveis (exceto deletadas/desconectadas)
  const activeConnections = connections.filter((c) => c.status !== "disconnected");

  // Subconjunto que pode ser sincronizado (precisa de auth valida)
  const syncableConnections = activeConnections.filter(
    (c) => c.status !== "expired" && c.status !== "pending_user_action",
  );

  // Atualizar status de uma conexao localmente (otimista)
  function setConnStatus(id: string, status: string) {
    setConnections((prev) =>
      prev.map((c) => c.id === id ? { ...c, status } : c),
    );
  }

  function addSyncing(id: string) {
    setSyncingIds((s) => new Set(s).add(id));
    setConnStatus(id, "syncing");
  }

  function removeSyncing(id: string, finalStatus: string) {
    setSyncingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    setConnStatus(id, finalStatus);
  }

  // -- Conectar banco ---------------------------------------------------------

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
    const isReconnect = reconnectingId !== null;
    setConnectToken(null);
    setReconnectingId(null);
    setFeedback(null);
    const saveResult = await saveConnection(data.item.id);
    if (saveResult.error) {
      setFeedback({ type: "error", message: saveResult.error });
    } else {
      setFeedback({
        type: "success",
        message: isReconnect
          ? "Banco reconectado com sucesso!"
          : "Banco conectado! Clique em Sincronizar.",
      });
      router.refresh();
    }
  }

  function handleClose() { setConnectToken(null); setConnecting(false); setReconnectingId(null); }
  function handleWidgetError(e: { message: string }) {
    setConnectToken(null); setConnecting(false); setReconnectingId(null);
    setFeedback({ type: "error", message: e.message });
  }

  // -- Reconectar banco (Sprint 9.12) -----------------------------------------

  async function handleReconnect(id: string) {
    setReconnectingId(id);
    setFeedback(null);
    const result = await getReconnectToken(id);
    if (result.error || !result.data) {
      setFeedback({ type: "error", message: result.error ?? "Erro ao gerar token de reconexao." });
      setReconnectingId(null);
      return;
    }
    // Abre o widget Pluggy em modo de atualizacao (token scoped ao item existente)
    setConnectToken(result.data.connectToken);
    // reconnectingId permanece definido ate handleSuccess/handleClose/handleWidgetError
  }

  // -- Sincronizar uma conexao ------------------------------------------------

  async function handleSyncOne(id: string) {
    addSyncing(id);
    setFeedback(null);

    const [accResult, txResult] = [
      await syncConnectionAccounts(id),
      await syncConnectionTransactions(id),
    ];

    const hasError = !!accResult.error || !!txResult.error;
    const firstError = accResult.error ?? txResult.error ?? null;

    if (hasError) {
      setFeedback({ type: "error", message: firstError ?? "Erro na sincronizacao." });
      removeSyncing(id, "error");
    } else {
      const accOk = accResult.data?.accountsSynced ?? 0;
      const txOk  = (txResult.data?.transactionsCreated ?? 0) + (txResult.data?.transactionsUpdated ?? 0);
      setFeedback({
        type: "success",
        message: `Sincronizado: ${accOk} conta(s), ${txOk} transacao(oes).`,
      });
      removeSyncing(id, "connected");
    }

    router.refresh();
  }

  // -- Sincronizar todas ------------------------------------------------------

  async function handleSyncAll() {
    setSyncAllBusy(true);
    setFeedback(null);

    const targets = syncableConnections.filter((c) => !syncingIds.has(c.id));
    targets.forEach((c) => addSyncing(c.id));

    const results = await Promise.allSettled(
      targets.map(async (c) => {
        await syncConnectionAccounts(c.id);
        await syncConnectionTransactions(c.id);
        return c.id;
      }),
    );

    let ok = 0; let fail = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") { ok++; removeSyncing(targets[i].id, "connected"); }
      else { fail++; removeSyncing(targets[i].id, "error"); }
    });

    setFeedback({
      type: fail === 0 ? "success" : "error",
      message: fail === 0
        ? `${ok} conexao(oes) sincronizada(s) com sucesso.`
        : `${ok} ok, ${fail} com erro.`,
    });

    setSyncAllBusy(false);
    router.refresh();
  }

  // -- Desconectar ------------------------------------------------------------

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

  // -- Render -----------------------------------------------------------------

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

      {/* Header de acoes */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleConnect}
            disabled={anyBusy}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connecting ? (
              <><Spinner /> Conectando...</>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Conectar banco
              </>
            )}
          </button>

          {syncableConnections.length > 1 && (
            <button
              onClick={handleSyncAll}
              disabled={anyBusy}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-[13px] font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncAllBusy ? (
                <><Spinner /> Sincronizando...</>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Sincronizar todas
                </>
              )}
            </button>
          )}
        </div>

        <button
          onClick={() => router.refresh()}
          disabled={anyBusy}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-[12px] text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-40"
          title="Atualizar status"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
      </div>

      {/* Feedback global */}
      {(error || feedback) && (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-[13px] ${
          error || feedback?.type === "error"
            ? "border-red-500/30 bg-red-500/10 text-red-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        }`}>
          {error ?? feedback?.message}
        </div>
      )}

      {/* Empty state */}
      {connections.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
            <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <p className="text-[13px] font-medium text-zinc-300">Nenhum banco conectado</p>
          <p className="mt-1 text-[12px] text-zinc-500">
            Clique em <span className="text-white">"Conectar banco"</span> para comecar.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {connections.map((conn) => {
            const isSyncing  = syncingIds.has(conn.id);
            const isDeleting = deletingId === conn.id;
            const log        = conn.lastSyncLog;
            const status     = isSyncing ? "syncing" : conn.status;

            return (
              <li
                key={conn.id}
                className={`rounded-xl border bg-zinc-900/60 transition ${
                  isSyncing ? "border-blue-500/30" : "border-zinc-800"
                }`}
              >
                {/* Cabecalho do card */}
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    {conn.institution?.logo_url ? (
                      <img
                        src={conn.institution.logo_url}
                        alt={conn.institution.short_name}
                        className="h-9 w-9 rounded-full bg-zinc-800 object-contain p-0.5"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-[12px] font-bold text-zinc-400">
                        {(conn.institution?.short_name ?? "?")[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-[14px] font-semibold text-white">
                        {conn.institution?.name ?? "Instituicao desconhecida"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">
                        Conectado em {formatDate(conn.created_at)}
                        {log?.trigger === "cron" && (
                          <span className="ml-2 rounded bg-zinc-800 px-1 py-px text-zinc-500">cron</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isSyncing && <Spinner />}
                    <StatusBadge status={status} />
                  </div>
                </div>

                {/* Grid de stats */}
                <div className="grid grid-cols-3 gap-px border-t border-zinc-800 bg-zinc-800 sm:grid-cols-6">
                  {[
                    { label: "Ultima sync",  value: formatDate(conn.last_synced_at) },
                    { label: "Duracao",      value: formatDuration(log?.duration_ms ?? null) },
                    { label: "Contas",       value: conn.accountsCount },
                    { label: "Cartoes",      value: conn.cardsCount },
                    { label: "Tx criadas",   value: log?.transactions_created ?? "—" },
                    { label: "Tx atualizadas", value: log?.transactions_updated ?? "—" },
                  ].map((s) => (
                    <div key={s.label} className="bg-zinc-900/80 px-3 py-2.5">
                      <StatCell label={s.label} value={s.value} />
                    </div>
                  ))}
                </div>

                {/* Erro da ultima sync */}
                {log?.error_message && log.status !== "success" && (
                  <div className="border-t border-red-500/20 bg-red-500/5 px-5 py-2.5">
                    <p className="text-[11px] text-red-400">
                      <span className="font-medium">Ultimo erro: </span>
                      {log.error_message}
                    </p>
                  </div>
                )}

                {/* Acoes */}
                {(() => {
                  const needsReconnect =
                    status === "expired" ||
                    status === "error" ||
                    status === "pending_user_action";
                  const isReconnecting = reconnectingId === conn.id;

                  return (
                    <div className="flex items-center gap-4 border-t border-zinc-800 px-5 py-3">
                      {needsReconnect ? (
                        <button
                          onClick={() => handleReconnect(conn.id)}
                          disabled={anyBusy}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-amber-400 transition hover:text-amber-300 disabled:opacity-40"
                        >
                          {isReconnecting ? (
                            <><Spinner size="xs" /> Reconectando...</>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              Reconectar
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSyncOne(conn.id)}
                          disabled={anyBusy}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-blue-400 transition hover:text-blue-300 disabled:opacity-40"
                        >
                          {isSyncing ? (
                            <><Spinner size="xs" /> Sincronizando...</>
                          ) : (
                            <>
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Sincronizar
                            </>
                          )}
                        </button>
                      )}

                      <span className="text-zinc-700">·</span>

                      <button
                        onClick={() => handleDelete(conn.id)}
                        disabled={anyBusy}
                        className="text-[12px] text-zinc-500 transition hover:text-red-400 disabled:opacity-40"
                      >
                        {isDeleting ? "Desconectando..." : "Desconectar"}
                      </button>
                    </div>
                  );
                })()}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
