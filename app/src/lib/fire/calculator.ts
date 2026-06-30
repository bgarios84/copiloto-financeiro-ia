/**
 * calculator — Cálculos FIRE
 * Sprint 8.4 / 8.5
 *
 * Funções puras — sem I/O, sem "use server" / "use client".
 *
 * Fórmulas:
 *   FIRE Target  = (monthly_expense × 12) / SWR
 *   Taxa real    = (1 + r_nom)^(1/12) / (1 + r_inf)^(1/12) − 1   [Fisher, mensal]
 *   FV           = PV·(1+r)^n + PMT·[(1+r)^n − 1]/r               [juros compostos com aportes]
 *   n (FIRE)     = ln[(FV + PMT/r) / (PV + PMT/r)] / ln(1+r)     [inversão do FV]
 *   FI Score     = min(100, renda_passiva / despesa × 100)
 *   Probabilidade = heurística de cenários + bônus do FI Score
 *   Tempo salvo  = n(PMT) − n(PMT + annual_extra/12)
 *   Retorno real = (1 + nominal) / (1 + inflação) − 1
 */

import type {
  FireInput,
  FireResult,
  FireScenario,
  FireProjectionPoint,
  FireIndicators,
  FILevel,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Taxa real mensal a partir de taxas nominais anuais (equação de Fisher).
 */
export function realMonthlyRate(annualReturn: number, annualInflation: number): number {
  const mNominal   = Math.pow(1 + annualReturn,   1 / 12) - 1;
  const mInflation = Math.pow(1 + annualInflation, 1 / 12) - 1;
  return (1 + mNominal) / (1 + mInflation) - 1;
}

/**
 * Future Value com aportes mensais PMT e taxa real r.
 */
export function futureValue(PV: number, PMT: number, r: number, n: number): number {
  if (Math.abs(r) < 1e-10) return PV + PMT * n;
  const factor = Math.pow(1 + r, n);
  return PV * factor + PMT * (factor - 1) / r;
}

/**
 * Número de meses para atingir FV a partir de PV com aporte PMT e taxa r.
 * Retorna Infinity se matematicamente impossível.
 */
export function monthsToTarget(PV: number, PMT: number, r: number, FV: number): number {
  if (PV >= FV) return 0;
  if (Math.abs(r) < 1e-10) return PMT > 0 ? (FV - PV) / PMT : Infinity;

  const denom = PV + PMT / r;
  if (denom <= 0) return Infinity;

  const x = (FV + PMT / r) / denom;
  if (x <= 1) return Infinity;

  return Math.log(x) / Math.log(1 + r);
}

// ── calcFire ──────────────────────────────────────────────────────────────────

export function calcFire(input: FireInput): FireResult {
  const {
    currentPatrimonio,
    monthlyContribution,
    annualExtra,
    annualReturn,
    annualInflation,
    safeWithdrawalRate,
    currentAge,
    targetAge,
    targetMonthlyIncome,
    monthlyDividends,
  } = input;

  // Aporte efetivo = mensal + extra anual distribuído em 12 meses
  const extraMonthly  = annualExtra / 12;
  const effectivePMT  = monthlyContribution + extraMonthly;

  const r         = realMonthlyRate(annualReturn, annualInflation);
  const fireTarget = (targetMonthlyIncome * 12) / Math.max(safeWithdrawalRate, 0.001);

  const months = monthsToTarget(currentPatrimonio, effectivePMT, r, fireTarget);
  const years  = months === Infinity ? Infinity : months / 12;
  const age    = months === Infinity ? Infinity : currentAge + years;

  const currentPassiveIncome = currentPatrimonio * safeWithdrawalRate / 12;
  const firePercentage = fireTarget > 0
    ? Math.min(100, (currentPatrimonio / fireTarget) * 100)
    : 100;

  // Patrimônio na idade alvo
  const targetYears         = Math.max(0, targetAge - currentAge);
  const patrimonioAtTarget  = Math.max(0, futureValue(currentPatrimonio, effectivePMT, r, targetYears * 12));
  const willReachByTargetAge = patrimonioAtTarget >= fireTarget;

  // Dividend yield estimado (constante ao longo da projeção)
  // Será 0 se monthlyDividends == 0 (sem dados de investimento)
  // O cliente passa investTotal; aqui usamos o yield proporcional ao patrimônio
  // Fórmula simples: dividends[year] = patrimônio[year] × (monthlyDividends / currentPatrimonio)
  // Com fallback para 0 se currentPatrimonio == 0.
  const divYieldRatio = currentPatrimonio > 0 ? monthlyDividends / currentPatrimonio : 0;

  // Projeção anual
  const projYears = years === Infinity ? 40 : Math.ceil(years);
  const maxYears  = Math.min(60, projYears + 10);
  const projectionData: FireProjectionPoint[] = [];

  for (let y = 0; y <= maxYears; y++) {
    const n          = y * 12;
    const patrimonio = Math.max(0, futureValue(currentPatrimonio, effectivePMT, r, n));
    const accContrib = currentPatrimonio + effectivePMT * n;

    projectionData.push({
      year:          y,
      age:           Math.round((currentAge + y) * 10) / 10,
      patrimonio:    Math.round(patrimonio),
      passiveIncome: Math.round(patrimonio * safeWithdrawalRate / 12),
      contributions: Math.round(Math.max(currentPatrimonio, accContrib)),
      interestGain:  Math.round(Math.max(0, patrimonio - accContrib)),
      dividends:     Math.round(patrimonio * divYieldRatio),
    });
  }

  const p10 = projectionData.find(p => p.year === Math.min(10, maxYears))?.patrimonio ?? 0;
  const p20 = projectionData.find(p => p.year === Math.min(20, maxYears))?.patrimonio ?? 0;

  return {
    fireTarget:             Math.round(fireTarget),
    monthsToFire:           months,
    yearsToFire:            years,
    fireAge:                age,
    currentPassiveIncome:   Math.round(currentPassiveIncome),
    firePercentage:         Math.round(firePercentage * 10) / 10,
    projectedPatrimonio10y: p10,
    projectedPatrimonio20y: p20,
    willReachByTargetAge,
    patrimonioAtTargetAge:  Math.round(patrimonioAtTarget),
    projectionData,
  };
}

// ── calcScenarios ─────────────────────────────────────────────────────────────

export function calcScenarios(base: FireInput): FireScenario[] {
  const conservative: FireInput = {
    ...base,
    annualReturn:        0.06,
    annualInflation:     0.05,
    monthlyContribution: Math.round(base.monthlyContribution * 0.8),
    annualExtra:         Math.round(base.annualExtra * 0.8),
  };
  const optimistic: FireInput = {
    ...base,
    annualReturn:        0.10,
    annualInflation:     0.035,
    monthlyContribution: Math.round(base.monthlyContribution * 1.2),
    annualExtra:         Math.round(base.annualExtra * 1.2),
  };

  return [
    {
      key: "conservative", label: "Conservador", color: "#F59E0B",
      input: conservative, result: calcFire(conservative),
    },
    {
      key: "base", label: "Base", color: "#3B82F6",
      input: base, result: calcFire(base),
    },
    {
      key: "optimistic", label: "Otimista", color: "#10B981",
      input: optimistic, result: calcFire(optimistic),
    },
  ];
}

// ── calcIndicators — Sprint 8.5 ───────────────────────────────────────────────

export function calcIndicators(
  input:     FireInput,
  result:    FireResult,
  scenarios: FireScenario[],
  totalDebt: number,
): FireIndicators {
  const {
    monthlyExpense,
    monthlyContribution,
    monthlyIncome,
    currentPatrimonio,
    annualExtra,
    annualReturn,
    annualInflation,
  } = input;

  // ── FI Score ──────────────────────────────────────────────────────────────
  const fiScore: number = monthlyExpense > 0
    ? Math.min(100, (result.currentPassiveIncome / monthlyExpense) * 100)
    : 0;

  const fiLevel: FILevel =
    fiScore >= 100 ? "fire" :
    fiScore >= 75  ? "fi"   :
    fiScore >= 50  ? "semi_fi" :
    fiScore >= 25  ? "acumulando" : "iniciante";

  // ── Probabilidade (heurística) ────────────────────────────────────────────
  // Conta cenários que atingem FIRE em até 40 anos
  const reachCount = scenarios.filter(s => s.result.yearsToFire <= 40).length;
  const baseProbability = ([8, 35, 65, 90] as const)[reachCount] ?? 8;
  const probability = Math.min(98, Math.round(baseProbability + fiScore * 0.1));

  // ── Tempo economizado pelo aporte extra ───────────────────────────────────
  let timeSavedByExtra = 0;
  if (annualExtra > 0 && isFinite(result.monthsToFire)) {
    const inputWithout = { ...input, annualExtra: 0 };
    const resultWithout = calcFire(inputWithout);
    timeSavedByExtra = Math.max(0, Math.round(resultWithout.monthsToFire - result.monthsToFire));
  }

  // ── Demais indicadores ────────────────────────────────────────────────────
  const remainingToTarget = Math.max(0, result.fireTarget - currentPatrimonio);
  const safeMonthlySpend  = result.currentPassiveIncome;
  const safeDailySpend    = Math.round((safeMonthlySpend / 30) * 100) / 100;
  const savingsRate        = monthlyIncome > 0
    ? Math.round(((monthlyContribution + annualExtra / 12) / monthlyIncome) * 1000) / 10
    : 0;
  const realReturn = Math.round(
    ((1 + annualReturn) / (1 + annualInflation) - 1) * 10000,
  ) / 100;
  const netPatrimonio = currentPatrimonio - totalDebt;

  return {
    fiScore:           Math.round(fiScore * 10) / 10,
    fiLevel,
    probability,
    timeSavedByExtra,
    remainingToTarget: Math.round(remainingToTarget),
    safeMonthlySpend:  Math.round(safeMonthlySpend),
    safeDailySpend,
    savingsRate,
    realReturn,
    netPatrimonio:     Math.round(netPatrimonio),
  };
}
