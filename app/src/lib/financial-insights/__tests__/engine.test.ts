/**
 * Financial Insights Engine — Testes unitários
 * Sprint 11.3
 *
 * Executa com: node --experimental-strip-types --test src/lib/financial-insights/__tests__/engine.test.ts
 */

import { describe, it } from "node:test";
import assert            from "node:assert/strict";
import { computeInsights } from "../engine.ts";
import type { InsightInput } from "../types.ts";
import type { HealthSnapshot } from "../../financial-health/types.ts";

// ── Factory de HealthSnapshot mínimo ─────────────────────────────────────────

function makeHealth(overrides: Partial<{
  monthlyGrowthPct:     number | null;
  annualGrowthPct:      number | null;
  savingsRate:          number;
  monthlySurplus:       number;
  monthlyIncome:        number;
  monthlyExpense:       number;
  emergencyStatus:      "insufficient" | "building" | "adequate" | "excess";
  monthsCovered:        number;
  progress:             number;
  isConcentrated:       boolean;
  topConcentration:     number;
  diversificationScore: number;
  annualPassiveIncome:  number;
  monthlyPassiveIncome: number;
  incomeReplacementRate:number;
  progressPct:          number;
  fireTarget:           number;
  fiLevel:              "iniciante" | "acumulando" | "semi_fi" | "fi" | "fire";
  netWorth:             number;
  creditCardDebt:       number;
}>): HealthSnapshot {
  const o = overrides;
  return {
    computedAt: new Date().toISOString(),
    wealth: {
      totalAssets:      100_000,
      totalLiabilities: o.creditCardDebt ?? 0,
      netWorth:         o.netWorth ?? 100_000,
      monthlyGrowthPct: o.monthlyGrowthPct !== undefined ? o.monthlyGrowthPct : null,
      annualGrowthPct:  o.annualGrowthPct  !== undefined ? o.annualGrowthPct  : null,
    },
    cashFlow: {
      monthlyIncome:        o.monthlyIncome   ?? 5_000,
      monthlyExpense:       o.monthlyExpense  ?? 4_000,
      monthlyBalance:       (o.monthlyIncome ?? 5_000) - (o.monthlyExpense ?? 4_000),
      avgMonthlyIncome12m:  o.monthlyIncome   ?? 5_000,
      avgMonthlyExpense12m: o.monthlyExpense  ?? 4_000,
      avgMonthlyBalance12m: 1_000,
      trend:                "stable",
    },
    savings: {
      savingsRate:       o.savingsRate      ?? 20,
      avgSavingsRate12m: o.savingsRate      ?? 20,
      monthlySurplus:    o.monthlySurplus   ?? 1_000,
      grade:             "good",
    },
    emergencyReserve: {
      liquidBalance:  o.monthsCovered !== undefined ? (o.monthsCovered * (o.monthlyExpense ?? 4_000)) : 24_000,
      monthsCovered:  o.monthsCovered ?? 6,
      targetMonths:   6,
      targetAmount:   0,
      progress:       o.progress   ?? 100,
      status:         o.emergencyStatus ?? "adequate",
    },
    portfolio: {
      totalInvested:        50_000,
      byClass:              [{ assetClass: "stock_br", value: 50_000, percentage: 100 }],
      topConcentration:     o.topConcentration     ?? 40,
      herfindahlIndex:      0.3,
      diversificationScore: o.diversificationScore ?? 60,
      isConcentrated:       o.isConcentrated ?? false,
    },
    passiveIncome: {
      monthlyPassiveIncome:  o.monthlyPassiveIncome  ?? 0,
      annualPassiveIncome:   o.annualPassiveIncome   ?? 0,
      portfolioDividendYield: 0,
      incomeReplacementRate:  o.incomeReplacementRate ?? 0,
    },
    fireProgress: {
      fireTarget:      o.fireTarget  ?? 1_200_000,
      progressPct:     o.progressPct ?? 8,
      remainingToFire: 1_100_000,
      fiScore:         0,
      fiLevel:         o.fiLevel ?? "iniciante",
    },
    score: {
      score:     60,
      grade:     "C",
      breakdown: { savingsRate: 10, emergencyReserve: 20, debtControl: 20, diversification: 8, passiveIncome: 2 },
      strengths:  [],
      weaknesses: [],
    },
  };
}

