/**
 * Types — Transaction Module
 * Sprint 5.3
 */

import type { FinancialAccount } from "./financial-account";
import type { CreditCard } from "./credit-card";

// ── Transaction ───────────────────────────────────────────────────────────────

export type TransactionType   = "income" | "expense" | "transfer";
export type TransactionStatus = "pending" | "confirmed" | "cancelled";

export interface Category {
  id:         string;
  user_id:    string | null;
  parent_id:  string | null;
  name:       string;
  icon:       string | null;
  color:      string | null;
  type:       "income" | "expense" | "both";
  is_system:  boolean;
  sort_order: number;
}

export interface Transaction {
  id:               string;
  user_id:          string;
  account_id:       string | null;
  card_id:          string | null;
  category_id:      string | null;
  subcategory_id:   string | null;
  type:             TransactionType;
  amount:           number;
  currency:         string;
  description:      string;
  notes:            string | null;
  date:             string;           // DATE — "YYYY-MM-DD"
  status:           TransactionStatus;
  is_ignored:       boolean;
  origin:           string;
  created_at:       string;
  updated_at:       string;
  deleted_at:       string | null;
  // joined
  category?: Category | null;
  account?:  Pick<FinancialAccount, "id" | "name" | "color"> | null;
  card?:     Pick<CreditCard,       "id" | "name" | "color"> | null;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export interface TransactionFormData {
  description: string;
  amount:      string;        // string para input, parseado antes de enviar
  date:        string;        // "YYYY-MM-DD"
  type:        TransactionType;
  category_id: string;
  account_id:  string;
  card_id:     string;
  currency:    string;
  notes:       string;
  status:      TransactionStatus;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income:   "Receita",
  expense:  "Despesa",
  transfer: "Transferência",
};

export const TRANSACTION_STATUS_LABELS: Record<TransactionStatus, string> = {
  pending:   "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

export const TRANSACTION_CURRENCIES = [
  { value: "BRL", label: "R$ — Real Brasileiro"    },
  { value: "USD", label: "$ — Dólar Americano"     },
  { value: "EUR", label: "€ — Euro"                },
  { value: "GBP", label: "£ — Libra Esterlina"     },
] as const;

// ── Service response ──────────────────────────────────────────────────────────

export type { ServiceResult } from "./common";
