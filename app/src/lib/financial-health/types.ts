/**
 * Financial Health Engine — Types
 * Sprint 11.1
 *
 * Tipos puros — sem "use server" / "use client", sem I/O.
 * Todas as valores monetarios em BRL (caller faz conversao FX).
 */

// ── Input ─────────────────────────────────────────────────────────────────────

/** Ponto de historico de fluxo de caixa (um mes). */
export interface CashFlowPoint {
  /** "YYYY-MM-DD" — sempre o primeiro dia do mes. */
  month:   string;
  income:  number;
  expense: number;
}

/** Posicao de investimento agregada por classe de ativo. */
export interface InvestmentByClass {
  /** AssetClass ou qualquer string identificadora. */
  assetClass: string;
  value:      number;
}

/**
 * Input completo para o Financial Health Engine.
 * Todos os valores ja convertidos para BRL.
 * O caller (service) e responsavel pela agregacao e conversao de moeda.
 */
export interface HealthInput {
  // ── Balanco patrimonial ─────────────────────────────────────────────────────
  /** Soma de financial_account.balance onde type in ("checking","savings","wallet","cash"). */
  liquidBalance:            number;
  /** Soma de financial_account.balance onde type = "investment". */
  investmentAccountBalance: number;
  /** Soma de investment_position.current_value (posicoes em corretoras). */
  investmentPositionsValue: number;
  /** Soma de manual_asset.current_value. */
  manualAssetsValue:        number;
  /** Dividas de cartao: soma de (credit_limit - available_limit) por cartao ativo. */
  creditCardDebt:           number;

  // ── Fluxo de caixa corrente ─────────────────────────────────────────────────
  monthlyIncome:   number;
  monthlyExpense:  number;

  // ── Historico mensal (ate 12 meses, cronologico) ────────────────────────────
  /** Ultimos N meses (N >= 0), do mais antigo para o mais recente. */
  cashFlowHistory: CashFlowPoint[];

  // ── Carteira de investimentos ────────────────────────────────────────────────
  /** Valor de mercado por classe de ativo (para concentracao e diversificacao). */
  investmentsByClass: InvestmentByClass[];

  // ── Renda passiva ────────────────────────────────────────────────────────────
  /** Total de dividendos/proventos recebidos nos ultimos 12 meses. */
  dividendsLast12m: number;

  // ── FIRE ─────────────────────────────────────────────────────────────────────
  /** Taxa de retirada segura anual. Padrao: 0.04 (regra dos 4%). */
  safeWithdrawalRate?: number;

  // ── Reserva de emergencia ────────────────────────────────────────────────────
  /** Meses de despesa como meta de reserva. Padrao: 6. */
  emergencyReserveTargetMonths?: number;
}

// ── Resultados por modulo ─────────────────────────────────────────────────────

export interface WealthResult {
  /** Soma de todos os ativos (contas + investimentos + ativos manuais). */
  totalAssets:      number;
  /** Total de passivos (dividas de cartao de credito). */
  totalLiabilities: number;
  /** totalAssets - totalLiabilities. */
  netWorth:         number;
  /**
   * Variacao percentual mensal do patrimonio liquido.
   * null se historico insuficiente (< 2 meses).
   */
  monthlyGrowthPct: number | null;
  /**
   * Variacao percentual anual do patrimonio liquido.
   * null se historico insuficiente (< 12 meses).
   */
  annualGrowthPct:  number | null;
}

export interface CashFlowResult {
  /** Receita no mes atual. */
  monthlyIncome:        number;
  /** Despesa no mes atual. */
  monthlyExpense:       number;
  /** Resultado do mes (income - expense). */
  monthlyBalance:       number;
  /** Media de receita dos ultimos 12 meses. */
  avgMonthlyIncome12m:  number;
  /** Media de despesa dos ultimos 12 meses. */
  avgMonthlyExpense12m: number;
  /** Media de resultado dos ultimos 12 meses. */
  avgMonthlyBalance12m: number;
  /**
   * Tendencia comparando ultimos 3 meses vs 3 meses anteriores.
   * "improving" se resultado melhorou > 10%, "deteriorating" se piorou > 10%.
   */
  trend: "improving" | "stable" | "deteriorating";
}

export type SavingsGrade = "excellent" | "good" | "fair" | "poor";

export interface SavingsResult {
  /** (income - expense) / income * 100. 0 se income = 0. */
  savingsRate:        number;
  /** Media da taxa de poupanca nos ultimos 12 meses. */
  avgSavingsRate12m:  number;
  /** R$ sobrando por mes (income - expense). */
  monthlySurplus:     number;
  /**
   * Classificacao:
   *   excellent >= 30% | good >= 20% | fair >= 10% | poor < 10%
   */
  grade: SavingsGrade;
}