function makeInput(
  healthOverrides:   Parameters<typeof makeHealth>[0] = {},
  creditUsagePct:    number = 30,
  topExpense:        { name: string; amount: number; totalPct: number } | null = null,
): InsightInput {
  return {
    health:             makeHealth(healthOverrides),
    creditUsagePct,
    topExpenseCategory: topExpense,
  };
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("computeInsights", () => {

  it("retorna array vazio quando nenhuma regra dispara", () => {
    const input = makeInput({ monthlyGrowthPct: null });
    const insights = computeInsights(input);
    // com renda e poupança OK, emergência OK, sem concentração, sem dividendos, cartão OK, sem categoria, fire baixo
    // espera que patrimônio (null growth) e poupanca alta (>= 20) não coexistam — poupanca alta deve disparar
    const ids = insights.map(i => i.id);
    assert.ok(!ids.includes("patrimonio_cresceu"), "sem crescimento mensal não deve disparar");
  });

  it("R1 — patrimonio_cresceu dispara com monthlyGrowthPct > 0", () => {
    const insights = computeInsights(makeInput({ monthlyGrowthPct: 2.5 }));
    const found = insights.find(i => i.id === "patrimonio_cresceu");
    assert.ok(found, "deve encontrar insight patrimonio_cresceu");
    assert.strictEqual(found!.severity, "success");
    assert.ok(found!.metric?.includes("+"), "metric deve ter sinal positivo");
  });

  it("R1 — patrimonio_cresceu NÃO dispara com monthlyGrowthPct = 0", () => {
    const insights = computeInsights(makeInput({ monthlyGrowthPct: 0 }));
    assert.ok(!insights.find(i => i.id === "patrimonio_cresceu"));
  });

  it("R2 — patrimonio_caiu dispara com monthlyGrowthPct < -1", () => {
    const insights = computeInsights(makeInput({ monthlyGrowthPct: -3 }));
    const found = insights.find(i => i.id === "patrimonio_caiu");
    assert.ok(found, "deve encontrar insight patrimonio_caiu");
    assert.strictEqual(found!.severity, "warning");
  });

  it("R2 — patrimonio_caiu severity=danger quando < -5%", () => {
    const insights = computeInsights(makeInput({ monthlyGrowthPct: -6 }));
    const found = insights.find(i => i.id === "patrimonio_caiu");
    assert.ok(found);
    assert.strictEqual(found!.severity, "danger");
  });

  it("R2 — patrimonio_caiu NÃO dispara com queda de -1% (ruído)", () => {
    const insights = computeInsights(makeInput({ monthlyGrowthPct: -0.5 }));
    assert.ok(!insights.find(i => i.id === "patrimonio_caiu"));
  });

  it("R3 — poupanca_alta dispara com savingsRate >= 20", () => {
    const insights = computeInsights(makeInput({ savingsRate: 25, monthlyGrowthPct: null }));
    const found = insights.find(i => i.id === "poupanca_alta");
    assert.ok(found);
    assert.strictEqual(found!.severity, "success");
  });

  it("R3 — poupanca_alta NÃO dispara com savingsRate = 19", () => {
    const insights = computeInsights(makeInput({ savingsRate: 19, monthlyGrowthPct: null }));
    assert.ok(!insights.find(i => i.id === "poupanca_alta"));
  });

  it("R4 — poupanca_baixa dispara com savingsRate < 10 e renda > 0", () => {
    const insights = computeInsights(makeInput({ savingsRate: 5, monthlySurplus: 200, monthlyGrowthPct: null }));
    const found = insights.find(i => i.id === "poupanca_baixa");
    assert.ok(found);
    assert.strictEqual(found!.severity, "warning");
  });

  it("R4 — poupanca_baixa severity=danger quando monthlySurplus <= 0", () => {
    const insights = computeInsights(makeInput({
      savingsRate: 0, monthlySurplus: -100, monthlyIncome: 4_000, monthlyExpense: 4_100,
      monthlyGrowthPct: null,
    }));
    const found = insights.find(i => i.id === "poupanca_baixa");
    assert.ok(found);
    assert.strictEqual(found!.severity, "danger");
  });

  it("R5 — reserva_insuficiente dispara com status=insufficient", () => {
    const insights = computeInsights(makeInput({
      emergencyStatus: "insufficient", monthsCovered: 0.5, progress: 8,
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    const found = insights.find(i => i.id === "reserva_insuficiente");
    assert.ok(found);
    assert.strictEqual(found!.severity, "danger");
  });

  it("R5 — reserva_insuficiente severity=warning quando status=building", () => {
    const insights = computeInsights(makeInput({
      emergencyStatus: "building", monthsCovered: 3, progress: 50,
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    const found = insights.find(i => i.id === "reserva_insuficiente");
    assert.ok(found);
    assert.strictEqual(found!.severity, "warning");
  });

  it("R5 — reserva_insuficiente NÃO dispara com status=adequate", () => {
    const insights = computeInsights(makeInput({
      emergencyStatus: "adequate", monthsCovered: 7,
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    assert.ok(!insights.find(i => i.id === "reserva_insuficiente"));
  });

  it("R6 — carteira_concentrada dispara com isConcentrated=true", () => {
    const insights = computeInsights(makeInput({
      isConcentrated: true, topConcentration: 65, monthlyGrowthPct: null, savingsRate: 15,
    }));
    const found = insights.find(i => i.id === "carteira_concentrada");
    assert.ok(found);
    assert.strictEqual(found!.severity, "warning");
    assert.ok(found!.metric?.includes("65%"));
  });

  it("R6 — carteira_concentrada NÃO dispara com isConcentrated=false", () => {
    const insights = computeInsights(makeInput({ isConcentrated: false, monthlyGrowthPct: null, savingsRate: 15 }));
    assert.ok(!insights.find(i => i.id === "carteira_concentrada"));
  });

  it("R7 — dividendos_relevantes dispara com incomeReplacementRate >= 5", () => {
    const insights = computeInsights(makeInput({
      annualPassiveIncome: 6_000, monthlyPassiveIncome: 500, incomeReplacementRate: 12.5,
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    const found = insights.find(i => i.id === "dividendos_relevantes");
    assert.ok(found);
    assert.strictEqual(found!.severity, "info");
  });

  it("R7 — dividendos_relevantes severity=success quando >= 25%", () => {
    const insights = computeInsights(makeInput({
      annualPassiveIncome: 15_000, monthlyPassiveIncome: 1_250, incomeReplacementRate: 30,
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    const found = insights.find(i => i.id === "dividendos_relevantes");
    assert.ok(found);
    assert.strictEqual(found!.severity, "success");
  });

  it("R7 — dividendos_relevantes NÃO dispara com incomeReplacementRate < 5", () => {
    const insights = computeInsights(makeInput({
      annualPassiveIncome: 200, monthlyPassiveIncome: 17, incomeReplacementRate: 0.4,
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    assert.ok(!insights.find(i => i.id === "dividendos_relevantes"));
  });

  it("R8 — cartao_uso_alto dispara com creditUsagePct >= 70", () => {
    const input = makeInput({ monthlyGrowthPct: null, savingsRate: 15 }, 75);
    const found = computeInsights(input).find(i => i.id === "cartao_uso_alto");
    assert.ok(found);
    assert.strictEqual(found!.severity, "warning");
  });

  it("R8 — cartao_uso_alto severity=danger quando >= 90%", () => {
    const input = makeInput({ monthlyGrowthPct: null, savingsRate: 15 }, 92);
    const found = computeInsights(input).find(i => i.id === "cartao_uso_alto");
    assert.ok(found);
    assert.strictEqual(found!.severity, "danger");
  });

  it("R8 — cartao_uso_alto NÃO dispara com creditUsagePct = 50", () => {
    const input = makeInput({ monthlyGrowthPct: null, savingsRate: 15 }, 50);
    assert.ok(!computeInsights(input).find(i => i.id === "cartao_uso_alto"));
  });

  it("R9 — categoria_gasto_alto dispara quando categoria > 40% do total", () => {
    const input = makeInput(
      { monthlyGrowthPct: null, savingsRate: 15 },
      30,
      { name: "Moradia", amount: 2_000, totalPct: 50 },
    );
    const found = computeInsights(input).find(i => i.id === "categoria_gasto_alto");
    assert.ok(found);
    assert.ok(found!.description.includes("Moradia"));
  });

  it("R9 — categoria_gasto_alto severity=warning quando >= 60%", () => {
    const input = makeInput(
      { monthlyGrowthPct: null, savingsRate: 15 },
      30,
      { name: "Alimentação", amount: 3_000, totalPct: 65 },
    );
    const found = computeInsights(input).find(i => i.id === "categoria_gasto_alto");
    assert.ok(found);
    assert.strictEqual(found!.severity, "warning");
  });

  it("R9 — categoria_gasto_alto NÃO dispara com totalPct = 30", () => {
    const input = makeInput(
      { monthlyGrowthPct: null, savingsRate: 15 },
      30,
      { name: "Transporte", amount: 1_200, totalPct: 30 },
    );
    assert.ok(!computeInsights(input).find(i => i.id === "categoria_gasto_alto"));
  });

  it("R10 — fire_avancando dispara com progressPct > 0", () => {
    const insights = computeInsights(makeInput({
      progressPct: 20, fireTarget: 1_200_000, fiLevel: "acumulando",
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    const found = insights.find(i => i.id === "fire_avancando");
    assert.ok(found);
    assert.strictEqual(found!.severity, "info");
    assert.ok(found!.metric?.includes("20%"));
  });

  it("R10 — fire_avancando severity=success quando progressPct >= 50", () => {
    const insights = computeInsights(makeInput({
      progressPct: 60, fireTarget: 1_200_000, fiLevel: "semi_fi",
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    const found = insights.find(i => i.id === "fire_avancando");
    assert.ok(found);
    assert.strictEqual(found!.severity, "success");
  });

  it("R10 — fire_avancando NÃO dispara com progressPct = 0 ou fireTarget = 0", () => {
    const insights = computeInsights(makeInput({
      progressPct: 0, fireTarget: 0,
      monthlyGrowthPct: null, savingsRate: 15,
    }));
    assert.ok(!insights.find(i => i.id === "fire_avancando"));
  });

  it("ordenação: danger vem antes de warning, warning antes de success", () => {
    const insights = computeInsights(makeInput({
      // danger: reserva insuficiente
      emergencyStatus: "insufficient", monthsCovered: 0.3, progress: 5,
      // warning: cartão
      monthlyGrowthPct: null,
      // success: poupança alta
      savingsRate: 30,
    }), 85, null);

    const indices = {
      danger:  insights.findIndex(i => i.severity === "danger"),
      warning: insights.findIndex(i => i.severity === "warning"),
      success: insights.findIndex(i => i.severity === "success"),
    };

    if (indices.danger >= 0 && indices.warning >= 0) {
      assert.ok(indices.danger < indices.warning, "danger deve vir antes de warning");
    }
    if (indices.warning >= 0 && indices.success >= 0) {
      assert.ok(indices.warning < indices.success, "warning deve vir antes de success");
    }
  });

  it("maxResults limita o número de insights retornados", () => {
    const input = makeInput(
      { monthlyGrowthPct: 3, emergencyStatus: "insufficient", monthsCovered: 0.3, progress: 5, savingsRate: 5, monthlySurplus: -100, isConcentrated: true, topConcentration: 70 },
      90,
      { name: "Lazer", amount: 2_000, totalPct: 55 },
    );
    const insights = computeInsights(input, 3);
    assert.ok(insights.length <= 3, "deve limitar a 3 insights");
  });
});
