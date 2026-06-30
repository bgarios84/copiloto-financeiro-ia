/**
 * Testes — computeFireProgress
 * Sprint 11.1
 */

import { describe, it }       from "node:test";
import assert                  from "node:assert/strict";
import { computeFireProgress } from "../fire-progress.ts";
import type { HealthInput }     from "../types.ts";

function base(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    liquidBalance: 0, investmentAccountBalance: 0,
    investmentPositionsValue: 0, manualAssetsValue: 0,
    creditCardDebt: 0, cashFlowHistory: [],
    investmentsByClass: [],
    monthlyIncome: 10_000, monthlyExpense: 5_000,
    dividendsLast12m: 0,
    ...overrides,
  };
}

describe("computeFireProgress", () => {
  it("fireTarget = despesa_anual / SWR com SWR padrao 4%", () => {
    const r = computeFireProgress(base(), 0);
    // 5000 * 12 / 0.04 = 1.500.000
    assert.equal(r.fireTarget, 1_500_000);
  });

  it("SWR customizado", () => {
    const r = computeFireProgress(base({ safeWithdrawalRate: 0.05 }), 0);
    // 5000 * 12 / 0.05 = 1.200.000
    assert.equal(r.fireTarget, 1_200_000);
  });

  it("progressPct = 0 quando netWorth = 0", () => {
    const r = computeFireProgress(base(), 0);
    assert.equal(r.progressPct, 0);
  });

  it("progressPct = 50% quando netWorth = fireTarget / 2", () => {
    const r = computeFireProgress(base(), 750_000);
    assert.ok(Math.abs(r.progressPct - 50) < 0.01);
  });

  it("remainingToFire = 0 quando netWorth >= fireTarget", () => {
    const r = computeFireProgress(base(), 2_000_000);
    assert.equal(r.remainingToFire, 0);
  });

  it("fiScore = 0 quando sem dividendos", () => {
    const r = computeFireProgress(base({ dividendsLast12m: 0 }), 500_000);
    assert.equal(r.fiScore, 0);
    assert.equal(r.fiLevel, "iniciante");
  });

  it("fiLevel = fire quando renda passiva cobre 100% das despesas", () => {
    // dividendos = 5000 * 12 = 60k -> passivo mensal = 5000 = despesa
    const r = computeFireProgress(base({ dividendsLast12m: 60_000 }), 1_000_000);
    assert.equal(r.fiScore, 100);
    assert.equal(r.fiLevel, "fire");
  });

  it("fiLevel = semi_fi com 25-49% das despesas cobertas", () => {
    // passivo mensal = 1500, despesa = 5000 -> 30%
    const r = computeFireProgress(base({ dividendsLast12m: 18_000 }), 0);
    assert.ok(r.fiScore >= 25 && r.fiScore < 50);
    assert.equal(r.fiLevel, "semi_fi");
  });

  it("fiLevel = acumulando com 10-24% das despesas cobertas", () => {
    // passivo mensal = 800, despesa = 5000 -> 16%
    const r = computeFireProgress(base({ dividendsLast12m: 9_600 }), 0);
    assert.ok(r.fiScore >= 10 && r.fiScore < 25);
    assert.equal(r.fiLevel, "acumulando");
  });
});
