/**
 * Testes — computeHealthSnapshot (engine integration)
 * Sprint 11.1
 */

import { describe, it }           from "node:test";
import assert                      from "node:assert/strict";
import { computeHealthSnapshot }   from "../engine.ts";
import type { HealthInput }         from "../types.ts";

function fullInput(): HealthInput {
  return {
    liquidBalance:            30_000,
    investmentAccountBalance: 10_000,
    investmentPositionsValue: 150_000,
    manualAssetsValue:        100_000,
    creditCardDebt:           5_000,
    monthlyIncome:            10_000,
    monthlyExpense:           6_000,
    cashFlowHistory: Array.from({ length: 12 }, (_, i) => ({
      month:   `2024-${String(i+1).padStart(2,"0")}-01`,
      income:  10_000,
      expense:  6_000,
    })),
    investmentsByClass: [
      { assetClass: "stock_br",     value: 60_000 },
      { assetClass: "fixed_income", value: 50_000 },
      { assetClass: "fii",          value: 30_000 },
      { assetClass: "etf_br",       value: 20_000 },
    ],
    dividendsLast12m: 18_000,
    safeWithdrawalRate: 0.04,
    emergencyReserveTargetMonths: 6,
  };
}

describe("computeHealthSnapshot", () => {
  it("retorna snapshot com todas as propriedades esperadas", () => {
    const snap = computeHealthSnapshot(fullInput());

    assert.ok(snap.computedAt);
    assert.ok(snap.wealth);
    assert.ok(snap.cashFlow);
    assert.ok(snap.savings);
    assert.ok(snap.emergencyReserve);
    assert.ok(snap.portfolio);
    assert.ok(snap.passiveIncome);
    assert.ok(snap.fireProgress);
    assert.ok(snap.score);
  });

  it("netWorth = 285_000 (290k ativos - 5k passivos)", () => {
    const snap = computeHealthSnapshot(fullInput());
    assert.equal(snap.wealth.netWorth, 285_000);
  });

  it("cashFlow.monthlyBalance = 4000", () => {
    const snap = computeHealthSnapshot(fullInput());
    assert.equal(snap.cashFlow.monthlyBalance, 4_000);
  });

  it("savings.grade = excellent (40% taxa de poupanca)", () => {
    const snap = computeHealthSnapshot(fullInput());
    assert.equal(snap.savings.grade, "excellent");
  });

  it("emergencyReserve.status = adequate (5 meses cobertos, meta 6)", () => {
    const snap = computeHealthSnapshot(fullInput());
    // 30k / 6k = 5 meses — building (nao atingiu os 6)
    assert.equal(snap.emergencyReserve.status, "building");
  });

  it("portfolio.isConcentrated = false com 4 classes", () => {
    const snap = computeHealthSnapshot(fullInput());
    assert.equal(snap.portfolio.isConcentrated, false);
  });

  it("passiveIncome.monthlyPassiveIncome = 1500 (18k / 12)", () => {
    const snap = computeHealthSnapshot(fullInput());
    assert.equal(snap.passiveIncome.monthlyPassiveIncome, 1_500);
  });

  it("fireProgress.fireTarget = 1.800.000 (6k * 12 / 0.04)", () => {
    const snap = computeHealthSnapshot(fullInput());
    assert.equal(snap.fireProgress.fireTarget, 1_800_000);
  });

  it("score.score e um numero entre 0 e 100", () => {
    const snap = computeHealthSnapshot(fullInput());
    assert.ok(snap.score.score >= 0 && snap.score.score <= 100);
  });

  it("computedAt aceita now customizado", () => {
    const now  = "2025-01-01T00:00:00.000Z";
    const snap = computeHealthSnapshot(fullInput(), now);
    assert.equal(snap.computedAt, now);
  });
});
