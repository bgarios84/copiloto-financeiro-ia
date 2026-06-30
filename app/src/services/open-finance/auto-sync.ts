/**
 * Open Finance -- Auto-Sync Service
 * Sprint 9.7 -- Sincronizacao Automatica
 * Sprint 9.8 -- Refatorado para delegar ao Sync Orchestrator
 *
 * Ponto de entrada para o cron job de sincronizacao automatica.
 * Toda a logica de sync esta em sync-orchestrator.ts.
 * Usa service_role -- nao requer sessao de usuario.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  runAllConnectionsSync,
  type ConnectionSyncResult,
  type AllConnectionsSyncResult,
} from "@/services/open-finance/sync-orchestrator";

// -- Tipos publicos (mantidos por compatibilidade) -----------------------------

export type AutoSyncConnectionResult = ConnectionSyncResult;

export type AutoSyncSummary = AllConnectionsSyncResult;

// -- Funcao exportada ----------------------------------------------------------

/**
 * Sincroniza todas as conexoes ativas de todos os usuarios.
 * Chamado via cron diariamente -- janela incremental de 7 dias.
 * Nao inicia novo sync se ja houver um "running" para a mesma conexao.
 */
export async function autoSyncAllConnections(daysBack = 7): Promise<AutoSyncSummary> {
  const db = createServiceRoleClient();
  return runAllConnectionsSync(db, daysBack);
}
