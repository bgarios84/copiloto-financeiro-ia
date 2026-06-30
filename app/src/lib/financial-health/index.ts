/**
 * Financial Health Engine — Barrel
 * Sprint 11.1
 */

// Ponto de entrada principal
export { computeHealthSnapshot } from "./engine";

// Modulos individuais (para uso isolado)
export { computeWealth         } from "./wealth";
export { computeCashFlow       } from "./cash-flow";
export { computeSavings        } from "./savings";
export { computeEmergencyReserve } from "./emergency-reserve";
export { computePortfolio      } from "./portfolio";
export { computePassiveIncome  } from "./passive-income";
export { computeFireProgress   } from "./fire-progress";
export { computeScore          } from "./score";

// Tipos
export type {
  HealthInput,
  CashFlowPoint,
  InvestmentByClass,
  HealthSnapshot,
  WealthResult,
  CashFlowResult,
  SavingsResult,
  SavingsGrade,
  EmergencyReserveResult,
  EmergencyStatus,
  PortfolioResult,
  PortfolioSlice,
  PassiveIncomeResult,
  FireProgressResult,
  FILevel,
  FinancialScoreResult,
  ScoreGrade,
  ScoreBreakdown,
} from "./types";
