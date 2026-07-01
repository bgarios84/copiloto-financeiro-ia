/**
 * Financial Context Engine — Tests
 * Sprint 12.1
 *
 * Cobertura: buildFinancialContext() — todos os sub-builders.
 * Runner: node --experimental-strip-types --test
 */

import { describe, it } from "node:test";
import assert            from "node:assert/strict";
import { buildFinancialContext } from "../builder.ts";
import type { BuildContextInput } from "../builder.ts";
import type { HealthSnapshot }    from "../../financial-health/types.ts";
import type { FinancialInsight }  from "../../financial-insights/types.ts";
import type { InternalAlert }     from "../../../services/alerts.ts";
import type { OpenFinanceConnection } from "../../../types/open-finance.ts";
import type { DashboardData }     from "../../../types/dashboard.ts";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeHealth(overrides: Partial<HealthSnapshot> = {}): HealthSnapshot {
  return {
    computedAt: "2026-01-01T00:00:00.000Z",
    wealth: {
      totalAssets:      2_100_000,
      totalLiabilities: 50_000,
      netWorth:         2_050_000,
      monthlyGrowthPct: 0.8,
    },
    cashFlow: {
      monthlyIncome:  25_000,
      monthlyExpense: 10_000,
      netResult:      15_000,
      trend:          "improving",
    },
    savings: {
      savingsRate:       60,
      avgSavingsRate12m: 55,
      monthlySurplus:    15_000,
      grade:             "excellent",
    },
    emergencyReserve: {
      liquidBalance:  60_000,
      monthsCovered:  6,
      targetMonths:   6,
      targetAmount:   0,
      progress:       100,
      status:         "adequate",
    },
    portfolio: {
      totalInvested:        2_000_000,
      byClass:              [
        { assetClass: "renda_fixa", value: 1_200_000, percentage: 60 },
        { assetClass: "acoes",      value:   800_000, percentage: 40 },
      ],
      topConcentration:     60,
      herfindahlIndex:      0.52,
      diversificationScore: 48,
      isConcentrated:       true,
    },
    passiveIncome: {
      monthlyPassiveIncome:  2_000,
      incomeReplacementRate: 20,
    },
    fireProgress: {
      fireTarget:      3_000_000,
      progressPct:     68.3,
      remainingToFire: 950_000,
      fiScore:         20,
      fiLevel:         "acumulando",
    },
    score: {
      score:    91,
      grade:    "A",
      breakdown: {
        savingsRate:      25,
        emergencyReserve: 20,
        debtControl:      20,
        diversification:  14,
        passiveIncome:    12,
      },
      strengths:  ["Alta taxa de poupança", "Reserva de emergência completa"],
      weaknesses: ["Carteira concentrada em renda fixa"],
    },
    ...overrides,
  } as HealthSnapshot;
}

function makeInsights(): FinancialInsight[] {
  return [
    {
      id:          "patrimonio_cresce",
      title:       "Patrimônio em crescimento",
      description: "Seu patrimônio cresceu no último mês.",
      severity:    "success",
      category:    "patrimonio",
      metric:      "+0.8%",
      icon:        "TrendingUp",
    },
    {
      id:          "carteira_concentrada",
      title:       "Carteira concentrada",
      description: "Renda fixa representa 60% da carteira.",
      severity:    "warning",
      category:    "investimentos",
      icon:        "PieChart",
    },
  ];
}

function makeAlerts(): InternalAlert[] {
  return [
    {
      id:          "of_connection_error",
      title:       "Conexão com erro",
      description: "1 conexão Open Finance com erro.",
      severity:    "danger",
      actionLabel: "Reconectar",
      actionHref:  "/settings/open-finance",
    },
  ];
}

function makeConnections(): OpenFinanceConnection[] {
  return [
    {
      id:                 "conn-1",
      user_id:            "user-1",
      provider:           "pluggy",
      provider_item_id:   "item-1",
      institution_id:     "bank-001",
      status:             "connected",
      error_message:      null,
      consent_expires_at: null,
      last_synced_at:     "2026-06-28T10:00:00.000Z",
      created_at:         "2026-01-01T00:00:00.000Z",
      updated_at:         "2026-06-28T10:00:00.000Z",
      deleted_at:         null,
    },
    {
      id:                 "conn-2",
      user_id:            "user-1",
      provider:           "pluggy",
      provider_item_id:   "item-2",
      institution_id:     "bank-002",
      status:             "error",
      error_message:      "Token expirado",
      consent_expires_at: null,
      last_synced_at:     null,
      created_at:         "2026-01-01T00:00:00.000Z",
      updated_at:         "2026-06-28T10:00:00.000Z",
      deleted_at:         null,
    },
  ];
}

