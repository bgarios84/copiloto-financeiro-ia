/**
 * Types — Open Finance Domain
 * Sprint 9.1 — Open Finance Foundation
 *
 * Tipos que espelham as tabelas do banco (open_finance_*).
 * Para tipos da interface do provider, ver src/lib/open-finance/types.ts.
 */

// ── Status ────────────────────────────────────────────────────────────────────

export type OFConnectionStatus =
  | "pending"
  | "connected"
  | "syncing"
  | "expired"
  | "error"
  | "disconnected"
  | "pending_user_action";

export type OFProvider = "pluggy" | "belvo";

export type OFSyncTrigger = "manual" | "cron" | "webhook" | "first_sync";

export type OFSyncStatus = "running" | "success" | "partial" | "error";

export type OFWebhookStatus = "pending" | "processed" | "failed" | "ignored";

// ── open_finance_connection ───────────────────────────────────────────────────

export interface OFConnection {
  id:                 string;
  user_id:            string;
  provider:           OFProvider;
  provider_item_id:   string;           // item_id do Pluggy — nao sensivel
  institution_id:     string | null;
  status:             OFConnectionStatus;
  error_message:      string | null;
  consent_expires_at: string | null;    // ISO timestamp
  last_synced_at:     string | null;    // ISO timestamp
  created_at:         string;
  updated_at:         string;
  deleted_at:         string | null;
}

// ── open_finance_account_map ──────────────────────────────────────────────────

export interface OFAccountMap {
  id:                    string;
  connection_id:         string;
  user_id:               string;
  provider_account_id:   string;
  financial_account_id:  string | null;
  credit_card_id:        string | null;
  account_type:          string;
  last_synced_at:        string | null;
  created_at:            string;
}

// ── open_finance_sync_log ─────────────────────────────────────────────────────

export interface OFSyncLog {
  id:                   string;
  connection_id:        string;
  user_id:              string;
  trigger:              OFSyncTrigger;
  status:               OFSyncStatus;
  accounts_synced:      number;
  transactions_created: number;
  transactions_updated: number;
  transactions_skipped: number;
  error_message:        string | null;
  started_at:           string;
  finished_at:          string | null;
  duration_ms:          number | null;
}

// ── open_finance_webhook_event ────────────────────────────────────────────────

export interface OFWebhookEvent {
  id:               string;
  provider:         OFProvider;
  event_type:       string;
  provider_item_id: string;
  payload:          Record<string, unknown>;
  signature:        string | null;
  status:           OFWebhookStatus;
  processed_at:     string | null;
  error_message:    string | null;
  received_at:      string;
}

// ── open_finance_transaction_map ──────────────────────────────────────────────

export interface OFTransactionMap {
  id:             string;
  user_id:        string;
  connection_id:  string;
  provider_tx_id: string;
  transaction_id: string | null;
  raw_payload:    Record<string, unknown>;
  imported_at:    string;
}

// ── Service response ──────────────────────────────────────────────────────────

export type { ServiceResult } from "./common";
