/**
 * Testes — computePassiveIncome
 * Sprint 11.1
 */

import { describe, it }        from "node:test";
import assert                   from "node:assert/strict";
import { computePassiveIncome } from "../passive-income.ts";
import type { HealthInput }      from "../types.ts";

function base(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    liquidBalance: 0, investmentAccountBalance: 0,
    investmentPositionsValue: 120_000, manualAssetsValue: 0,
    creditCardDebt: 0, cashFlowHistory: [],
    investmentsByClass: [],
    monthlyIncome: 8_000, monthlyExpense: 5_000,
    dividendsLast12m: 12_000,   // R$ 1.000/mes
    ...overrides,
  };
}

describe("computePassiveIncome", () => {
  it("monthlyPassiveIncome = dividendsLast12m / 12", () => {
    const r = computePassiveIncome(base());
    assert.equal(r.monthlyPassiveIncome, 1_000);
  });

  it("annualPassiveIncome = dividendsLast12m", () => {
    const r = computePassiveIncome(base());
    assert.equal(r.annualPassiveIncome, 12_000);
  });

  it("portfolioDividendYield = 10% com 12k dividendos e 120k investido", () => {
    const r = computePassiveIncome(base());
    assert.ok(Math.abs(r.portfolioDividendYield - 10) < 0.01);
  });

  it("incomeReplacementRate = 20% com 1k passivo e 5k de despesa", () => {
    const r = computePassiveIncome(base());
    assert.equal(r.incomeReplacementRate, 20);
  });

  it("yield = 0 quando sem investimentos", () => {
    const r = computePassiveIncome(base({ investmentPositionsValue: 0 }));
    assert.equal(r.portfolioDividendYield, 0);
  });

  it("incomeReplacementRate = 0 quando monthlyExpense = 0", () => {
    const r = computePassiveIncome(base({ monthlyExpense: 0 }));
    assert.equal(r.incomeReplacementRate, 0);
  });

  it("dividendos negativos truncados para 0", () => {
    const r = computePassiveIncome(base({ dividendsLast12m: -500 }));
    assert.equal(r.annualPassiveIncome, 0);
  });
});
