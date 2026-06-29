/**
 * Utilitários de data
 *
 * Funções puras sem "use server" — podem ser importadas
 * tanto em Server Components quanto em Client Components.
 */

/**
 * Garante que o mês esteja no formato "YYYY-MM-01" exigido pelo
 * CHECK constraint `budget_month_is_first_day` na tabela public.budget.
 *
 * Aceita:
 *   toMonthDate(2026, 6)         → "2026-06-01"
 *   toMonthDate("2026-06")       → "2026-06-01"
 *   toMonthDate("2026-06-15")    → "2026-06-01"
 */
export function toMonthDate(yearOrStr: number | string, month?: number): string {
  if (typeof yearOrStr === "string") {
    return yearOrStr.slice(0, 7) + "-01";
  }
  return `${yearOrStr}-${String(month!).padStart(2, "0")}-01`;
}
