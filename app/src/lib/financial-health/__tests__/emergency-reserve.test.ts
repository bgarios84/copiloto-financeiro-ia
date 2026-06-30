/**
 * Testes — computeEmergencyReserve
 * Sprint 11.1
 */

import { describe, it }           from "node:test";
import assert                      from "node:assert/strict";
import { computeEmergencyReserve } from "../emergency-reserve.ts";
import type { HealthInput }         from "../types.ts";

function base(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    liquidBalance: 30_000, investmentAccountBalance: 0,
    investmentPositionsValue: 0, manualAssetsValue: 0,
    creditCardDebt: 0, cashFlowHistory: [],
    investmentsByClass: [], dividendsLast12m: 0,
    monthlyIncome: 8_000, monthlyExpense: 5_000,
    ...overrides,
  };
}

describe("computeEmergencyReserve", () => {
  it("adequate: 6 meses cobertos com meta padrao de 6", () => {
    const r = computeEmergencyReserve(base({ liquidBalance: 30_000 }));
    assert.equal(r.monthsCovered, 6);
    assert.equal(r.status, "adequate");
    assert.equal(r.progress, 100);
  });

  it("building: 3 meses cobertos, meta 6", () => {
    const r = computeEmergencyReserve(base({ liquidBalance: 15_000 }));
    assert.equal(r.monthsCovered, 3);
    assert.equal(r.status, "building");
    assert.equal(r.progress, 50);
  });

  it("insufficient: menos de 1 mes", () => {
    const r = computeEmergencyReserve(base({ liquidBalance: 2_000 }));
    assert.ok(r.monthsCovered < 1);
    assert.equal(r.status, "insufficient");
  });

  it("excess: mais de 12 meses cobertos", () => {
    const r = computeEmergencyReserve(base({ liquidBalance: 70_000 }));
    assert.equal(r.status, "excess");
  });

  it("targetAmount correto com meta padrao", () => {
    const r = computeEmergencyReserve(base());
    assert.equal(r.targetAmount, 30_000); // 5000 * 6
  });

  it("meta customizada", () => {
    const r = computeEmergencyReserve(base({
      emergencyReserveTargetMonths: 3,
      liquidBalance: 15_000,
    }));
    assert.equal(r.targetMonths, 3);
    assert.equal(r.status, "adequate");
    assert.equal(r.progress, 100);
  });

  it("monthlyExpense = 0 nao divide por zero", () => {
    const r = computeEmergencyReserve(base({ monthlyExpense: 0, liquidBalance: 10_000 }));
    assert.ok(r.monthsCovered > 0);
    assert.equal(r.status, "excess");
  });
});
