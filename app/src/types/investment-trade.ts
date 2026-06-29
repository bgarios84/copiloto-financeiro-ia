/**
 * Types — Investment Trade (Livro de Operações)
 * Sprint 6.5
 */

import type { ServiceResult } from "@/types/fx-rate";
export type { ServiceResult };

// ── Trade type ────────────────────────────────────────────────────────────────

export type TradeType =
  | "buy"
  | "sell"
  | "dividend"
  | "amortization"
  | "split"
  | "reverse_split"
  | "bonus";

export const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  buy:          "Compra",
  sell:         "Venda",
  dividend:     "Dividendo",
  amortization: "Amortização",
  split:        "Desdobramento",
  reverse_split:"Grupamento",
  bonus:        "Bonificação",
};

export const TRADE_TYPE_ICONS: Record<TradeType, string> = {
  buy:          "🛒",
  sell:         "💸",
  dividend:     "💰",
  amortization: "📉",
  split:        "✂️",
  reverse_split:"🔗",
  bonus:        "🎁",
};

/** Paleta de cores por tipo */
export const TRADE_TYPE_COLORS: Record<TradeType, { bg: string; text: string }> = {
  buy:          { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400" },
  sell:         { bg: "bg-red-100 dark:bg-red-900/30",         text: "text-red-600 dark:text-red-400"         },
  dividend:     { bg: "bg-blue-100 dark:bg-blue-900/30",       text: "text-blue-700 dark:text-blue-400"       },
  amortization: { bg: "bg-purple-100 dark:bg-purple-900/30",   text: "text-purple-700 dark:text-purple-400"   },
  split:        { bg: "bg-yellow-100 dark:bg-yellow-900/30",   text: "text-yellow-700 dark:text-yellow-400"   },
  reverse_split:{ bg: "bg-orange-100 dark:bg-orange-900/30",   text: "text-orange-700 dark:text-orange-400"   },
  bonus:        { bg: "bg-teal-100 dark:bg-teal-900/30",       text: "text-teal-700 dark:text-teal-400"       },
};

/** Tipos que afetam quantidade/preço médio da posição */
export const TRADE_TYPES_AFFECT_POSITION: TradeType[] = [
  "buy", "sell", "split", "reverse_split", "bonus",
];

/** Tipos que são apenas cashflow (não alteram posição) */
export const TRADE_TYPES_CASHFLOW_ONLY: TradeType[] = [
  "dividend", "amortization",
];

// ── Table row ─────────────────────────────────────────────────────────────────

export interface InvestmentTrade {
  id:                     string;
  user_id:                string;
  investment_position_id: string;
  trade_type:             TradeType;
  trade_date:             string;   // "YYYY-MM-DD"
  quantity:               number | null;
  unit_price:             number | null;
  total_amount:           number | null;
  fee:                    number;
  tax:                    number;
  currency:               string;
  notes:                  string | null;
  created_at:             string;
  updated_at:             string;
  deleted_at:             string | null;
}

// ── Form data ─────────────────────────────────────────────────────────────────

export interface TradeFormData {
  trade_type:   TradeType;
  trade_date:   string;   // "YYYY-MM-DD"
  quantity:     string;   // numeric string
  unit_price:   string;   // numeric string
  total_amount: string;   // numeric string
  fee:          string;   // numeric string
  tax:          string;   // numeric string
  currency:     string;
  notes:        string;
}

// ── Recalculated position snapshot ───────────────────────────────────────────

/**
 * Resultado do recalculo de posição a partir dos trades.
 * quantity, average_price, acquisition_value são sobrescritos na posição.
 */
export interface PositionSnapshot {
  quantity:          number;
  average_price:     number;
  acquisition_value: number;
}
