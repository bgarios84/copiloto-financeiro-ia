/**
 * Testes — computePortfolio
 * Sprint 11.1
 */

import { describe, it }    from "node:test";
import assert               from "node:assert/strict";
import { computePortfolio } from "../portfolio.ts";
import type { HealthInput }  from "../types.ts";

function base(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    liquidBalance: 0, investmentAccountBalance: 0,
    investmentPositionsValue: 100_000, manualAssetsValue: 0,
    creditCardDebt: 0, cashFlowHistory: [],
    monthlyIncome: 0, monthlyExpense: 0,
    dividendsLast12m: 0,
    investmentsByClass: [
      { assetClass: "stock_br",     value: 40_000 },
      { assetClass: "fixed_income", value: 30_000 },
      { assetClass: "fii",          value: 20_000 },
      { assetClass: "etf_br",       value: 10_000 },
    ],
    ...overrides,
  };
}

describe("computePortfolio", () => {
  it("totalInvested = investmentPositionsValue quando sem investment accounts", () => {
    const r = computePortfolio(base());
    assert.equal(r.totalInvested, 100_000);
  });

  it("byClass ordenado por value desc", () => {
    const r = computePortfolio(base());
    assert.equal(r.byClass[0].assetClass, "stock_br");
    assert.equal(r.byClass[1].assetClass, "fixed_income");
  });

  it("percentagens somam 100%", () => {
    const r = computePortfolio(base());
    const sum = r.byClass.reduce((s, c) => s + c.percentage, 0);
    assert.ok(Math.abs(sum - 100) < 0.01);
  });

  it("topConcentration e a percentagem da maior classe", () => {
    const r = computePortfolio(base());
    assert.equal(r.topConcentration, 40); // stock_br = 40%
  });

  it("isConcentrated = false quando maior classe <= 50%", () => {
    assert.equal(computePortfolio(base()).isConcentrated, false);
  });

  it("isConcentrated = true quando maior classe > 50%", () => {
    const r = computePortfolio(base({
      investmentsByClass: [
        { assetClass: "stock_br", value: 70_000 },
        { assetClass: "fii",      value: 30_000 },
      ],
    }));
    assert.equal(r.isConcentrated, true);
  });

  it("HHI = 1 para portfolio com uma unica classe", () => {
    const r = computePortfolio(base({
      investmentsByClass: [{ assetClass: "stock_br", value: 100_000 }],
    }));
    assert.equal(r.herfindahlIndex, 1);
    assert.equal(r.diversificationScore, 0);
  });

  it("HHI = 0 para portfolio igualmente distribuido em N classes", () => {
    const n = 4;
    const r = computePortfolio(base({
      investmentsByClass: Array.from({ length: n }, (_, i) => ({
        assetClass: `class_${i}`, value: 25_000,
      })),
    }));
    // HHI normalizado deve ser 0 (ou muito proximo)
    assert.ok(r.herfindahlIndex < 0.01);
    assert.ok(r.diversificationScore > 99);
  });

  it("portfolio vazio retorna zeros sem erros", () => {
    const r = computePortfolio(base({
      investmentPositionsValue: 0,
      investmentAccountBalance: 0,
      investmentsByClass: [],
    }));
    assert.equal(r.totalInvested, 0);
    assert.equal(r.byClass.length, 0);
    assert.equal(r.diversificationScore, 0);
  });
});
