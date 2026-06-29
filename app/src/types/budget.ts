/**
 * Types — Budget
 * Sprint 5.6 — Orçamentos por Categoria
 */

// ── Enums / labels ─────────────────────────────────────────────────────────────

export type BudgetStatus = "dentro" | "atencao" | "excedido" | "sem_orcamento";

export const BUDGET_STATUS_LABELS: Record<BudgetStatus, string> = {
  dentro:         "Dentro do orçamento",
  atencao:        "Atenção",
  excedido:       "Excedido",
  sem_orcamento:  "Sem orçamento",
};

/** ≤80% = dentro, 80-100% = atenção, >100% = excedido, null = sem orçamento */
export function getBudgetStatus(usagePercentage: number | null): BudgetStatus {
  if (usagePercentage === null) return "sem_orcamento";
  if (usagePercentage > 100)   return "excedido";
  if (usagePercentage >= 80)   return "atencao";
  return "dentro";
}

// ── Table row ──────────────────────────────────────────────────────────────────

/** Linha da tabela public.budget */
export interface Budget {
  id:             string;
  user_id:        string;
  category_id:    string | null;
  month:          string;   // "YYYY-MM-01"
  planned_amount: number;
  currency:       string;
  notes:          string | null;
  created_at:     string;
  updated_at:     string;
  deleted_at:     string | null;
}

// ── View row ───────────────────────────────────────────────────────────────────

/** Linha da view category_budget_comparison */
export interface BudgetComparison {
  user_id:           string;
  month:             string;        // "YYYY-MM-01"
  category_id:       string | null;
  category_name:     string;
  category_color:    string | null;
  category_icon:     string | null;
  planned_amount:    number | null;
  actual_amount:     number;
  transaction_count: number;
  difference_amount: number | null;
  usage_percentage:  number | null;
}

// ── Form ───────────────────────────────────────────────────────────────────────

export interface BudgetFormData {
  category_id:    string;     // obrigatório no MVP
  planned_amount: string;     // string para input controlado
  currency:       string;
  notes:          string;
}

// ── Shared ─────────────────────────────────────────────────────────────────────

export type ServiceResult<T> = { data: T; error: null } | { data: null; error: string };
