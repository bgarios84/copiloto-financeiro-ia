"use server";

/**
 * Service — Open Finance
 * Sprint 9.2 — Connection Flow
 * Sprint 9.3 — Account Sync
 *
 * Server Actions para o fluxo de conexao Open Finance.
 * Nenhum secret e exposto ao frontend.
 * Usa RLS + requireAuth() como dupla camada de protecao.
 *
 * Clientes Supabase:
 *   supabase   — user-scoped (RLS ativo): financial_account, credit_card, connection
 *   srClient   — service_role (bypasssa RLS): account_map, sync_log
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { requireAuth } from "@/lib/supabase/require-auth";
import { getOpenFinanceProvider } from "@/lib/open-finance";
import type { OFSyncResult } from "@/lib/open-finance";
import type { ServiceResult } from "@/types/common";
import type { OpenFinanceConnection } from "@/types/open-finance";

// ── Tipos locais ──────────────────────────────────────────────────────────────

export type OFConnectionWithInstitution = OpenFinanceConnection & {
  institution: {
    id:         string;
    name:       string;
    short_name: string;
    logo_url:   string | null;
  } | null;
};

// ── Connect Token ─────────────────────────────────────────────────────────────

/**
 * Gera um Connect Token de curta duracao (~30min) para o widget Pluggy.
 * O token e retornado ao frontend apenas para inicializar o widget.
 * Nunca armazenado no banco.
 */
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

// ── Salvar conexao ────────────────────────────────────────────────────────────

/**
 * Persiste uma nova conexao apos o usuario autorizar no widget Pluggy.
 * Chama getConnection() no provider para obter status e institutionCode.
 * Busca institution_id por ISPB se disponivel.
 *
 * @param providerItemId - item_id retornado pelo widget Pluggy (nao sensivel)
 */
