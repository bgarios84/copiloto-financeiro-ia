/**
 * Testes — computeCashFlow
 * Sprint 11.1
 */

import { describe, it }    from "node:test";
import assert               from "node:assert/strict";
import { computeCashFlow }  from "../cash-flow.ts";
import type { HealthInput }  from "../types.ts";

function makeHistory(incomes: number[], expenses: number[]) {
  return incomes.map((income, i) => ({
    month:   `2024-${String(i+1).padStart(2,"0")}-01`,
    income,
    expense: expenses[i] ?? 0,
  }));
}

function base(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    liquidBalance: 10_000, investmentAccountBalance: 0,
    investmentPositionsValue: 0, manualAssetsValue: 0,
    creditCardDebt: 0,
    monthlyIncome: 8_000, monthlyExpense: 5_000,
    cashFlowHistory: [], investmentsByClass: [],
    dividendsLast12m: 0,
    ...overrides,
  };
}

describe("computeCashFlow", () => {
  it("calcula monthlyBalance corretamente", () => {
    const r = computeCashFlow(base());
    assert.equal(r.monthlyBalance, 3_000);
  });

  it("media 12m e 0 sem historico", () => {
    const r = computeCashFlow(base());
    assert.equal(r.avgMonthlyIncome12m,  0);
    assert.equal(r.avgMonthlyExpense12m, 0);
    assert.equal(r.avgMonthlyBalance12m, 0);
  });

  it("calcula medias corretamente com historico", () => {
    const history = makeHistory(
      [6000, 7000, 8000, 9000],
      [4000, 4000, 5000, 5000],
    );
    const r = computeCashFlow(base({ cashFlowHistory: history }));
    assert.equal(r.avgMonthlyIncome12m,  7500);
    assert.equal(r.avgMonthlyExpense12m, 4500);
    assert.equal(r.avgMonthlyBalance12m, 3000);
  });

  it("trend improving: resultado dos ultimos 3m > 10% acima dos 3 anteriores", () => {
    const balances = [1000, 1000, 1000, 2000, 2000, 2000];
    const history = makeHistory(
      balances.map((b) => 5000 + b),
      Array(6).fill(5000),
    );
    const r = computeCashFlow(base({ cashFlowHistory: history }));
    assert.equal(r.trend, "improving");
  });

  it("trend deteriorating: resultado dos ultimos 3m < -10% vs anteriores", () => {
    const history = makeHistory(
      [5000, 5000, 5000, 5000, 5000, 5000],
      [3000, 3000, 3000, 4800, 4800, 4800],
    );
    const r = computeCashFlow(base({ cashFlowHistory: history }));
    assert.equal(r.trend, "deteriorating");
  });

  it("trend stable com < 6 meses de historico", () => {
    const history = makeHistory([8000], [5000]);
    const r = computeCashFlow(base({ cashFlowHistory: history }));
    assert.equal(r.trend, "stable");
  });
});
