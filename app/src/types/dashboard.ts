/**
 * Types — Dashboard Module
 * Sprint 5.4B
 *
 * Mapeia as views de analytics criadas em 003_analytics_views.sql.
 */

// ── Views ─────────────────────────────────────────────────────────────────────

/** Linha de dashboard_summary — sempre 1 linha por usuário (se tiver contas). */
export interface DashboardSummary {
  user_id:                 string;
  total_balance:           number;
  total_accounts:          number;
  monthly_income:          number;
  monthly_expense:         number;
  monthly_result:          number;
  monthly_transactions:    number;
  total_credit_limit:      number;
  total_credit_used:       number;
  total_credit_available:  number;
  credit_usage_percentage: number;
}

/** Linha de monthly_cash_flow — 1 linha por mês com dados de transações. */
export interface MonthlyCashFlow {
  user_id:           string;
  month:             string;  // DATE "YYYY-MM-DD" — sempre dia 1 do mês
  total_income:      number;
  total_expense:     number;
  net_result:        number;
  transaction_count: number;
}

/** Linha de monthly_expense_by_category — 1 linha por categoria por mês. */
export interface MonthlyExpenseByCategory {
  user_id:           string;
  month:             string;
  category_id:       string | null;
  category_name:     string;
  category_color:    string | null;
  category_icon:     string | null;
  total_amount:      number;
  transaction_count: number;
}

// ── Agregado ──────────────────────────────────────────────────────────────────

/** Dados consolidados passados ao DashboardClient como props. */
export interface DashboardData {
  /** null quando o usuário não tem contas cadastradas. */
  summary:             DashboardSummary | null;
  /** Fluxo dos últimos 12 meses, ordenado por mês ascendente. */
  cashFlow:            MonthlyCashFlow[];
  /** Top categorias de despesa do mês corrente, ordenadas por total_amount desc. */
  expenseByCategory:   MonthlyExpenseByCategory[];
}

// ── Service response ──────────────────────────────────────────────────────────

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
