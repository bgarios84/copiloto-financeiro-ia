/**
 * Types — Timeline Financeira
 * Sprint 8.3
 *
 * Arquivo puro — sem "use server" / "use client".
 */

// ── Categoria ─────────────────────────────────────────────────────────────────

export type TimelineCategory =
  | "finance"
  | "investment"
  | "dividend"
  | "market"
  | "budget"
  | "asset"
  | "system";

export const TIMELINE_CATEGORY_LABELS: Record<TimelineCategory, string> = {
  finance:    "Finanças",
  investment: "Investimentos",
  dividend:   "Dividendos",
  market:     "Mercado",
  budget:     "Orçamento",
  asset:      "Patrimônio",
  system:     "Sistema",
};

export const TIMELINE_CATEGORY_COLORS: Record<TimelineCategory, string> = {
  finance:    "#3B82F6",
  investment: "#10B981",
  dividend:   "#F59E0B",
  market:     "#8B5CF6",
  budget:     "#EF4444",
  asset:      "#06B6D4",
  system:     "#6B7280",
};

// ── Evento ────────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id:          string;
  date:        string;                    // "YYYY-MM-DD"
  title:       string;
  description: string;
  icon:        string;                    // nome do ícone Lucide
  color:       string;                    // hex color
  category:    TimelineCategory;
  metadata:    Record<string, unknown>;   // dados brutos do evento
}

// ── Resumo (últimos 30 dias) ──────────────────────────────────────────────────

export interface TimelineSummary {
  totalIncome:    number;   // soma de transações de receita
  totalExpense:   number;   // soma de transações de despesa
  totalDividends: number;   // valor estimado de dividendos recebidos
  totalBuys:      number;   // valor total de compras
  totalSells:     number;   // valor total de vendas
  buyCount:       number;   // quantidade de operações de compra
  sellCount:      number;   // quantidade de operações de venda
}

// ── Dados retornados pelo service ─────────────────────────────────────────────

export interface TimelineData {
  /** Todos os eventos do período solicitado, ordenados desc por data */
  events:  TimelineEvent[];
  /** Resumo fixo dos últimos 30 dias */
  summary: TimelineSummary;
}

// ── Período de filtro ────────────────────────────────────────────────────────

export type TimePeriod = "today" | "7d" | "30d" | "90d" | "custom";

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  today:  "Hoje",
  "7d":   "7 dias",
  "30d":  "30 dias",
  "90d":  "90 dias",
  custom: "Personalizado",
};
