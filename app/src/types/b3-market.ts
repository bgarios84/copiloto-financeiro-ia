/**
 * Types — B3 Market Data
 * Sprint 7.1 — Market Data B3
 */

export type { ServiceResult } from "./common";

// ── b3_asset ──────────────────────────────────────────────────────────────────

export type B3AssetType = "stock_br" | "fii" | "etf_br" | "bdr";

export interface B3Asset {
  id:         string;
  ticker:     string;
  name:       string;
  asset_type: B3AssetType;
  sector:     string | null;
  currency:   string;
  is_active:  boolean;
  created_at: string;
  updated_at: string;
}

// ── b3_quote ──────────────────────────────────────────────────────────────────

export type B3QuoteSource = "seed" | "b3" | "yahoo" | "brapi" | "manual";

export interface B3Quote {
  id:          string;
  asset_id:    string;
  ticker:      string;
  close_price: number;
  quote_date:  string;   // "YYYY-MM-DD"
  source:      B3QuoteSource;
  created_at:  string;
}

// ── Quote map ─────────────────────────────────────────────────────────────────

/**
 * Mapa de cotações B3 indexado por ticker.
 * Ex: { PETR4: 38.20, XPML11: 118.00 }
 */
export type B3QuoteMap = Record<string, number>;

/**
 * Classes de ativos que têm cotação automática via b3_quote.
 * Alinhado com investment_position.asset_class.
 */
export const B3_QUOTED_CLASSES = ["stock_br", "fii", "etf_br", "bdr"] as const;
export type B3QuotedClass = (typeof B3_QUOTED_CLASSES)[number];