export type EmergencyStatus = "insufficient" | "building" | "adequate" | "excess";

export interface EmergencyReserveResult {
  /** Saldo liquido acessivel imediatamente (contas correntes + poupanca + wallet). */
  liquidBalance:           number;
  /** Quantidade de meses de despesa cobertos pelo saldo liquido. */
  monthsCovered:           number;
  /** Meta em meses (parametro emergencyReserveTargetMonths, padrao 6). */
  targetMonths:            number;
  /** R$ necessarios para completar a meta (0 se ja atingida). */
  targetAmount:            number;
  /** Progresso em % (0-100, cap em 100). */
  progress:                number;
  /**
   * Status:
   *   insufficient < 1 mes | building < meta | adequate >= meta | excess >= 12 meses
   */
  status: EmergencyStatus;
}

export interface PortfolioSlice {
  assetClass:  string;
  value:       number;
  percentage:  number;
}

export interface PortfolioResult {
  /** Soma total investida (investment_position + investment accounts). */
  totalInvested:        number;
  /** Alocacao por classe de ativo, ordenada por value desc. */
  byClass:              PortfolioSlice[];
  /** % da maior posicao individual. */
  topConcentration:     number;
  /**
   * Indice de Herfindahl-Hirschman normalizado [0, 1].
   * 0 = perfeitamente diversificado | 1 = 100% em um ativo.
   */
  herfindahlIndex:      number;
  /** Score de diversificacao [0, 100] = (1 - HHI) * 100. */
  diversificationScore: number;
  /** true se alguma classe representa > 50% do portfolio. */
  isConcentrated:       boolean;
}

export interface PassiveIncomeResult {
  /** Dividendos / 12. */
  monthlyPassiveIncome:  number;
  /** Dividendos brutos nos ultimos 12 meses. */
  annualPassiveIncome:   number;
  /** annualPassiveIncome / totalInvested * 100. */
  portfolioDividendYield: number;
  /**
   * monthlyPassiveIncome / monthlyExpense * 100.
   * Quanto % das despesas sao cobertas por renda passiva.
   */
  incomeReplacementRate: number;
}

export type FILevel = "iniciante" | "acumulando" | "semi_fi" | "fi" | "fire";

export interface FireProgressResult {
  /** Patrimonio liquido necessario para FIRE: (monthlyExpense * 12) / SWR. */
  fireTarget:      number;
  /** % do fireTarget ja atingido (baseado em netWorth). */
  progressPct:     number;
  /** R$ faltando para o fireTarget (0 se ja ultrapassou). */
  remainingToFire: number;
  /**
   * FI Score: renda_passiva_mensal / despesa_mensal * 100.
   * 100 = totalmente coberto por renda passiva.
   */
  fiScore:         number;
  /** Nivel de independencia financeira baseado no fiScore. */
  fiLevel:         FILevel;
}

export type ScoreGrade = "A" | "B" | "C" | "D" | "F";

export interface ScoreBreakdown {
  /** Baseado na taxa de poupanca (0-25 pts). */
  savingsRate:      number;
  /** Baseado na reserva de emergencia (0-20 pts). */
  emergencyReserve: number;
  /** Baseado no controle de dividas (0-20 pts). */
  debtControl:      number;
  /** Baseado na diversificacao (0-20 pts). */
  diversification:  number;
  /** Baseado na renda passiva (0-15 pts). */
  passiveIncome:    number;
}

export interface FinancialScoreResult {
  /** Score total [0, 100]. */
  score:      number;
  /** A >= 80 | B >= 65 | C >= 50 | D >= 35 | F < 35. */
  grade:      ScoreGrade;
  breakdown:  ScoreBreakdown;
  /** Pontos fortes identificados. */
  strengths:  string[];
  /** Pontos de melhoria identificados. */
  weaknesses: string[];
}

// ── Snapshot completo ─────────────────────────────────────────────────────────

/** Resultado completo do Financial Health Engine. */
export interface HealthSnapshot {
  computedAt:       string;   // ISO 8601
  wealth:           WealthResult;
  cashFlow:         CashFlowResult;
  savings:          SavingsResult;
  emergencyReserve: EmergencyReserveResult;
  portfolio:        PortfolioResult;
  passiveIncome:    PassiveIncomeResult;
  fireProgress:     FireProgressResult;
  score:            FinancialScoreResult;
}
