/**
 * Types — Open Finance Domain
 * Sprint 9.1B — Open Finance Types
 *
 * Espelha exatamente as tabelas de supabase/migrations/011_open_finance_foundation.sql.
 * Nenhum campo inventado — apenas o que existe no schema.
 *
 * Para tipos da camada de provider (Pluggy, Belvo), ver src/lib/open-finance/types.ts.
 */

// ── Enums / Union types ───────────────────────────────────────────────────────

/** provider CHECK IN ('pluggy','belvo') */
export type OpenFinanceProviderName = "pluggy" | "belvo";

/** status CHECK IN (...) em open_finance_connection */
export type OpenFinanceConnectionStatus =
  | "pending"
  | "connected"
  | "syncing"
  | "expired"
  | "error"
  | "disconnected"
  | "pending_user_action";

/** trigger CHECK IN (...) em open_finance_sync_log */
export type OpenFinanceSyncTrigger =
  | "manual"
  | "cron"
  | "webhook"
  | "first_sync";

/** status CHECK IN (...) em open_finance_sync_log */
export type OpenFinanceSyncStatus =
  | "running"
  | "success"
  | "partial"
  | "error";

/** status CHECK IN (...) em open_finance_webhook_event */
export type OpenFinanceWebhookStatus =
  | "pending"
  | "processed"
  | "failed"
  | "ignored";

/**
 * Tipos de conta usados em open_finance_account_map.account_type.
 * Derivado dos subtipos retornados pelo provider; sem CHECK no schema.
 */
export type OpenFinanceAccountType =
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "wallet";

// ── Constantes de label ───────────────────────────────────────────────────────

export const OPEN_FINANCE_CONNECTION_STATUS_LABELS: Record<OpenFinanceConnectionStatus, string> = {
  pending:              "Aguardando conexao",
  connected:            "Conectado",
  syncing:              "Sincronizando",
  expired:              "Expirado",
  error:                "Erro",
  disconnected:         "Desconectado",
  pending_user_action:  "Reautorizacao necessaria",
};

export const OPEN_FINANCE_SYNC_STATUS_LABELS: Record<OpenFinanceSyncStatus, string> = {
  running: "Em andamento",
  success: "Concluido",
  partial: "Parcial",
  error:   "Erro",
};

export const OPEN_FINANCE_ACCOUNT_TYPE_LABELS: Record<OpenFinanceAccountType, string> = {
  checking:   "Conta Corrente",
  savings:    "Poupanca",
  credit:     "Cartao de Credito",
  investment: "Investimento",
  wallet:     "Carteira Digital",
};

// ── open_finance_connection ───────────────────────────────────────────────────

/**
 * Conexao Open Finance autorizada pelo usuario.
 * Armazena apenas provider_item_id (referencia nao-sensivel) — sem credenciais.
 */
export interface OpenFinanceConnection {
  id:                  string;
  user_id:             string;
  provider:            OpenFinanceProviderName;
  /** item_id do provider (ex: Pluggy). Nao sensivel — apenas referencia. */
  provider_item_id:    string;
  institution_id:      string | null;
  status:              OpenFinanceConnectionStatus;
  error_message:       string | null;
  consent_expires_at:  string | null;   // TIMESTAMPTZ como ISO string
  last_synced_at:      string | null;   // TIMESTAMPTZ como ISO string
  created_at:          string;
  updated_at:          string;
  deleted_at:          string | null;
}

// ── open_finance_account_map ──────────────────────────────────────────────────

/**
 * Mapeamento de conta do provider para financial_account ou credit_card local.
 * Constraint: financial_account_id XOR credit_card_id (ou nenhum).
 */
export interface OpenFinanceAccountMap {
  id:                   string;
  connection_id:        string;
  user_id:              string;
  provider_account_id:  string;
  financial_account_id: string | null;
  credit_card_id:       string | null;
  account_type:         OpenFinanceAccountType;
  last_synced_at:       string | null;
  created_at:           string;
}

// ── open_finance_sync_log ─────────────────────────────────────────────────────

/** Log imutavel de operacao de sincronizacao. Apenas service_role escreve. */
export interface OpenFinanceSyncLog {
  id:                   string;
  connection_id:        string;
  user_id:              string;
  trigger:              OpenFinanceSyncTrigger;
  status:               OpenFinanceSyncStatus;
  accounts_synced:      number;       // SMALLINT
  transactions_created: number;       // INT
  transactions_updated: number;       // INT
  transactions_skipped: number;       // INT
  error_message:        string | null;
  started_at:           string;
  finished_at:          string | null;
  duration_ms:          number | null;
}

// ── open_finance_webhook_event ────────────────────────────────────────────────

/** Evento de webhook recebido do provider. Tabela interna — sem acesso de usuario. */
export interface OpenFinanceWebhookEvent {
  id:               string;
  provider:         OpenFinanceProviderName;
  event_type:       string;
  provider_item_id: string;
  payload:          Record<string, unknown>;   // JSONB
  /** HMAC-SHA256 enviado pelo provider para verificacao de autenticidade. */
  signature:        string | null;
  status:           OpenFinanceWebhookStatus;
  processed_at:     string | null;
  error_message:    string | null;
  received_at:      string;
}

// ── open_finance_transaction_map ──────────────────────────────────────────────

/** Chave de deduplicacao entre transacoes do provider e transaction local. */
export interface OpenFinanceTransactionMap {
  id:             string;
  user_id:        string;
  connection_id:  string;
  provider_tx_id: string;
  transaction_id: string | null;
  raw_payload:    Record<string, unknown>;   // JSONB — snapshot para auditoria
  imported_at:    string;
}

// ── Service response ──────────────────────────────────────────────────────────

export type { ServiceResult } from "./common";
