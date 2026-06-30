/**
 * Financial Health Engine — Score financeiro
 * Sprint 11.1
 *
 * Score [0, 100] composto por 5 dimensoes:
 *
 * | Dimensao           | Max pts | Criterio                                  |
 * |--------------------|---------|-------------------------------------------|
 * | Taxa de poupanca   |   25    | >= 30%: 25 | >= 20%: 18 | >= 10%: 10 | < 10%: 0-5 (proporcional) |
 * | Reserva emergencia |   20    | adequate/excess: 20 | building: proporcional | insufficient: 0-5 |
 * | Controle de dividas|   20    | sem divida: 20 | divida < 10% patrimonio: 15 | < 30%: 8 | >= 30%: 0 |
 * | Diversificacao     |   20    | score >= 70: 20 | >= 50: 14 | >= 30: 8 | < 30: 0-4 (proporcional) |
 * | Renda passiva      |   15    | incomeReplacementRate >= 50%: 15 | >= 25%: 10 | >= 10%: 5 | < 10%: 0-4 |
 *
 * Grade:
 *   A >= 80 | B >= 65 | C >= 50 | D >= 35 | F < 35
 */

import type {
  SavingsResult,
  EmergencyReserveResult,
  PortfolioResult,
  PassiveIncomeResult,
  WealthResult,
  FinancialScoreResult,
  ScoreGrade,
  ScoreBreakdown,
} from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function gradeFromScore(score: number): ScoreGrade {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

export function computeScore(
  wealth:          WealthResult,
  savings:         SavingsResult,
  emergency:       EmergencyReserveResult,
  portfolio:       PortfolioResult,
  passiveIncome:   PassiveIncomeResult,
): FinancialScoreResult {

  // ── 1. Taxa de poupanca (0-25 pts) ────────────────────────────────────────
  let savingsPts: number;
  const sr = savings.savingsRate;
  if      (sr >= 30) savingsPts = 25;
  else if (sr >= 20) savingsPts = 18;
  else if (sr >= 10) savingsPts = 10;
  else               savingsPts = clamp(Math.round((sr / 10) * 10), 0, 9);

  // ── 2. Reserva de emergencia (0-20 pts) ────────────────────────────────────
  let emergencyPts: number;
  if (emergency.status === "adequate" || emergency.status === "excess") {
    emergencyPts = 20;
  } else if (emergency.status === "building") {
    // proporcional ao progresso
    emergencyPts = clamp(Math.round((emergency.progress / 100) * 18), 2, 18);
  } else {
    // insufficient
    emergencyPts = clamp(Math.round(emergency.monthsCovered), 0, 4);
  }

  // ── 3. Controle de dividas (0-20 pts) ──────────────────────────────────────
  let debtPts: number;
  const netWorth = wealth.netWorth;
  const debt     = wealth.totalLiabilities;
  if (debt === 0) {
    debtPts = 20;
  } else if (netWorth > 0) {
    const debtRatio = debt / netWorth;
    if      (debtRatio < 0.10) debtPts = 15;
    else if (debtRatio < 0.30) debtPts = 8;
    else                        debtPts = 0;
  } else {
    // patrimonio liquido negativo
    debtPts = 0;
  }

  // ── 4. Diversificacao (0-20 pts) ──────────────────────────────────────────
  let diversPts: number;
  const ds = portfolio.diversificationScore;
  if      (ds >= 70) diversPts = 20;
  else if (ds >= 50) diversPts = 14;
  else if (ds >= 30) diversPts = 8;
  else if (ds >  0)  diversPts = clamp(Math.round((ds / 30) * 7), 0, 7);
  else               diversPts = 0;

  // ── 5. Renda passiva (0-15 pts) ────────────────────────────────────────────
  let passivePts: number;
  const irr = passiveIncome.incomeReplacementRate;
  if      (irr >= 50) passivePts = 15;
  else if (irr >= 25) passivePts = 10;
  else if (irr >= 10) passivePts = 5;
  else                passivePts = clamp(Math.round((irr / 10) * 4), 0, 4);

  const breakdown: ScoreBreakdown = {
    savingsRate:      savingsPts,
    emergencyReserve: emergencyPts,
    debtControl:      debtPts,
    diversification:  diversPts,
    passiveIncome:    passivePts,
  };

  const score = savingsPts + emergencyPts + debtPts + diversPts + passivePts;

  // ── Forcas e melhorias ──────────────────────────────────────────────────────
  const strengths:  string[] = [];
  const weaknesses: string[] = [];

  if (savingsPts >= 18) strengths.push("Excelente taxa de poupanca");
  else if (savingsPts < 10) weaknesses.push("Taxa de poupanca abaixo de 10%");

  if (emergencyPts === 20) strengths.push("Reserva de emergencia completa");
  else if (emergencyPts < 5) weaknesses.push("Reserva de emergencia insuficiente");

  if (debtPts === 20) strengths.push("Sem dividas de curto prazo");
  else if (debtPts === 0) weaknesses.push("Dividas representam mais de 30% do patrimonio");

  if (diversPts >= 14) strengths.push("Carteira bem diversificada");
  else if (diversPts <= 4) weaknesses.push("Carteira concentrada — avaliar diversificacao");

  if (passivePts >= 10) strengths.push("Renda passiva expressiva");
  else if (passivePts <= 4) weaknesses.push("Renda passiva ainda baixa");

  return {
    score,
    grade:     gradeFromScore(score),
    breakdown,
    strengths,
    weaknesses,
  };
}
