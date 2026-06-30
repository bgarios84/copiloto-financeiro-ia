"use server";

/**
 * Service -- Open Finance
 * Sprint 9.2 -- Connection Flow
 * Sprint 9.3 -- Account Sync
 * Sprint 9.6 -- Reconciliacao Automatica
 * Sprint 9.8 -- Refatorado para delegar ao Sync Orchestrator
 *
 * Server Actions para o fluxo de conexao Open Finance.
 * Nenhum secret e exposto ao frontend.
 * Usa RLS + requireAuth() como dupla camada de protecao.
 *
 * Clientes Supabase:
 *   supabase   -- user-scoped (RLS ativo): financial_account, credit_card, connection
 *   srClient   -- service_role (bypassa RLS): account_map, sync_log
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getOpenFinanceProvider } from "@/lib/open-finance";
import type { OFSyncResult } from "@/lib/open-finance";
import type { ServiceResult } from "@/types/common";
import type { OpenFinanceConnection } from "@/types/open-finance";
import { runConnectionSync } from "@/services/open-finance/sync-orchestrator";

// -- Tipos locais ---------------------------------------------------------------

export type OFConnectionWithInstitution = OpenFinanceConnection & {
  institution: {
    id:         string;
    name:       string;
    short_name: string;
    logo_url:   string | null;
  } | null;
};

// -- Connect Token --------------------------------------------------------------

export async function getConnectToken(): Promise<
  ServiceResult<{ connectToken: string; expiresAt: string }>
> {
  try {
    const user     = await requireAuth();
    const provider = await getOpenFinanceProvider();
    const result   = await provider.createConnectToken(user.id);
    return { data: result, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar token de conexao.";
    return { data: null, error: msg };
  }
}

// -- Salvar conexao -------------------------------------------------------------

export async function saveConnection(
  providerItemId: string,
): Promise<ServiceResult<OpenFinanceConnection>> {
  try {
    const user     = await requireAuth();
    const provider = await getOpenFinanceProvider();
    const supabase = await createClient();

    const connectionInfo = await provider.getConnection(providerItemId);

    let institutionId: string | null = null;
    if (connectionInfo.institutionCode) {
      const { data: inst } = await supabase
        .from("institution")
        .select("id")
        .eq("ispb", connectionInfo.institutionCode)
        .single();
      institutionId = inst?.id ?? null;
    }

    const { data, error } = await supabase
      .from("open_finance_connection")
      .upsert(
        {
          user_id:          user.id,
          provider:         provider.name,
          provider_item_id: providerItemId,
          institution_id:   institutionId,
          status:           connectionInfo.status === "connected" ? "connected" : "pending",
          error_message:    connectionInfo.errorMessage ?? null,
          updated_at:       new Date().toISOString(),
        },
        { onConflict: "user_id,provider,provider_item_id" },
      )
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    revalidatePath("/settings/open-finance");
    return { data: data as OpenFinanceConnection, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar conexao.";
    return { data: null, error: msg };
  }
}

// -- Listar conexoes ------------------------------------------------------------

export async function getConnections(): Promise<
  ServiceResult<OFConnectionWithInstitution[]>
> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("open_finance_connection")
      .select(`
        *,
        institution:institution_id (
          id, name, short_name, logo_url
        )
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as OFConnectionWithInstitution[], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar conexoes." };
  }
}

// -- Remover conexao ------------------------------------------------------------

export async function deleteConnection(
  id: string,
): Promise<ServiceResult<null>> {
  try {
    const user     = await requireAuth();
    const supabase = await createClient();

    const { data: conn, error: fetchErr } = await supabase
      .from("open_finance_connection")
      .select("provider_item_id, provider")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (fetchErr || !conn) {
      return { data: null, error: "Conexao nao encontrada." };
    }

    try {
      const provider = await getOpenFinanceProvider();
      await provider.disconnect(conn.provider_item_id);
    } catch {
      // Continua mesmo se o provider estiver fora do ar
    }

    const { error: updateErr } = await supabase
      .from("open_finance_connection")
      .update({
        status:     "disconnected",
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateErr) return { data: null, error: updateErr.message };

    revalidatePath("/settings/open-finance");
    return { data: null, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao remover conexao.";
    return { data: null, error: msg };
  }
}

// -- Sincronizar contas ---------------------------------------------------------
// Sprint 9.8 -- Orquestrador oficial. Toda a logica esta em sync-orchestrator.ts.

export async function syncConnectionAccounts(
  connectionId: string,
): Promise<ServiceResult<OFSyncResult>> {
  try {
    const user     = await requireAuth();
    const supabase = await createClient();
    const srClient = createServiceRoleClient();

    // Valida posse da conexao via RLS
    const { data: conn, error: connErr } = await supabase
      .from("open_finance_connection")
      .select("id")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (connErr || !conn) {
      return { data: null, error: "Conexao nao encontrada ou sem permissao." };
    }

    // Delega ao orquestrador (lock + log + sync de contas + transacoes)
    const result = await runConnectionSync(srClient, user.id, connectionId, 90, "manual");

    if (result.skipped) {
      return {
        data: null,
        error: "Sincronizacao ja em andamento para esta conexao.",
      };
    }

    revalidatePath("/settings/open-finance");
    revalidatePath("/transactions");

    return {
      data: {
        accountsSynced:         result.accountsSynced,
        transactionsCreated:    result.transactionsCreated,
        transactionsUpdated:    result.transactionsUpdated,
        transactionsSkipped:    0,
        transactionsReconciled: result.transactionsReconciled,
        errors:                 result.errors,
        syncedAt:               new Date().toISOString(),
      } satisfies OFSyncResult,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao sincronizar contas.";
    return { data: null, error: msg };
  }
}

// -- Sincronizar transacoes -----------------------------------------------------
// Sprint 9.8 -- Delegado ao orquestrador.
// Evita double-sync: se houver sync_log recente (<= 5 min), retorna resultado cacheado.

export async function syncConnectionTransactions(
  connectionId: string,
  daysBack = 90,
): Promise<ServiceResult<OFSyncResult>> {
  try {
    const user     = await requireAuth();
    const supabase = await createClient();
    const srClient = createServiceRoleClient();

    // Valida posse
    const { data: conn, error: connErr } = await supabase
      .from("open_finance_connection")
      .select("id")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (connErr || !conn) {
      return { data: null, error: "Conexao nao encontrada ou sem permissao." };
    }

    // Verifica se ja foi sincronizado nos ultimos 5 minutos (anti double-sync)
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentLog } = await srClient
      .from("open_finance_sync_log")
      .select(
        "accounts_synced, transactions_created, transactions_updated, transactions_skipped, finished_at",
      )
      .eq("connection_id", connectionId)
      .in("status", ["success", "partial"])
      .gte("finished_at", fiveMinAgo)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentLog) {
      // Retorna resultado cacheado -- evita re-sync imediato apos syncConnectionAccounts
      revalidatePath("/transactions");
      return {
        data: {
          accountsSynced:         recentLog.accounts_synced         ?? 0,
          transactionsCreated:    recentLog.transactions_created    ?? 0,
          transactionsUpdated:    recentLog.transactions_updated    ?? 0,
          transactionsSkipped:    recentLog.transactions_skipped    ?? 0,
          transactionsReconciled: 0,
          errors:                 [],
          syncedAt:               recentLog.finished_at ?? new Date().toISOString(),
        } satisfies OFSyncResult,
        error: null,
      };
    }

    // Sem sync recente -- executa sync completo via orquestrador
    const result = await runConnectionSync(srClient, user.id, connectionId, daysBack, "manual");

    if (result.skipped) {
      return {
        data: null,
        error: "Sincronizacao ja em andamento para esta conexao.",
      };
    }

    revalidatePath("/transactions");

    return {
      data: {
        accountsSynced:         0,
        transactionsCreated:    result.transactionsCreated,
        transactionsUpdated:    result.transactionsUpdated,
        transactionsSkipped:    0,
        transactionsReconciled: result.transactionsReconciled,
        errors:                 result.errors,
        syncedAt:               new Date().toISOString(),
      } satisfies OFSyncResult,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao sincronizar transacoes.";
    return { data: null, error: msg };
  }
}