export async function saveConnection(
  providerItemId: string,
): Promise<ServiceResult<OpenFinanceConnection>> {
  try {
    const user     = await requireAuth();
    const provider = await getOpenFinanceProvider();
    const supabase = await createClient();

    // Busca status e institution info no provider
    const connectionInfo = await provider.getConnection(providerItemId);

    // Tenta encontrar institution_id pelo institutionCode (ISPB)
    let institutionId: string | null = null;
    if (connectionInfo.institutionCode) {
      const { data: inst } = await supabase
        .from("institution")
        .select("id")
        .eq("ispb", connectionInfo.institutionCode)
        .single();
      institutionId = inst?.id ?? null;
    }

    // Upsert: evita duplicata se o usuario reconectar o mesmo item
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

// ── Listar conexoes ───────────────────────────────────────────────────────────

/**
 * Lista todas as conexoes ativas do usuario autenticado.
 */
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

// ── Remover conexao ───────────────────────────────────────────────────────────

/**
 * Encerra conexao: revoga consentimento no provider e aplica soft-delete local.
 * Contas e transacoes existentes permanecem — apenas a sincronizacao e interrompida.
 */
export async function deleteConnection(
  id: string,
): Promise<ServiceResult<null>> {
  try {
    const user     = await requireAuth();
    const supabase = await createClient();

    // Verifica posse antes de qualquer operacao
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

    // Revoga no provider (best-effort — nao bloqueia o soft-delete se falhar)
    try {
      const provider = await getOpenFinanceProvider();
      await provider.disconnect(conn.provider_item_id);
    } catch {
      // Continua mesmo se o provider estiver fora do ar
    }

    // Soft-delete + status disconnected
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

// ── Sincronizar contas ────────────────────────────────────────────────────────

/**
 * Busca contas no provider e cria/atualiza financial_account e credit_card locais.
 *
 * Fluxo:
 *   1. Verifica posse da conexao via RLS (user client)
 *   2. Marca conexao como "syncing"
 *   3. Abre entrada de audit log (service_role — RLS exige isso)
 *   4. Chama provider.syncAccounts()
 *   5. Para cada conta:
 *      - Se credit: upsert credit_card
 *      - Caso contrario: upsert financial_account
 *      - Upsert open_finance_account_map (service_role)
 *   6. Atualiza conexao: last_synced_at + status
 *   7. Fecha audit log com resumo
 *
 * Deduplicacao: open_finance_account_map(connection_id, provider_account_id) UNIQUE.
 * Contas existentes tem apenas saldo/limite atualizados.
 */
export async function syncConnectionAccounts(
  connectionId: string,
): Promise<ServiceResult<OFSyncResult>> {
  const startedAt = Date.now();

  try {
    const user     = await requireAuth();
    const supabase = await createClient();
    const srClient = createServiceRoleClient();
    const provider = await getOpenFinanceProvider();

    // 1. Buscar conexao e verificar posse via RLS
    const { data: conn, error: connErr } = await supabase
      .from("open_finance_connection")
      .select("id, provider_item_id, institution_id, status")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (connErr || !conn) {
      return { data: null, error: "Conexao nao encontrada ou sem permissao." };
    }

    // 2. Marcar como syncing
    await supabase
      .from("open_finance_connection")
      .update({ status: "syncing", updated_at: new Date().toISOString() })
      .eq("id", connectionId);

    // 3. Abrir sync log — apenas service_role pode inserir (RLS)
    const { data: syncLog } = await srClient
      .from("open_finance_sync_log")
      .insert({
        connection_id: connectionId,
        user_id:       user.id,
        trigger:       "manual",
        status:        "running",
        started_at:    new Date().toISOString(),
      })
      .select("id")
      .single();

    const logId = syncLog?.id ?? null;

    // 4. Buscar contas no provider
    let providerAccounts;
    try {
      providerAccounts = await provider.syncAccounts(conn.provider_item_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao buscar contas no provider.";
      if (logId) {
        await srClient
          .from("open_finance_sync_log")
          .update({
            status:        "error",
            error_message: msg,
            finished_at:   new Date().toISOString(),
            duration_ms:   Date.now() - startedAt,
          })
          .eq("id", logId);
      }
      await supabase
        .from("open_finance_connection")
        .update({
          status:        "error",
          error_message: msg,
          updated_at:    new Date().toISOString(),
        })
        .eq("id", connectionId);
      return { data: null, error: msg };
    }

    // 5. Processar cada conta
    let accountsSynced = 0;
    const errors: string[] = [];

    for (const account of providerAccounts) {
      try {
        // Verificar mapeamento existente para esta conta nesta conexao
        const { data: existingMap } = await supabase
          .from("open_finance_account_map")
          .select("id, financial_account_id, credit_card_id")
          .eq("connection_id", connectionId)
          .eq("provider_account_id", account.externalId)
          .maybeSingle();

        if (account.type === "credit") {
          // ── Cartao de credito ────────────────────────────────────────────

          if (existingMap?.credit_card_id) {
            // Atualizar limite e saldo disponivel
            await supabase
              .from("credit_card")
              .update({
                credit_limit:    account.creditLimit    ?? 0,
                available_limit: account.availableLimit ?? 0,
                updated_at:      new Date().toISOString(),
              })
              .eq("id", existingMap.credit_card_id)
              .eq("user_id", user.id);

            await srClient
              .from("open_finance_account_map")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("id", existingMap.id);
          } else {
            // Inserir novo cartao de credito
            const { data: newCard, error: cardErr } = await supabase
              .from("credit_card")
              .insert({
                user_id:            user.id,
                institution_id:     conn.institution_id ?? null,
                name:               account.name,
                brand:              null,
                last_four:          account.lastFour ?? null,
                credit_limit:       account.creditLimit    ?? 0,
                available_limit:    account.availableLimit ?? 0,
                currency:           account.currency,
                closing_day:        1,
                due_day:            10,
                color:              null,
                is_active:          true,
                payment_account_id: null,
                of_connection_id:   connectionId,
                of_account_id:      account.externalId,
              })
              .select("id")
              .single();

            if (cardErr || !newCard) {
              errors.push(
                `Cartao "${account.name}": ${cardErr?.message ?? "erro ao inserir"}`,
              );
              continue;
            }

            // Registrar mapeamento (service_role — RLS exige isso)
            await srClient
              .from("open_finance_account_map")
              .insert({
                connection_id:        connectionId,
                user_id:              user.id,
                provider_account_id:  account.externalId,
                credit_card_id:       newCard.id,
                financial_account_id: null,
                account_type:         "credit",
                last_synced_at:       new Date().toISOString(),
              });
          }
        } else {
          // ── Conta bancaria ───────────────────────────────────────────────

          const accountType: "checking" | "savings" | "investment" | "wallet" =
            account.type === "savings"    ? "savings"    :
            account.type === "investment" ? "investment" :
            account.type === "wallet"     ? "wallet"     :
            "checking";

          if (existingMap?.financial_account_id) {
            // Atualizar saldo
            await supabase
              .from("financial_account")
              .update({
                balance:            account.balance,
                balance_updated_at: new Date().toISOString(),
                updated_at:         new Date().toISOString(),
              })
              .eq("id", existingMap.financial_account_id)
              .eq("user_id", user.id);

            await srClient
              .from("open_finance_account_map")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("id", existingMap.id);
          } else {
            // Inserir nova conta bancaria
            const { data: newAccount, error: accErr } = await supabase
              .from("financial_account")
              .insert({
                user_id:            user.id,
                institution_id:     conn.institution_id ?? null,
                name:               account.name,
                type:               accountType,
                currency:           account.currency,
                balance:            account.balance,
                balance_updated_at: new Date().toISOString(),
                color:              null,
                icon:               null,
                is_active:          true,
                is_manual:          false,
                notes:              null,
                of_connection_id:   connectionId,
                of_account_id:      account.externalId,
              })
              .select("id")
              .single();

            if (accErr || !newAccount) {
              errors.push(
                `Conta "${account.name}": ${accErr?.message ?? "erro ao inserir"}`,
              );
              continue;
            }

            // Registrar mapeamento (service_role — RLS exige isso)
            await srClient
              .from("open_finance_account_map")
              .insert({
                connection_id:        connectionId,
                user_id:              user.id,
                provider_account_id:  account.externalId,
                financial_account_id: newAccount.id,
                credit_card_id:       null,
                account_type:         accountType,
                last_synced_at:       new Date().toISOString(),
              });
          }
        }

        accountsSynced++;
      } catch (err) {
        errors.push(
          `Conta "${account.name}": ${err instanceof Error ? err.message : "erro inesperado"}`,
        );
      }
    }

    // 6. Atualizar conexao com resultado final
    const finalStatus =
      errors.length === 0    ? "connected" :
      accountsSynced > 0     ? "connected" :  // partial mas ao menos uma conta sync
                               "error";

    await supabase
      .from("open_finance_connection")
      .update({
        status:         finalStatus,
        last_synced_at: new Date().toISOString(),
        error_message:  errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
        updated_at:     new Date().toISOString(),
      })
      .eq("id", connectionId);

    // 7. Fechar sync log
    const logStatus: "success" | "partial" | "error" =
      errors.length === 0  ? "success" :
      accountsSynced > 0   ? "partial" :
                             "error";

    if (logId) {
      await srClient
        .from("open_finance_sync_log")
        .update({
          status:          logStatus,
          accounts_synced: accountsSynced,
          error_message:   errors.length > 0 ? errors.join("; ") : null,
          finished_at:     new Date().toISOString(),
          duration_ms:     Date.now() - startedAt,
        })
        .eq("id", logId);
    }

    revalidatePath("/settings/open-finance");
    revalidatePath("/accounts");
    revalidatePath("/credit-cards");

    const result: OFSyncResult = {
      accountsSynced,
      transactionsCreated: 0,
      transactionsUpdated: 0,
      transactionsSkipped: 0,
      errors,
      syncedAt: new Date().toISOString(),
    };

    return { data: result, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao sincronizar contas.";
    return { data: null, error: msg };
  }
}

// ── Sincronizar transacoes ────────────────────────────────────────────────────

/**
 * Busca transacoes do provider para todas as contas mapeadas de uma conexao
 * e persiste em public.transaction, deduplicando via open_finance_transaction_map.
 *
 * Fluxo:
 *   1. Verifica posse da conexao
 *   2. Abre sync log
 *   3. Busca account_map entries da conexao
 *   4. Para cada conta: chama provider.syncTransactions(from, to)
 *   5. Para cada transacao: check map → insert ou update transaction
 *   6. Fecha sync log
 *
 * Deduplicacao: open_finance_transaction_map(connection_id, provider_tx_id) UNIQUE.
 * Janela padrao: ultimos 90 dias.
 *
 * Clientes:
 *   supabase  — user-scoped (RLS): transaction read/write
 *   srClient  — service_role: transaction_map + sync_log (RLS exige)
 */
export async function syncConnectionTransactions(
  connectionId: string,
  daysBack = 90,
): Promise<ServiceResult<OFSyncResult>> {
  const startedAt = Date.now();

  try {
    const user     = await requireAuth();
    const supabase = await createClient();
    const srClient = createServiceRoleClient();
    const provider = await getOpenFinanceProvider();

    // 1. Verificar posse da conexao
    const { data: conn, error: connErr } = await supabase
      .from("open_finance_connection")
      .select("id, provider_item_id, status")
      .eq("id", connectionId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (connErr || !conn) {
      return { data: null, error: "Conexao nao encontrada ou sem permissao." };
    }

    // 2. Abrir sync log
    const { data: syncLog } = await srClient
      .from("open_finance_sync_log")
      .insert({
        connection_id: connectionId,
        user_id:       user.id,
        trigger:       "manual",
        status:        "running",
        started_at:    new Date().toISOString(),
      })
      .select("id")
      .single();

    const logId = syncLog?.id ?? null;

    // 3. Buscar contas mapeadas (apenas as que tem conta/cartao local)
    const { data: accountMaps } = await supabase
      .from("open_finance_account_map")
      .select("id, provider_account_id, financial_account_id, credit_card_id, account_type")
      .eq("connection_id", connectionId)
      .eq("user_id", user.id);

    const maps = (accountMaps ?? []).filter(
      (m) => m.financial_account_id !== null || m.credit_card_id !== null,
    );

    if (maps.length === 0) {
      if (logId) {
        await srClient
          .from("open_finance_sync_log")
          .update({
            status:        "error",
            error_message: "Nenhuma conta mapeada. Sincronize contas primeiro.",
            finished_at:   new Date().toISOString(),
            duration_ms:   Date.now() - startedAt,
          })
          .eq("id", logId);
      }
      return {
        data: null,
        error: "Nenhuma conta mapeada para esta conexao. Sincronize as contas primeiro.",
      };
    }

    // Janela de sincronizacao
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);

    let txCreated = 0;
    let txUpdated = 0;
    let txSkipped = 0;
    const errors: string[] = [];

    // 4. Para cada conta mapeada
    for (const map of maps) {
      let transactions: Awaited<ReturnType<typeof provider.syncTransactions>>;

      try {
        transactions = await provider.syncTransactions(map.provider_account_id, from, to);
      } catch (err) {
        errors.push(
          `Conta ${map.provider_account_id}: ${err instanceof Error ? err.message : "erro no provider"}`,
        );
        continue;
      }

      // 5. Para cada transacao retornada
      for (const tx of transactions) {
        try {
          // Verificar se ja existe mapeamento para esta transacao
          const { data: existingMap } = await supabase
            .from("open_finance_transaction_map")
            .select("id, transaction_id")
            .eq("connection_id", connectionId)
            .eq("provider_tx_id", tx.externalId)
            .maybeSingle();

          const transactionType = tx.type === "credit" ? "income" : "expense";
          const txStatus        = tx.status === "pending" ? "pending" : "confirmed";

          if (existingMap?.transaction_id) {
            // Atualizar campos que podem mudar (descricao, valor, data, status)
            await supabase
              .from("transaction")
              .update({
                description: tx.description,
                amount:      tx.amount,
                date:        tx.date,
                status:      txStatus,
                updated_at:  new Date().toISOString(),
              })
              .eq("id", existingMap.transaction_id)
              .eq("user_id", user.id);

            txUpdated++;
          } else {
            // Inserir nova transacao
            const { data: newTx, error: txErr } = await supabase
              .from("transaction")
              .insert({
                user_id:     user.id,
                account_id:  map.financial_account_id ?? null,
                card_id:     map.credit_card_id       ?? null,
                type:        transactionType,
                amount:      tx.amount,
                currency:    "BRL",
                description: tx.description,
                date:        tx.date,
                status:      txStatus,
                origin:      "open_finance",
                external_id: tx.externalId,
                is_ignored:  false,
              })
              .select("id")
              .single();

            if (txErr || !newTx) {
              errors.push(`Tx ${tx.externalId}: ${txErr?.message ?? "erro ao inserir"}`);
              continue;
            }

            // Registrar no mapa (service_role — RLS exige)
            await srClient
              .from("open_finance_transaction_map")
              .insert({
                user_id:        user.id,
                connection_id:  connectionId,
                provider_tx_id: tx.externalId,
                transaction_id: newTx.id,
                raw_payload:    tx.rawData,
                imported_at:    new Date().toISOString(),
              });

            txCreated++;
          }
        } catch (err) {
          errors.push(
            `Tx ${tx.externalId}: ${err instanceof Error ? err.message : "erro inesperado"}`,
          );
        }
      }

      txSkipped += Math.max(0, transactions.length - txCreated - txUpdated);
    }

    // 6. Fechar sync log
    const logStatus: "success" | "partial" | "error" =
      errors.length === 0              ? "success" :
      (txCreated + txUpdated) > 0      ? "partial" :
                                         "error";

    if (logId) {
      await srClient
        .from("open_finance_sync_log")
        .update({
          status:               logStatus,
          transactions_created: txCreated,
          transactions_updated: txUpdated,
          transactions_skipped: txSkipped,
          error_message:        errors.length > 0 ? errors.slice(0, 3).join("; ") : null,
          finished_at:          new Date().toISOString(),
          duration_ms:          Date.now() - startedAt,
        })
        .eq("id", logId);
    }

    revalidatePath("/transactions");

    const result: OFSyncResult = {
      accountsSynced:      0,
      transactionsCreated: txCreated,
      transactionsUpdated: txUpdated,
      transactionsSkipped: txSkipped,
      errors,
      syncedAt: new Date().toISOString(),
    };

    return { data: result, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao sincronizar transacoes.";
    return { data: null, error: msg };
  }
}
