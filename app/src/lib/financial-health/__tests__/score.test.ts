/**
 * Testes — computeScore
 * Sprint 11.1
 */

import { describe, it } from "node:test";
import assert            from "node:assert/strict";
import { computeScore }  from "../score.ts";
import type {
  WealthResult, SavingsResult, EmergencyReserveResult,
  PortfolioResult, PassiveIncomeResult,
} from "../types.ts";

function wealth(overrides: Partial<WealthResult> = {}): WealthResult {
  return {
    totalAssets: 200_000, totalLiabilities: 0,
    netWorth: 200_000, monthlyGrowthPct: 1,
    annualGrowthPct: 12,
    ...overrides,
  };
}

function savings(overrides: Partial<SavingsResult> = {}): SavingsResult {
  return {
    savingsRate: 35, avgSavingsRate12m: 30,
    monthlySurplus: 3_000, grade: "excellent",
    ...overrides,
  };
}

function emergency(overrides: Partial<EmergencyReserveResult> = {}): EmergencyReserveResult {
  return {
    liquidBalance: 30_000, monthsCovered: 6,
    targetMonths: 6, targetAmount: 30_000,
    progress: 100, status: "adequate",
    ...overrides,
  };
}

function portfolio(overrides: Partial<PortfolioResult> = {}): PortfolioResult {
  return {
    totalInvested: 150_000,
    byClass: [
      { assetClass: "stock_br",     value: 50_000, percentage: 33 },
      { assetClass: "fixed_income", value: 50_000, percentage: 33 },
      { assetClass: "fii",          value: 50_000, percentage: 34 },
    ],
    topConcentration: 34, herfindahlIndex: 0.05,
    diversificationScore: 75, isConcentrated: false,
    ...overrides,
  };
}

function passive(overrides: Partial<PassiveIncomeResult> = {}): PassiveIncomeResult {
  return {
    monthlyPassiveIncome: 1_500,
    annualPassiveIncome: 18_000,
    portfolioDividendYield: 12,
    incomeReplacementRate: 30,
    ...overrides,
  };
}

describe("computeScore", () => {
  it("score maximo com todos os parametros excelentes", () => {
    const r = computeScore(
      wealth(),
      savings({ savingsRate: 35 }),
      emergency({ status: "adequate", progress: 100 }),
      portfolio({ diversificationScore: 75 }),
      passive({ incomeReplacementRate: 60 }),
    );
    // savingsPts=25, emergencyPts=20, debtPts=20, diversPts=20, passivePts=15 = 100
    assert.equal(r.score, 100);
    assert.equal(r.grade, "A");
  });

  it("grade A quando score >= 80", () => {
    const r = computeScore(wealth(), savings({ savingsRate: 35 }), emergency(), portfolio(), passive({ incomeReplacementRate: 30 }));
    assert.equal(r.grade, "A");
  });

  it("grade F quando score < 35 (sem poupanca, sem reserva, cheio de dividas)", () => {
    const r = computeScore(
      wealth({ totalLiabilities: 200_000, netWorth: 0 }),
      savings({ savingsRate: 0 }),
      emergency({ status: "insufficient", monthsCovered: 0, progress: 0 }),
      portfolio({ diversificationScore: 0 }),
      passive({ incomeReplacementRate: 0 }),
    );
    assert.equal(r.grade, "F");
    assert.ok(r.score < 35);
  });

  it("sem dividas = 20 pts em debtControl", () => {
    const r = computeScore(
      wealth({ totalLiabilities: 0, netWorth: 200_000 }),
      savings({ savingsRate: 0 }),
      emergency({ status: "insufficient", monthsCovered: 0, progress: 0 }),
      portfolio({ diversificationScore: 0 }),
      passive({ incomeReplacementRate: 0 }),
    );
    assert.equal(r.breakdown.debtControl, 20);
  });

  it("forcas nao estao vazias quando score e alto", () => {
    const r = computeScore(wealth(), savings(), emergency(), portfolio(), passive());
    assert.ok(r.strengths.length > 0);
  });

  it("weaknesses nao estao vazias quando score e baixo", () => {
    const r = computeScore(
      wealth({ totalLiabilities: 200_000, netWorth: 0 }),
      savings({ savingsRate: 0 }),
      emergency({ status: "insufficient", monthsCovered: 0, progress: 0 }),
      portfolio({ diversificationScore: 0 }),
      passive({ incomeReplacementRate: 0 }),
    );
    assert.ok(r.weaknesses.length > 0);
  });

  it("soma dos breakdowns = score total", () => {
    const r = computeScore(wealth(), savings(), emergency(), portfolio(), passive());
    const sum = Object.values(r.breakdown).reduce((s, n) => s + n, 0);
    assert.equal(sum, r.score);
  });
});
