/**
 * Testes unitários — FIRE Calculator
 * Sprint 8.5
 *
 * Executar: node --experimental-strip-types --test src/lib/fire/__tests__/calculator.test.ts
 *
 * Usa node:test (Node 18+). Sem dependências externas.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// Importações diretas com extensão .ts (Node 22 --experimental-strip-types)
import {
  realMonthlyRate,
  futureValue,
  monthsToTarget,
  calcFire,
  calcScenarios,
  calcIndicators,
} from "../calculator.ts";

// ── Fixture base ──────────────────────────────────────────────────────────────

function makeInput(overrides = {}) {
  return {
    currentPatrimonio:   200_000,
    monthlyIncome:       10_000,
    monthlyExpense:       6_000,
    monthlyDividends:       500,
    monthlyContribution:  3_000,
    annualExtra:          5_000,
    annualReturn:          0.08,
    annualInflation:       0.04,
    safeWithdrawalRate:    0.04,
    currentAge:              35,
    targetAge:               55,
    targetMonthlyIncome:   6_000,
    ...overrides,
  };
}

// ── realMonthlyRate ───────────────────────────────────────────────────────────

describe("realMonthlyRate", () => {
  test("retorno real mensal com 8% nominal e 4% inflação", () => {
    const r = realMonthlyRate(0.08, 0.04);
    // Taxa real anual ≈ (1.08/1.04) - 1 ≈ 3.846% → mensal ≈ 0.3153%
    assert.ok(r > 0.003 && r < 0.004, `esperava ~0.00315, obteve ${r}`);
  });

  test("inflação igual ao retorno → taxa real ≈ 0", () => {
    const r = realMonthlyRate(0.05, 0.05);
    assert.ok(Math.abs(r) < 1e-6, `esperava ~0, obteve ${r}`);
  });

  test("retorno zero → taxa real negativa (= inflação negativa mensal)", () => {
    const r = realMonthlyRate(0, 0.04);
    assert.ok(r < 0, `esperava negativo, obteve ${r}`);
  });
});

// ── futureValue ───────────────────────────────────────────────────────────────

describe("futureValue", () => {
  test("r=0: FV = PV + PMT * n (sem juros)", () => {
    const fv = futureValue(100_000, 1_000, 0, 120);
    assert.equal(fv, 220_000);
  });

  test("PMT=0, r>0: apenas crescimento exponencial do PV", () => {
    const r  = realMonthlyRate(0.12, 0); // ~0.949% ao mês
    const fv = futureValue(100_000, 0, r, 12);
    // ≈ 100_000 * 1.12 = 112_000 (taxa anual 12%)
    assert.ok(fv > 111_000 && fv < 113_000, `esperava ~112000, obteve ${fv}`);
  });

  test("FV > PV com aportes positivos e r > 0", () => {
    const r  = realMonthlyRate(0.08, 0.04);
    const fv = futureValue(200_000, 3_000, r, 240); // 20 anos
    assert.ok(fv > 200_000, `FV deve ser maior que PV após 20 anos com aportes`);
  });
});

// ── monthsToTarget ────────────────────────────────────────────────────────────

describe("monthsToTarget", () => {
  test("PV >= FV retorna 0 meses", () => {
    const n = monthsToTarget(500_000, 1_000, 0.003, 400_000);
    assert.equal(n, 0);
  });

  test("r=0, PMT=0 retorna Infinity", () => {
    const n = monthsToTarget(100, 0, 0, 200);
    assert.equal(n, Infinity);
  });

  test("r=0, PMT>0 retorna divisão linear", () => {
    const n = monthsToTarget(0, 1_000, 0, 12_000);
    assert.equal(n, 12);
  });

  test("com taxa real positiva, n < n sem taxa", () => {
    const r     = realMonthlyRate(0.08, 0.04);
    const nReal = monthsToTarget(200_000, 3_000, r, 1_500_000);
    const nZero = monthsToTarget(200_000, 3_000, 0, 1_500_000);
    assert.ok(nReal < nZero, `com taxa real positiva deve chegar mais rápido`);
  });
});

// ── calcFire ──────────────────────────────────────────────────────────────────

describe("calcFire", () => {
  test("FIRE Target = (renda_alvo * 12) / SWR", () => {
    const result = calcFire(makeInput());
    // target = 6000 * 12 / 0.04 = 1_800_000
    assert.equal(result.fireTarget, 1_800_000);
  });

  test("firePercentage entre 0 e 100", () => {
    const result = calcFire(makeInput());
    assert.ok(result.firePercentage >= 0 && result.firePercentage <= 100);
  });

  test("firePercentage = 100 quando PV >= target", () => {
    const result = calcFire(makeInput({ currentPatrimonio: 2_000_000 }));
    assert.equal(result.firePercentage, 100);
    assert.equal(result.monthsToFire, 0);
  });

  test("yearsToFire é finito com aportes positivos e retorno real > 0", () => {
    const result = calcFire(makeInput());
    assert.ok(isFinite(result.yearsToFire), `deve convergir, obteve ${result.yearsToFire}`);
  });

  test("yearsToFire = Infinity quando PMT=0 e PV insuficiente e r≈0", () => {
    const result = calcFire(makeInput({
      monthlyContribution: 0,
      annualExtra:         0,
      annualReturn:        0.04,
      annualInflation:     0.04, // r real ≈ 0
      currentPatrimonio:   100,
    }));
    assert.equal(result.yearsToFire, Infinity);
  });

  test("annualExtra acelera convergência", () => {
    const sem  = calcFire(makeInput({ annualExtra: 0 }));
    const com  = calcFire(makeInput({ annualExtra: 24_000 }));
    assert.ok(com.yearsToFire < sem.yearsToFire, "extra anual deve reduzir tempo até FIRE");
  });

  test("willReachByTargetAge = true quando patrimônio na targetAge >= fireTarget", () => {
    // Com PV muito alto, deve atingir antes da targetAge
    const result = calcFire(makeInput({ currentPatrimonio: 1_900_000, targetAge: 36 }));
    // Em 1 ano (35→36): patrimônio ≈ 1_900_000 * (1+r)^12 + PMT... muito > 1_800_000
    assert.equal(result.willReachByTargetAge, true);
  });

  test("projectionData tem ano 0 com patrimônio = currentPatrimonio", () => {
    const result = calcFire(makeInput());
    const year0  = result.projectionData[0];
    assert.ok(year0 !== undefined);
    assert.equal(year0.year, 0);
    // PV de 200k, no ano 0 FV = PV (n=0) → patrimônio = 200_000
    assert.equal(year0.patrimonio, 200_000);
  });
});

// ── calcScenarios ─────────────────────────────────────────────────────────────

describe("calcScenarios", () => {
  test("retorna 3 cenários", () => {
    const scenarios = calcScenarios(makeInput());
    assert.equal(scenarios.length, 3);
  });

  test("base tem mesmo retorno do input", () => {
    const input     = makeInput();
    const scenarios = calcScenarios(input);
    const base      = scenarios.find(s => s.key === "base");
    assert.ok(base !== undefined);
    assert.equal(base.input.annualReturn, 0.08);
  });

  test("otimista tem menor yearsToFire que conservador", () => {
    const scenarios   = calcScenarios(makeInput());
    const conserv     = scenarios.find(s => s.key === "conservative")!;
    const optimistic  = scenarios.find(s => s.key === "optimistic")!;
    assert.ok(
      optimistic.result.yearsToFire < conserv.result.yearsToFire,
      "otimista deve atingir FIRE mais rápido"
    );
  });
});

// ── calcIndicators ────────────────────────────────────────────────────────────

describe("calcIndicators", () => {
  test("fiScore = 0 quando renda_passiva = 0", () => {
    const input     = makeInput({ currentPatrimonio: 0 });
    const result    = calcFire(input);
    const scenarios = calcScenarios(input);
    const ind       = calcIndicators(input, result, scenarios, 0);
    assert.equal(ind.fiScore, 0);
    assert.equal(ind.fiLevel, "iniciante");
  });

  test("fiScore >= 100 quando renda_passiva >= despesa", () => {
    // PV = 2_400_000 → renda passiva = 2_400_000 * 0.04 / 12 = 8_000 > despesa 6_000
    const input     = makeInput({ currentPatrimonio: 2_400_000 });
    const result    = calcFire(input);
    const scenarios = calcScenarios(input);
    const ind       = calcIndicators(input, result, scenarios, 0);
    assert.equal(ind.fiScore, 100);
    assert.equal(ind.fiLevel, "fire");
  });

  test("timeSavedByExtra = 0 quando annualExtra = 0", () => {
    const input     = makeInput({ annualExtra: 0 });
    const result    = calcFire(input);
    const scenarios = calcScenarios(input);
    const ind       = calcIndicators(input, result, scenarios, 0);
    assert.equal(ind.timeSavedByExtra, 0);
  });

  test("timeSavedByExtra > 0 quando annualExtra > 0 e yearsToFire é finito", () => {
    const input     = makeInput({ annualExtra: 20_000 });
    const result    = calcFire(input);
    const scenarios = calcScenarios(input);
    const ind       = calcIndicators(input, result, scenarios, 0);
    assert.ok(ind.timeSavedByExtra > 0, `esperava > 0, obteve ${ind.timeSavedByExtra}`);
  });

  test("netPatrimonio = currentPatrimonio - totalDebt", () => {
    const input     = makeInput();
    const result    = calcFire(input);
    const scenarios = calcScenarios(input);
    const ind       = calcIndicators(input, result, scenarios, 15_000);
    assert.equal(ind.netPatrimonio, 200_000 - 15_000);
  });

  test("probability entre 0 e 100", () => {
    const input     = makeInput();
    const result    = calcFire(input);
    const scenarios = calcScenarios(input);
    const ind       = calcIndicators(input, result, scenarios, 0);
    assert.ok(ind.probability >= 0 && ind.probability <= 100);
  });
});
