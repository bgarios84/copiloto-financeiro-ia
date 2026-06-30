/**
 * Testes — computeSavings
 * Sprint 11.1
 */

import { describe, it }  from "node:test";
import assert             from "node:assert/strict";
import { computeSavings } from "../savings.ts";
import type { HealthInput } from "../types.ts";

function base(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    liquidBalance: 0, investmentAccountBalance: 0,
    investmentPositionsValue: 0, manualAssetsValue: 0,
    creditCardDebt: 0, cashFlowHistory: [],
    investmentsByClass: [], dividendsLast12m: 0,
    monthlyIncome: 10_000, monthlyExpense: 6_000,
    ...overrides,
  };
}

describe("computeSavings", () => {
  it("taxa de poupanca de 40% com income 10k expense 6k", () => {
    const r = computeSavings(base());
    assert.equal(r.savingsRate, 40);
    assert.equal(r.grade, "excellent");
    assert.equal(r.monthlySurplus, 4_000);
  });

  it("grade excellent quando >= 30%", () => {
    assert.equal(computeSavings(base({ monthlyExpense: 7_000 })).grade, "excellent"); // 30%
  });

  it("grade good quando 20-29%", () => {
    assert.equal(computeSavings(base({ monthlyExpense: 8_000 })).grade, "good"); // 20%
  });

  it("grade fair quando 10-19%", () => {
    assert.equal(computeSavings(base({ monthlyExpense: 9_000 })).grade, "fair"); // 10%
  });

  it("grade poor quando < 10%", () => {
    assert.equal(computeSavings(base({ monthlyExpense: 9_500 })).grade, "poor"); // 5%
  });

  it("taxa 0 quando income = 0", () => {
    const r = computeSavings(base({ monthlyIncome: 0, monthlyExpense: 0 }));
    assert.equal(r.savingsRate, 0);
  });

  it("avgSavingsRate12m usa historico quando disponivel", () => {
    const history = [
      { month: "2024-01-01", income: 10000, expense: 5000 },  // 50%
      { month: "2024-02-01", income: 10000, expense: 8000 },  // 20%
    ];
    const r = computeSavings(base({ cashFlowHistory: history }));
    assert.ok(Math.abs(r.avgSavingsRate12m - 35) < 0.01); // media de 50% e 20%
  });
});
