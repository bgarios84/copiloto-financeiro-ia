/**
 * Types — FX Rate
 * Sprint 6.2 — Base Multi-moeda
 */

// ── Table row ──────────────────────────────────────────────────────────────────

export interface FxRate {
  id:            string;
  base_currency: string;
  quote_currency: string;
  rate:          number;
  rate_date:     string;  // "YYYY-MM-DD"
  source:        FxRateSource;
  created_at:    string;
}

export type FxRateSource = "seed" | "bcb" | "coinbase" | "yahoo" | "manual";

// ── Convenience map ────────────────────────────────────────────────────────────

/**
 * Mapa de taxas indexado por `base_currency`.
 * Ex: { USD: 5.70, EUR: 6.15, BTC: 580000 }
 * Todos os rates são para BRL (quote_currency = 'BRL').
 */
export type FxRateMap = Record<string, number>;

// ── Shared ─────────────────────────────────────────────────────────────────────

export type { ServiceResult } from "./common";
