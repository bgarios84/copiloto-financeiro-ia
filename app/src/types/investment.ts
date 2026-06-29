/**
 * Types — Investment Position
 * Sprint 6.4 — Módulo de Investimentos
 *
 * Separação arquitetural:
 *   manual_asset       → ativos físicos (imóvel, veículo, cripto custódia própria)
 *   investment_position → posições financeiras em corretoras (ações, FIIs, renda fixa, fundos)
 */

import type { ServiceResult } from "@/types/fx-rate";
export type { ServiceResult };

// ── Asset class ───────────────────────────────────────────────────────────────

export type AssetClass =
  | "stock_br"
  | "fii"
  | "etf_br"
  | "bdr"
  | "stock_us"
  | "etf_us"
  | "crypto"
  | "fixed_income"
  | "fund"
  | "other";

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  stock_br:     "Ação (Brasil)",
  fii:          "Fundo Imobiliário",
  etf_br:       "ETF (Brasil)",
  bdr:          "BDR",
  stock_us:     "Ação (EUA)",
  etf_us:       "ETF (EUA)",
  crypto:       "Criptomoeda",
  fixed_income: "Renda Fixa",
  fund:         "Fundo de Investimento",
  other:        "Outros",
};

export const ASSET_CLASS_ICONS: Record<AssetClass, string> = {
  stock_br:     "📈",
  fii:          "🏢",
  etf_br:       "📊",
  bdr:          "🌎",
  stock_us:     "🗽",
  etf_us:       "📉",
  crypto:       "₿",
  fixed_income: "🏦",
  fund:         "💼",
  other:        "💰",
};

export const ASSET_CLASS_COLORS: Record<AssetClass, string> = {
  stock_br:     "#3B82F6",
  fii:          "#8B5CF6",
  etf_br:       "#06B6D4",
  bdr:          "#F59E0B",
  stock_us:     "#10B981",
  etf_us:       "#6EE7B7",
  crypto:       "#F97316",
  fixed_income: "#84CC16",
  fund:         "#EC4899",
  other:        "#6B7280",
};

/** Moedas padrão por classe de ativo */
export const ASSET_CLASS_CURRENCY: Partial<Record<AssetClass, string>> = {
  stock_br:     "BRL",
  fii:          "BRL",
  etf_br:       "BRL",
  bdr:          "BRL",
  stock_us:     "USD",
  etf_us:       "USD",
  crypto:       "BRL",
  fixed_income: "BRL",
  fund:         "BRL",
  other:        "BRL",
};

// ── Table row ─────────────────────────────────────────────────────────────────

export interface InvestmentPosition {
  id:                string;
  user_id:           string;
  asset_name:        string;
  ticker:            string | null;
  asset_class:       AssetClass;
  quantity:          number | null;
  average_price:     number | null;
  current_price:     number | null;
  currency:          string;
  institution:       string | null;
  current_value:     number | null;
  acquisition_value: number | null;
  notes:             string | null;
  created_at:        string;
  updated_at:        string;
  deleted_at:        string | null;
}

// ── Form data ─────────────────────────────────────────────────────────────────

export interface InvestmentFormData {
  asset_name:        string;
  ticker:            string;
  asset_class:       AssetClass;
  quantity:          string;   // numeric string — parsed on save
  average_price:     string;   // numeric string
  current_price:     string;   // numeric string
  currency:          string;
  institution:       string;
  current_value:     string;   // numeric string — pode ser informado direto
  acquisition_value: string;   // numeric string
  notes:             string;
}

// ── Summary types ─────────────────────────────────────────────────────────────

export interface PositionByClass {
  asset_class:  AssetClass;
  totalBRL:     number;
  count:        number;
  percentage:   number;
}