function makeData(): DashboardData {
  return {
    summary: {
      user_id:                 "user-1",
      total_balance:           60_000,
      total_accounts:          3,
      monthly_income:          25_000,
      monthly_expense:         10_000,
      monthly_result:          15_000,
      monthly_transactions:    120,
      total_credit_limit:      20_000,
      total_credit_used:       5_000,
      total_credit_available:  15_000,
      credit_usage_percentage: 25,
    },
    cashFlow:          [],
    expenseByCategory: [],
    patrimonio: {
      investments:  [],
      manualAssets: [],
      b3QuoteMap:   {},
      dividendMap:  {},
      fxRateMap:    { BRL: 1 },
    },
  };
}

function makeInput(overrides: Partial<BuildContextInput> = {}): BuildContextInput {
  return {
    health:      makeHealth(),
    insights:    makeInsights(),
    alerts:      makeAlerts(),
    connections: makeConnections(),
    data:        makeData(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("buildFinancialContext", () => {
  it("retorna generatedAt como ISO string válida", () => {
    const ctx = buildFinancialContext(makeInput());
    assert.ok(!isNaN(new Date(ctx.generatedAt).getTime()));
  });

  // ── summary ────────────────────────────────────────────────────────────────
  describe("summary", () => {
    it("netWorth correto", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.summary.netWorth, 2_050_000);
    });

    it("liquidCash vem de emergencyReserve.liquidBalance", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.summary.liquidCash, 60_000);
    });

    it("totalInvestments vem de portfolio.totalInvested", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.summary.totalInvestments, 2_000_000);
    });

    it("totalDebt vem de wealth.totalLiabilities", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.summary.totalDebt, 50_000);
    });

    it("monthlyGrowthPct preservado", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.summary.monthlyGrowthPct, 0.8);
    });

    it("monthlyGrowthPct null quando histórico insuficiente", () => {
      const h = makeHealth({ wealth: { totalAssets: 100_000, totalLiabilities: 0, netWorth: 100_000, monthlyGrowthPct: null } });
      const ctx = buildFinancialContext(makeInput({ health: h }));
      assert.equal(ctx.summary.monthlyGrowthPct, null);
    });
  });

  // ── health ─────────────────────────────────────────────────────────────────
  describe("health", () => {
    it("score e grade corretos", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.health.score, 91);
      assert.equal(ctx.health.grade, "A");
    });

    it("strengths e weaknesses preservados", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.health.strengths.length, 2);
      assert.equal(ctx.health.weaknesses.length, 1);
    });

    it("savingsRate nos components", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.health.components.savingsRate, 60);
    });

    it("emergencyStatus nos components", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.health.components.emergencyStatus, "adequate");
    });

    it("creditDebtRatio calculado corretamente", () => {
      const ctx = buildFinancialContext(makeInput());
      // 50_000 / 2_050_000 * 100 ≈ 2.44
      assert.ok(ctx.health.components.creditDebtRatio > 2 && ctx.health.components.creditDebtRatio < 3);
    });

    it("creditDebtRatio é 0 quando netWorth é 0", () => {
      const h = makeHealth({ wealth: { totalAssets: 0, totalLiabilities: 0, netWorth: 0, monthlyGrowthPct: null } });
      const ctx = buildFinancialContext(makeInput({ health: h }));
      assert.equal(ctx.health.components.creditDebtRatio, 0);
    });
  });

  // ── insights ───────────────────────────────────────────────────────────────
  describe("insights", () => {
    it("mapeia todos os insights", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.insights.length, 2);
    });

    it("preserva id, title, severity e category", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.insights[0].id, "patrimonio_cresce");
      assert.equal(ctx.insights[0].severity, "success");
      assert.equal(ctx.insights[1].severity, "warning");
    });

    it("retorna array vazio quando sem insights", () => {
      const ctx = buildFinancialContext(makeInput({ insights: [] }));
      assert.equal(ctx.insights.length, 0);
    });
  });

  // ── alerts ─────────────────────────────────────────────────────────────────
  describe("alerts", () => {
    it("mapeia todos os alertas", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.alerts.length, 1);
    });

    it("preserva id, severity e description", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.alerts[0].id, "of_connection_error");
      assert.equal(ctx.alerts[0].severity, "danger");
    });

    it("retorna array vazio quando sem alertas", () => {
      const ctx = buildFinancialContext(makeInput({ alerts: [] }));
      assert.equal(ctx.alerts.length, 0);
    });
  });

  // ── openFinance ────────────────────────────────────────────────────────────
  describe("openFinance", () => {
    it("conta conexões ativas e problemáticas", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.openFinance.activeConnections, 1);
      assert.equal(ctx.openFinance.problematicCount, 1);
    });

    it("lastSyncedAt vem da conexão mais recente", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.openFinance.lastSyncedAt?.startsWith("2026-06-28"));
    });

    it("lastSyncedAt é null quando nenhuma conexão ativa", () => {
      const conns = makeConnections().map(c => ({ ...c, status: "error" as const }));
      const ctx = buildFinancialContext(makeInput({ connections: conns }));
      assert.equal(ctx.openFinance.lastSyncedAt, null);
    });

    it("retorna array vazio quando sem conexões", () => {
      const ctx = buildFinancialContext(makeInput({ connections: [] }));
      assert.equal(ctx.openFinance.connections.length, 0);
      assert.equal(ctx.openFinance.activeConnections, 0);
    });
  });

  // ── investments ────────────────────────────────────────────────────────────
  describe("investments", () => {
    it("isConcentrated correto", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.investments.isConcentrated, true);
    });

    it("topAssetClass correto", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.investments.topAssetClass, "renda_fixa");
      assert.equal(ctx.investments.topAssetClassPct, 60);
    });

    it("allocation tem 2 slices", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.investments.allocation.length, 2);
      assert.equal(ctx.investments.allocation[0].assetClass, "renda_fixa");
    });

    it("topAssetClass null quando carteira vazia", () => {
      const h = makeHealth({
        portfolio: {
          totalInvested: 0, byClass: [], topConcentration: 0,
          herfindahlIndex: 0, diversificationScore: 0, isConcentrated: false,
        },
      });
      const ctx = buildFinancialContext(makeInput({ health: h }));
      assert.equal(ctx.investments.topAssetClass, null);
    });

    it("currencyExposure inclui BRL do caixa", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok("BRL" in ctx.investments.currencyExposure);
    });
  });

  // ── cashFlow ───────────────────────────────────────────────────────────────
  describe("cashFlow", () => {
    it("income e expense corretos", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.cashFlow.monthlyIncome, 25_000);
      assert.equal(ctx.cashFlow.monthlyExpense, 10_000);
    });

    it("savingsRate correto", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.cashFlow.savingsRate, 60);
    });

    it("trend 'improving' → 'growing'", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.cashFlow.trend, "growing");
    });

    it("trend 'deteriorating' → 'declining'", () => {
      const h = makeHealth({ cashFlow: { monthlyIncome: 10_000, monthlyExpense: 12_000, netResult: -2_000, trend: "deteriorating" } });
      const ctx = buildFinancialContext(makeInput({ health: h }));
      assert.equal(ctx.cashFlow.trend, "declining");
    });

    it("trend 'stable' → 'stable'", () => {
      const h = makeHealth({ cashFlow: { monthlyIncome: 10_000, monthlyExpense: 8_000, netResult: 2_000, trend: "stable" } });
      const ctx = buildFinancialContext(makeInput({ health: h }));
      assert.equal(ctx.cashFlow.trend, "stable");
    });
  });

  // ── fire ───────────────────────────────────────────────────────────────────
  describe("fire", () => {
    it("fireTarget, progressPct e remainingToFire corretos", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.fire.fireTarget, 3_000_000);
      assert.equal(ctx.fire.progressPct, 68.3);
      assert.equal(ctx.fire.remainingToFire, 950_000);
    });

    it("fiLevel correto", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.equal(ctx.fire.fiLevel, "acumulando");
    });

    it("estimatedFireYear é número futuro quando há crescimento positivo", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.fire.estimatedFireYear === null || ctx.fire.estimatedFireYear > 2026);
    });

    it("estimatedFireYear é ano atual quando progressPct >= 100", () => {
      const h = makeHealth({
        fireProgress: {
          fireTarget: 1_000_000, progressPct: 100, remainingToFire: 0, fiScore: 100, fiLevel: "fire",
        },
      });
      const ctx = buildFinancialContext(makeInput({ health: h }));
      assert.equal(ctx.fire.estimatedFireYear, new Date().getFullYear());
    });

    it("estimatedFireYear é null quando crescimento é zero", () => {
      const h = makeHealth({ wealth: { totalAssets: 2_100_000, totalLiabilities: 50_000, netWorth: 2_050_000, monthlyGrowthPct: 0 } });
      const ctx = buildFinancialContext(makeInput({ health: h }));
      assert.equal(ctx.fire.estimatedFireYear, null);
    });
  });

  // ── textual ────────────────────────────────────────────────────────────────
  describe("textual", () => {
    it("paragraphPT não é vazio", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.textual.paragraphPT.length > 50);
    });

    it("paragraphPT menciona patrimônio líquido", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.textual.paragraphPT.includes("patrimônio líquido"));
    });

    it("paragraphPT menciona Health Score", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.textual.paragraphPT.includes("Health Score"));
    });

    it("paragraphPT menciona alertas quando há alertas danger", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.textual.paragraphPT.includes("alerta"));
    });

    it("paragraphPT não menciona alertas quando lista vazia", () => {
      const ctx = buildFinancialContext(makeInput({ alerts: [] }));
      assert.ok(!ctx.textual.paragraphPT.includes("alerta"));
    });

    it("paragraphPT menciona carteira concentrada", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.textual.paragraphPT.includes("concentrada"));
    });

    it("paragraphPT menciona progresso FIRE", () => {
      const ctx = buildFinancialContext(makeInput());
      assert.ok(ctx.textual.paragraphPT.includes("FIRE"));
    });
  });
});
