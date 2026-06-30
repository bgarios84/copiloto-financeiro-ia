/**
 * Open Finance -- Sync Orchestrator
 * Sprint 9.8 -- Orquestrador Oficial de Sincronizacao
 *
 * UNICA fonte de verdade para a logica de sync Open Finance.
 * Cron, webhooks e sincronizacao manual reutilizam exatamente as mesmas funcoes.
 *
 * Exporta:
 *   syncAccountsCore       -- sync de contas (sem lock/log)
 *   syncTransactionsCore   -- sync de transacoes + categorizacao + reconciliacao (sem lock/log)
 *   runConnectionSync      -- sync completo de uma conexao (com lock + log)
 *   runAllConnectionsSync  -- sync de todas as conexoes ativas
 *
 * Garantias:
 *   - Impede execucao simultanea via lock no sync_log
 *   - Continua sincronizando demais conexoes se uma falhar
 *   - Nao exige sessao de usuario -- usa service_role client
 *   - Registra duracao, contagens e erros por conexao
 */

import { getOpenFinanceProvider } from "@/lib/open-finance";
import { syncInvestmentsInternal, type InvestmentSyncResult } from "@/services/open-finance/investment-sync";
import { categorizeTransaction } from "@/lib/categorization/transaction-categorizer";
import { reconcileTransactions } from "@/lib/open-finance/reconciliation";
import type { ReconciliationInput } from "@/lib/open-finance/reconciliation";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Category } from "@/types/transaction";

// -- Tipos exportados ----------------------------------------------------------

export interface ConnectionSyncResult {
  connectionId:           string;
  userId:                 string;
  /** true se ja havia sync em execucao -- resultado nao aplicado. */
  skipped:                boolean;
  accountsSynced:         number;
  transactionsCreated:    number;
  transactionsUpdated:    number;
  transactionsReconciled: number;
  errors:                 string[];
  durationMs:             number;
  /** Janela efetiva usada para buscar transacoes (dias). */
  effectiveDaysBack:      number;
  /** Sprint 9.11 -- Investment Sync */
  investmentsCreated:     number;
  investmentsUpdated:     number;
  investmentsSkipped:     number;
}

export interface AllConnectionsSyncResult {
  connectionsFound:       number;
  connectionsProcessed:   number;
  connectionsSkipped:     number;
  accountsSynced:         number;
  transactionsCreated:    number;
  transactionsUpdated:    number;
  transactionsReconciled: number;
  results:                ConnectionSyncResult[];
  durationMs:             number;
  startedAt:              string;
  finishedAt:             string;
}

// -- Alias para o tipo do client -----------------------------------------------

type DB = ReturnType<typeof createServiceRoleClient>;

// -- Lock: previne sync simultaneo por conexao ---------------------------------

async function isConnectionSyncing(db: DB, connectionId: string): Promise<boolean> {
  const { data } = await db
    .from("open_finance_sync_log")
    .select("id")
    .eq("connection_id", connectionId)
    .eq("status", "running")
    .limit(1)
    .maybeSingle();
  return data !== null;
}

// -- Core: sync de contas (sem lock/log) --------------------------------------

/**
 * Sincroniza contas/cartoes de uma conexao especifica.
 * Nao abre sync_log -- chamado internamente por runConnectionSync.
 * Pode ser chamado diretamente para testes ou integracao especifica.
 */
