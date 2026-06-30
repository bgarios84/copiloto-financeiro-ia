/**
 * Open Finance -- Detail Queries
 * Sprint 9.7 -- Sync Center
 *
 * Consultas enriquecidas para a Central de Sincronizacao.
 * Usa apenas tabelas ja existentes (sem migrations).
 */

import { createClient } from "@/lib/supabase/server";
import type { OFConnectionWithInstitution } from "@/services/open-finance";

// -- Tipos publicos ------------------------------------------------------------

export interface OFSyncLogSummary {
  id:                   string;
  status:               string;
  trigger:              string;
  duration_ms:          number | null;
  accounts_synced:      number | null;
  transactions_created: number | null;
  transactions_updated: number | null;
  transactions_skipped: number | null;
  error_message:        string | null;
  started_at:           string;
  finished_at:          string | null;
}

export interface OFConnectionDetail extends OFConnectionWithInstitution {
  lastSyncLog:   OFSyncLogSummary | null;
  accountsCount: number;
  cardsCount:    number;
}

// -- Query principal ----------------------------------------------------------

/**
 * Retorna conexoes enriquecidas com:
 *   - ultimo sync log (status, duracao, contagens, erro)
 *   - contagem de contas e cartoes mapeados
 */
export async function getConnectionsWithDetails(): Promise<{
  data: OFConnectionDetail[] | null;
  error: string | null;
}> {
  try {
    const supabase = await createClient();

    // 1. Conexoes com institution join
    const { data: connections, error: connErr } = await supabase
      .from("open_finance_connection")
      .select(`
        *,
        institution:institution_id (
          id, name, short_name, logo_url
        )
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (connErr) return { data: null, error: connErr.message };
    if (!connections || connections.length === 0) return { data: [], error: null };

    const connectionIds = connections.map((c) => c.id as string);

    // 2. Ultimo sync log por conexao (query batch, filtro em memoria)
    const { data: syncLogs } = await supabase
      .from("open_finance_sync_log")
      .select(
        "id, connection_id, status, trigger, duration_ms, accounts_synced, " +
        "transactions_created, transactions_updated, transactions_skipped, " +
        "error_message, started_at, finished_at",
      )
      .in("connection_id", connectionIds)
      .order("started_at", { ascending: false });

    // Primeiro log encontrado por conexao (mais recente, ja que vieram desc)
    const lastLogByConn = new Map<string, OFSyncLogSummary>();
    for (const log of syncLogs ?? []) {
      if (!lastLogByConn.has(log.connection_id as string)) {
        lastLogByConn.set(log.connection_id as string, {
          id:                   log.id as string,
          status:               (log.status ?? "unknown") as string,
          trigger:              (log.trigger ?? "manual") as string,
          duration_ms:          log.duration_ms as number | null,
          accounts_synced:      log.accounts_synced as number | null,
          transactions_created: log.transactions_created as number | null,
          transactions_updated: log.transactions_updated as number | null,
          transactions_skipped: log.transactions_skipped as number | null,
          error_message:        log.error_message as string | null,
          started_at:           log.started_at as string,
          finished_at:          log.finished_at as string | null,
        });
      }
    }

    // 3. Contagem de contas e cartoes por conexao
    const { data: accountMaps } = await supabase
      .from("open_finance_account_map")
      .select("connection_id, account_type")
      .in("connection_id", connectionIds);

    const countsByConn = new Map<string, { accounts: number; cards: number }>();
    for (const m of accountMaps ?? []) {
      const connId = m.connection_id as string;
      const c      = countsByConn.get(connId) ?? { accounts: 0, cards: 0 };
      if ((m.account_type as string) === "credit") c.cards++;
      else c.accounts++;
      countsByConn.set(connId, c);
    }

    // 4. Montar resultado
    const details: OFConnectionDetail[] = connections.map((conn) => ({
      ...(conn as OFConnectionWithInstitution),
      lastSyncLog:   lastLogByConn.get(conn.id as string) ?? null,
      accountsCount: countsByConn.get(conn.id as string)?.accounts ?? 0,
      cardsCount:    countsByConn.get(conn.id as string)?.cards    ?? 0,
    }));

    return { data: details, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Erro ao buscar detalhes das conexoes.",
    };
  }
}
