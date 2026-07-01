/**
 * Financial Context Engine — Public API
 * Sprint 12.1
 */

export { buildFinancialContext } from "./builder";
export type { BuildContextInput } from "./builder";
export type {
  FinancialContext,
  FinancialSummaryContext,
  HealthContext,
  HealthComponentContext,
  InsightContext,
  AlertContext,
  OFConnectionContext,
  OpenFinanceContext,
  AllocationSliceContext,
  InvestmentContext,
  CashFlowContext,
  FireContext,
  TextualSummaryContext,
} from "./types";