export async function syncAccountsCore(
  db:            DB,
  userId:        string,
  connectionId:  string,
  institutionId: string | null,
): Promise<{ accountsSynced: number; errors: string[] }> {
  const provider = await getOpenFinanceProvider();
  const errors: string[] = [];

  const { data: conn } = await db
    .from("open_finance_connection")
    .select("provider_item_id")
    .eq("id", connectionId)
    .single();

  if (!conn) return { accountsSynced: 0, errors: ["Conexao nao encontrada."] };

  let providerAccounts;
  try {
    providerAccounts = await provider.syncAccounts(conn.provider_item_id);
  } catch (err) {
    return {
      accountsSynced: 0,
      errors: [err instanceof Error ? err.message : "Erro ao buscar contas no provider."],
    };
  }

  let accountsSynced = 0;

  for (const account of providerAccounts) {
    try {
      const { data: existingMap } = await db
        .from("open_finance_account_map")
        .select("id, financial_account_id, credit_card_id")
        .eq("connection_id", connectionId)
        .eq("provider_account_id", account.externalId)
        .maybeSingle();

      if (account.type === "credit") {
        if (existingMap?.credit_card_id) {
          await db
            .from("credit_card")
            .update({
              credit_limit:    account.creditLimit    ?? 0,
              available_limit: account.availableLimit ?? 0,
              updated_at:      new Date().toISOString(),
            })
            .eq("id", existingMap.credit_card_id)
            .eq("user_id", userId);

          await db
            .from("open_finance_account_map")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", existingMap.id);
        } else {
          const { data: newCard, error: cardErr } = await db
            .from("credit_card")
            .insert({
              user_id:            userId,
              institution_id:     institutionId,
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
            errors.push(`Cartao "${account.name}": ${cardErr?.message ?? "erro ao inserir"}`);
            continue;
          }

          await db.from("open_finance_account_map").insert({
            connection_id:        connectionId,
            user_id:              userId,
            provider_account_id:  account.externalId,
            credit_card_id:       newCard.id,
            financial_account_id: null,
            account_type:         "credit",
            last_synced_at:       new Date().toISOString(),
          });
        }
      } else {
        const accountType: "checking" | "savings" | "investment" | "wallet" =
          account.type === "savings"    ? "savings"    :
          account.type === "investment" ? "investment" :
          account.type === "wallet"     ? "wallet"     :
          "checking";

        if (existingMap?.financial_account_id) {
          await db
            .from("financial_account")
            .update({
              balance:            account.balance,
              balance_updated_at: new Date().toISOString(),
              updated_at:         new Date().toISOString(),
            })
            .eq("id", existingMap.financial_account_id)
            .eq("user_id", userId);

          await db
            .from("open_finance_account_map")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", existingMap.id);
        } else {
          const { data: newAccount, error: accErr } = await db
            .from("financial_account")
            .insert({
              user_id:            userId,
              institution_id:     institutionId,
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
            errors.push(`Conta "${account.name}": ${accErr?.message ?? "erro ao inserir"}`);
            continue;
          }

          await db.from("open_finance_account_map").insert({
            connection_id:        connectionId,
            user_id:              userId,
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

  return { accountsSynced, errors };
}

// -- Core: sync de transacoes + categorizacao + reconciliacao (sem lock/log) --

/**
 * Sincroniza transacoes de uma conexao, executa categorizacao automatica
 * e conciliacao de pares (Sprint 9.6).
 * Nao abre sync_log -- chamado internamente por runConnectionSync.
 */
export async function syncTransactionsCore(
  db:           DB,
  userId:       string,
  connectionId: string,
  daysBack:     number,
): Promise<{ txCreated: number; txUpdated: number; txReconciled: number; errors: string[] }> {
  const provider = await getOpenFinanceProvider();
  const errors: string[] = [];

  const { data: accountMaps } = await db
    .from("open_finance_account_map")
    .select("id, provider_account_id, financial_account_id, credit_card_id, account_type")
    .eq("connection_id", connectionId)
    .eq("user_id", userId);

  const maps = (accountMaps ?? []).filter(
    (m) => m.financial_account_id !== null || m.credit_card_id !== null,
  );

  if (maps.length === 0) {
    return { txCreated: 0, txUpdated: 0, txReconciled: 0, errors: ["Nenhuma conta mapeada."] };
  }

  const to   = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);

  // Categorias do usuario (sistema + proprias)
  const { data: categoriesRaw } = await db
    .from("category")
    .select("id, user_id, parent_id, name, icon, color, type, is_system, sort_order")
    .is("deleted_at", null)
    .is("parent_id", null)
    .or(`user_id.eq.${userId},user_id.is.null`);
  const categories: Category[] = (categoriesRaw ?? []) as Category[];

  let txCreated = 0;
  let txUpdated = 0;
  const syncedTxs: ReconciliationInput[] = [];

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

    for (const tx of transactions) {
      try {
        const { data: existingTxMap } = await db
          .from("open_finance_transaction_map")
          .select("id, transaction_id")
          .eq("connection_id", connectionId)
          .eq("provider_tx_id", tx.externalId)
          .maybeSingle();

        const transactionType = tx.type === "credit" ? "income" : "expense";
        const txStatus        = tx.status === "pending" ? "pending" : "confirmed";

        if (existingTxMap?.transaction_id) {
          const autoCategory = categorizeTransaction(
            { description: tx.description, type: transactionType, providerCategory: tx.category },
            categories,
          );
          await db
            .from("transaction")
            .update({
              description: tx.description,
              amount:      tx.amount,
              date:        tx.date,
              status:      txStatus,
              ...(autoCategory ? { category_id: autoCategory } : {}),
              updated_at:  new Date().toISOString(),
            })
            .eq("id", existingTxMap.transaction_id)
            .eq("user_id", userId)
            .is("category_id", null);

          syncedTxs.push({
            id:          existingTxMap.transaction_id,
            externalId:  tx.externalId,
            accountId:   map.financial_account_id ?? null,
            cardId:      map.credit_card_id       ?? null,
            date:        tx.date,
            amount:      tx.amount,
            type:        transactionType,
            description: tx.description,
            isManual:    false,
          });

          txUpdated++;
        } else {
          const { data: newTx, error: txErr } = await db
            .from("transaction")
            .insert({
              user_id:     userId,
              account_id:  map.financial_account_id ?? null,
              card_id:     map.credit_card_id       ?? null,
              type:        transactionType,
              amount:      tx.amount,
              currency:    "BRL",
              description: tx.description,
              date:        tx.date,
              status:      txStatus,
              category_id: categorizeTransaction(
                { description: tx.description, type: transactionType, providerCategory: tx.category },
                categories,
              ),
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

          await db.from("open_finance_transaction_map").insert({
            user_id:        userId,
            connection_id:  connectionId,
            provider_tx_id: tx.externalId,
            transaction_id: newTx.id,
            raw_payload:    tx.rawData,
            imported_at:    new Date().toISOString(),
          });

          syncedTxs.push({
            id:          newTx.id,
            externalId:  tx.externalId,
            accountId:   map.financial_account_id ?? null,
            cardId:      map.credit_card_id       ?? null,
            date:        tx.date,
            amount:      tx.amount,
            type:        transactionType,
            description: tx.description,
            isManual:    false,
          });

          txCreated++;
        }
      } catch (err) {
        errors.push(`Tx ${tx.externalId}: ${err instanceof Error ? err.message : "erro inesperado"}`);
      }
    }
  }

  // Reconciliacao automatica (Sprint 9.6)
  let txReconciled = 0;
  if (syncedTxs.length > 0) {
    const reconcileResult = reconcileTransactions(syncedTxs);
    for (const match of reconcileResult.matches) {
      try {
        if (match.action === "mark_transfer") {
          await db
            .from("transaction")
            .update({ type: "transfer", updated_at: new Date().toISOString() })
            .eq("id", match.transactionId)
            .eq("user_id", userId)
            .eq("origin", "open_finance")
            .neq("type", "transfer");
        } else {
          await db
            .from("transaction")
            .update({ is_ignored: true, updated_at: new Date().toISOString() })
            .eq("id", match.transactionId)
            .eq("user_id", userId)
            .eq("origin", "open_finance")
            .eq("is_ignored", false);
        }
        txReconciled++;
      } catch {
        // Reconciliacao nao e critica -- ignora falha individual
      }
    }
  }

  return { txCreated, txUpdated, txReconciled, errors };
}

// -- Incremental window helper (Sprint 9.10) ----------------------------------

/**
 * Calcula a janela efetiva de busca de transacoes.
 *
 * Logica:
 *   - Sem last_synced_at (primeiro sync): retorna daysBackFallback inteiro.
 *   - Com last_synced_at: dias desde o ultimo sync + 2 dias de overlap.
 *   - Minimo: 2 dias (garante reprocessamento de txs pendentes do dia anterior).
 *   - Maximo: daysBackFallback (nao expande alem do limite do chamador).
 *
 * Exemplos:
 *   - Cron diario (daysBackFallback=7): sync de ontem -> 3 dias (1 dia + 2 overlap)
 *   - Webhook (daysBackFallback=7):     sync de 2h atras -> 2 dias (minimo)
 *   - Manual (daysBackFallback=90):     primeiro sync -> 90 dias
 */
function computeEffectiveDaysBack(lastSyncedAt: string | null, daysBackFallback: number): number {
  if (!lastSyncedAt) return daysBackFallback;

  const lastSync   = new Date(lastSyncedAt).getTime();
  const now        = Date.now();
  const daysSince  = Math.ceil((now - lastSync) / 86_400_000);
  const withBuffer = daysSince + 2;          // overlap para txs chegando tarde
  const effective  = Math.max(2, withBuffer); // minimo sempre 2 dias
  return Math.min(effective, daysBackFallback);
}

// -- runConnectionSync: sync completo de uma conexao (com lock + log) ---------

/**
 * Ponto de entrada oficial para sincronizar UMA conexao.
 * Usado por: cron, webhooks, sincronizacao manual.
 *
 * Fluxo:
 *   1. Verifica lock (impede execucao simultanea)
 *   2. Le last_synced_at para calcular janela incremental
 *   3. Abre sync_log com status "running"
 *   4. Marca conexao como "syncing"
 *   5. syncAccountsCore -> syncTransactionsCore (janela incremental)
 *   6. Atualiza status da conexao (connected/error)
 *   7. Fecha sync_log com duracao e contagens
 *
 * Janela de transacoes (Sprint 9.10 -- Incremental Sync):
 *   - Se last_synced_at existir: dias desde o ultimo sync + 2 dias de overlap
 *   - Minimo: 2 dias (sempre reprocura o dia anterior por txs pendentes)
 *   - Maximo: daysBack (cap do chamador -- 90 para manual, 7 para cron)
 *   - Primeiro sync (sem last_synced_at): usa daysBack como fallback completo
 *
 * @param db           - service_role client (sem RLS)
 * @param userId       - UUID do dono da conexao
 * @param connectionId - UUID da open_finance_connection
 * @param daysBack     - janela maxima / fallback de primeiro sync (padrao: 90)
 * @param trigger      - origem do sync ("cron" | "manual" | "webhook")
 */
export async function runConnectionSync(
  db:           DB,
  userId:       string,
  connectionId: string,
  daysBack      = 90,
  trigger:      "cron" | "manual" | "webhook" = "manual",
): Promise<ConnectionSyncResult> {
  const connStart = Date.now();

  // 1. Lock
  const alreadyRunning = await isConnectionSyncing(db, connectionId);
  if (alreadyRunning) {
    return {
      connectionId, userId, skipped: true,
      accountsSynced: 0, transactionsCreated: 0,
      transactionsUpdated: 0, transactionsReconciled: 0,
      errors: [], durationMs: 0, effectiveDaysBack: 0,
      investmentsCreated: 0, investmentsUpdated: 0, investmentsSkipped: 0,
    };
  }

  // 2. Buscar institution_id + last_synced_at para calcular janela incremental
  const { data: connRow } = await db
    .from("open_finance_connection")
    .select("institution_id, last_synced_at")
    .eq("id", connectionId)
    .single();
  const institutionId = connRow?.institution_id ?? null;

  // Buscar nome da instituicao para preencher investment_position.institution
  let institutionName: string | null = null;
  if (institutionId) {
    const { data: inst } = await db
      .from("institution")
      .select("name")
      .eq("id", institutionId)
      .single();
    institutionName = inst?.name ?? null;
  }

  // Sprint 9.10 -- Janela incremental
  const effectiveDaysBack = computeEffectiveDaysBack(connRow?.last_synced_at ?? null, daysBack);

  // 3. Abrir sync log
  const { data: syncLog } = await db
    .from("open_finance_sync_log")
    .insert({
      connection_id: connectionId,
      user_id:       userId,
      trigger,
      status:        "running",
      started_at:    new Date().toISOString(),
    })
    .select("id")
    .single();
  const logId = syncLog?.id ?? null;

  // 4. Marcar conexao como syncing
  await db
    .from("open_finance_connection")
    .update({ status: "syncing", updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  const allErrors: string[] = [];

  // Pre-declarados com defaults: garante que steps 6/7/8 sempre executam,
  // mesmo se uma excecao inesperada escapar dos catch internos de cada step.
  let accountResult: { accountsSynced: number; errors: string[] } =
    { accountsSynced: 0, errors: [] };
  let txResult: { txCreated: number; txUpdated: number; txReconciled: number; errors: string[] } =
    { txCreated: 0, txUpdated: 0, txReconciled: 0, errors: [] };
  let invResult: InvestmentSyncResult =
    { investmentsCreated: 0, investmentsUpdated: 0, investmentsSkipped: 0, errors: [] };

  try {
    // 5a. Sync de contas
    accountResult = await syncAccountsCore(db, userId, connectionId, institutionId);
    allErrors.push(...accountResult.errors);

    // 5b. Sync de transacoes (+ categorizacao + reconciliacao) -- janela incremental
    txResult = await syncTransactionsCore(db, userId, connectionId, effectiveDaysBack);
    allErrors.push(...txResult.errors);

    // 5c. Sprint 9.11 -- Sync de investimentos (nao e critico: erro nao bloqueia o resto)
    invResult = await syncInvestmentsInternal(
      db, userId, connectionId, institutionName, institutionId,
    ).catch((err) => {
      const msg = err instanceof Error ? err.message : "Erro no sync de investimentos.";
      allErrors.push(msg);
      return { investmentsCreated: 0, investmentsUpdated: 0, investmentsSkipped: 0, errors: [msg] };
    });
    allErrors.push(...invResult.errors);
  } catch (unexpectedErr) {
    // Excecao inesperada apos conexao ja estar em "syncing".
    // Captura aqui garante que steps 6/7/8 sempre executam e resetam o status.
    const msg = unexpectedErr instanceof Error ? unexpectedErr.message : "Erro inesperado no sync.";
    allErrors.push(`Erro critico: ${msg}`);
    console.error(`[orchestrator] Excecao inesperada no sync de ${connectionId}:`, msg);
  }

  const durationMs = Date.now() - connStart;

  // 6. Determinar status final
  const finalStatus: "connected" | "error" =
    allErrors.length === 0 ||
    (accountResult.accountsSynced + txResult.txCreated + txResult.txUpdated) > 0
      ? "connected"
      : "error";

  // 7. Atualizar conexao
  await db
    .from("open_finance_connection")
    .update({
      status:         finalStatus,
      last_synced_at: new Date().toISOString(),
      error_message:  allErrors.length > 0 ? allErrors.slice(0, 3).join("; ") : null,
      updated_at:     new Date().toISOString(),
    })
    .eq("id", connectionId);

  // 8. Fechar sync log
  const logStatus: "success" | "partial" | "error" =
    allErrors.length === 0 ? "success" :
    (accountResult.accountsSynced + txResult.txCreated + txResult.txUpdated) > 0
      ? "partial"
      : "error";

  if (logId) {
    await db
      .from("open_finance_sync_log")
      .update({
        status:               logStatus,
        accounts_synced:      accountResult.accountsSynced,
        transactions_created: txResult.txCreated,
        transactions_updated: txResult.txUpdated,
        transactions_skipped: invResult.investmentsSkipped,
        error_message:        allErrors.length > 0 ? allErrors.slice(0, 3).join("; ") : null,
        finished_at:          new Date().toISOString(),
        duration_ms:          durationMs,
      })
      .eq("id", logId);
  }

  return {
    connectionId,
    userId,
    skipped:                false,
    accountsSynced:         accountResult.accountsSynced,
    transactionsCreated:    txResult.txCreated,
    transactionsUpdated:    txResult.txUpdated,
    transactionsReconciled: txResult.txReconciled,
    errors:                 allErrors,
    durationMs,
    effectiveDaysBack,
    investmentsCreated:     invResult.investmentsCreated,
    investmentsUpdated:     invResult.investmentsUpdated,
    investmentsSkipped:     invResult.investmentsSkipped,
  };
}

// -- runAllConnectionsSync: sync de todas as conexoes ativas ------------------

/**
 * Busca todas as conexoes ativas de todos os usuarios e executa runConnectionSync.
 * Usado pelo cron e pode ser chamado por webhooks de batch.
 * Continua mesmo se uma conexao falhar.
 *
 * @param db       - service_role client
 * @param daysBack - janela de transacoes (padrao: 7 dias para cron incremental)
 */
export async function runAllConnectionsSync(
  db:      DB,
  daysBack = 7,
): Promise<AllConnectionsSyncResult> {
  const globalStart = Date.now();
  const startedAt   = new Date().toISOString();

  // -- Recuperar conexoes travadas em "syncing" de runs anteriores que crasharam --
  // Qualquer sync_log com status="running" mais velho que 30 min indica run abandonada.
  // Resetamos a conexao para "connected" e o log para "error" antes de iniciar o ciclo.
  const stuckCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: stuckLogs } = await db
    .from("open_finance_sync_log")
    .select("id, connection_id")
    .eq("status", "running")
    .lt("started_at", stuckCutoff);

  if (stuckLogs && stuckLogs.length > 0) {
    const stuckConnectionIds = stuckLogs.map((l) => l.connection_id);
    console.warn(
      `[orchestrator] Recuperando ${stuckLogs.length} conexao(oes) travada(s) em "syncing".`,
    );
    await db
      .from("open_finance_connection")
      .update({ status: "connected", updated_at: new Date().toISOString() })
      .in("id", stuckConnectionIds);
    await db
      .from("open_finance_sync_log")
      .update({
        status:        "error",
        error_message: "Sync interrompido (timeout 30 min). Resetado automaticamente.",
        finished_at:   new Date().toISOString(),
      })
      .in("id", stuckLogs.map((l) => l.id));
  }

  const { data: connections, error: connErr } = await db
    .from("open_finance_connection")
    .select("id, user_id, status")
    .eq("status", "connected")
    .is("deleted_at", null);

  if (connErr || !connections) {
    console.error("[orchestrator] Erro ao buscar conexoes:", connErr?.message);
    const now = new Date().toISOString();
    return {
      connectionsFound: 0, connectionsProcessed: 0, connectionsSkipped: 0,
      accountsSynced: 0, transactionsCreated: 0, transactionsUpdated: 0, transactionsReconciled: 0,
      results: [], durationMs: Date.now() - globalStart, startedAt, finishedAt: now,
    };
  }

  const results: ConnectionSyncResult[] = [];
  let totalAccountsSynced         = 0;
  let totalTransactionsCreated    = 0;
  let totalTransactionsUpdated    = 0;
  let totalTransactionsReconciled = 0;
  let connectionsSkipped          = 0;

  for (const conn of connections) {
    try {
      const result = await runConnectionSync(db, conn.user_id, conn.id, daysBack, "cron");
      results.push(result);

      if (result.skipped) {
        connectionsSkipped++;
      } else {
        totalAccountsSynced         += result.accountsSynced;
        totalTransactionsCreated    += result.transactionsCreated;
        totalTransactionsUpdated    += result.transactionsUpdated;
        totalTransactionsReconciled += result.transactionsReconciled;

        console.log(
          `[orchestrator] ${conn.id} (${conn.user_id}): `+
          `${result.accountsSynced} contas, `+
          `${result.transactionsCreated} tx criadas, `+
          `${result.transactionsUpdated} atualizadas, `+
          `${result.transactionsReconciled} reconciliadas, `+
          `inv: ${result.investmentsCreated}c/${result.investmentsUpdated}u, `+
          `janela=${result.effectiveDaysBack}d -- ${result.durationMs}ms`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro fatal inesperado.";
      console.error(`[orchestrator] Conexao ${conn.id} falhou fatalmente:`, msg);
      results.push({
        connectionId: conn.id, userId: conn.user_id, skipped: false,
        accountsSynced: 0, transactionsCreated: 0,
        transactionsUpdated: 0, transactionsReconciled: 0,
        errors: [msg], durationMs: 0, effectiveDaysBack: 0,
        investmentsCreated: 0, investmentsUpdated: 0, investmentsSkipped: 0,
      });
    }
  }

  const finishedAt = new Date().toISOString();
  return {
    connectionsFound:       connections.length,
    connectionsProcessed:   connections.length - connectionsSkipped,
    connectionsSkipped,
    accountsSynced:         totalAccountsSynced,
    transactionsCreated:    totalTransactionsCreated,
    transactionsUpdated:    totalTransactionsUpdated,
    transactionsReconciled: totalTransactionsReconciled,
    results,
    durationMs:             Date.now() - globalStart,
    startedAt,
    finishedAt,
  };
}
