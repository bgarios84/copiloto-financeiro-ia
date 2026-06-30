/**
 * Testes — computeWealth
 * Sprint 11.1
 *
 * Executar: node --experimental-strip-types --test src/lib/financial-health/__tests__/wealth.test.ts
 */

import { describe, it }  from "node:test";
import assert             from "node:assert/strict";
import { computeWealth }  from "../wealth.ts";
import type { HealthInput } from "../types.ts";

function baseInput(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    liquidBalance:            10_000,
    investmentAccountBalance: 5_000,
    investmentPositionsValue: 50_000,
    manualAssetsValue:        100_000,
    creditCardDebt:           2_000,
    monthlyIncome:            8_000,
    monthlyExpense:           5_000,
    cashFlowHistory:          [],
    investmentsByClass:       [],
    dividendsLast12m:         3_600,
    ...overrides,
  };
}

describe("computeWealth", () => {
  it("calcula totalAssets corretamente", () => {
    const r = computeWealth(baseInput());
    assert.equal(r.totalAssets, 165_000); // 10k + 5k + 50k + 100k
  });

  it("calcula totalLiabilities corretamente", () => {
    const r = computeWealth(baseInput());
    assert.equal(r.totalLiabilities, 2_000);
  });

  it("calcula netWorth corretamente", () => {
    const r = computeWealth(baseInput());
    assert.equal(r.netWorth, 163_000); // 165k - 2k
  });

  it("sem historico suficiente: monthlyGrowthPct e annualGrowthPct sao null", () => {
    const r = computeWealth(baseInput({ cashFlowHistory: [] }));
    assert.equal(r.monthlyGrowthPct, null);
    assert.equal(r.annualGrowthPct, null);
  });

  it("com historico >= 2 meses: monthlyGrowthPct nao e null", () => {
    const history = Array.from({ length: 3 }, (_, i) => ({
      month: `2024-0${i+1}-01`, income: 8000, expense: 5000,
    }));
    const r = computeWealth(baseInput({ cashFlowHistory: history }));
    assert.notEqual(r.monthlyGrowthPct, null);
  });

  it("com historico >= 12 meses: annualGrowthPct nao e null", () => {
    const history = Array.from({ length: 12 }, (_, i) => ({
      month: `2024-${String(i+1).padStart(2,"0")}-01`, income: 8000, expense: 5000,
    }));
    const r = computeWealth(baseInput({ cashFlowHistory: history }));
    assert.notEqual(r.annualGrowthPct, null);
  });

  it("divida negativa e truncada para 0", () => {
    const r = computeWealth(baseInput({ creditCardDebt: -500 }));
    assert.equal(r.totalLiabilities, 0);
  });

  it("patrimonio liquido negativo quando dividas > ativos", () => {
    const r = computeWealth(baseInput({
      liquidBalance: 0, investmentAccountBalance: 0,
      investmentPositionsValue: 0, manualAssetsValue: 0,
      creditCardDebt: 5_000,
    }));
    assert.equal(r.netWorth, -5_000);
  });
});
