/**
 * Types — B3 Dividend Events (Proventos)
 * Sprint 7.1.1
 */

export type { ServiceResult } from "./common";

// ── Event types ───────────────────────────────────────────────────────────────

export type DividendEventType = "dividend" | "jcp" | "amortization" | "income";

export const DIVIDEND_EVENT_LABELS: Record<DividendEventType, string> = {
  dividend:     "Dividendo",
  jcp:          "JCP",
  amortization: "Amortização",
  income:       "Rendimento",
};

export const DIVIDEND_EVENT_ICONS: Record<DividendEventType, string> = {
  dividend:     "💰",
  jcp:          "🏦",
  amortization: "📉",
  income:       "🏢",
};

// ── Table row ─────────────────────────────────────────────────────────────────

export interface B3DividendEvent {
  id:               string;
  asset_id:         string;
  ticker:           string;
  event_type:       DividendEventType;
  amount_per_share: number;
  declared_date:    string | null;
  ex_date:          string | null;
  payment_date:     string | null;
  source:           string;
  created_at:       string;
}

// ── Summary computed per ticker ───────────────────────────────────────────────

export interface DividendSummary {
  ticker:           string;
  /** Eventos dos últimos 12 meses (ex_date ou payment_date) */
  events12m:        B3DividendEvent[];
  /** Soma por cota nos últimos 12 meses */
  totalPerShare12m: number;
  /** Próximo evento com payment_date no futuro */
  nextEvent:        B3DividendEvent | null;
  /** Dividend yield estimado = totalPerShare12m / currentPrice × 100 */
  dy:               number | null;
}

/** Mapa de resumos indexado por ticker */
export type DividendMap = Record<string, DividendSummary>;
