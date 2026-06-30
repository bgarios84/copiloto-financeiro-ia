/**
 * Financial Health Engine — Progresso FIRE
 * Sprint 11.1
 *
 * Calculos:
 *   fireTarget   = (monthlyExpense * 12) / SWR
 *   progressPct  = netWorth / fireTarget * 100
 *   fiScore      = monthlyPassiveIncome / monthlyExpense * 100
 *   fiLevel      = determinado pelo fiScore
 *
 * Niveis de independencia financeira (FI Levels):
 *   iniciante  fiScore <  10%
 *   acumulando fiScore < 25%
 *   semi_fi    fiScore < 50%
 *   fi         fiScore < 100%
 *   fire       fiScore >= 100%
 *
 * SWR padrao: 4% (regra dos 4% de Bengen, 1994).
 */

import type { HealthInput, FireProgressResult, FILevel } from "./types";

const DEFAULT_SWR = 0.04;

function determineFILevel(fiScore: number): FILevel {
  if (fiScore >= 100) return "fire";
  if (fiScore >= 50)  return "fi";
  if (fiScore >= 25)  return "semi_fi";
  if (fiScore >= 10)  return "acumulando";
  return "iniciante";
}

export function computeFireProgress(
  input:    HealthInput,
  netWorth: number,
): FireProgressResult {
  const swr        = input.safeWithdrawalRate ?? DEFAULT_SWR;
  const annualExp  = input.monthlyExpense * 12;
  const fireTarget = swr > 0 ? annualExp / swr : Infinity;

  const progressPct =
    fireTarget > 0 && isFinite(fireTarget)
      ? Math.max(0, (netWorth / fireTarget) * 100)
      : 0;

  const remainingToFire = Math.max(0, fireTarget - netWorth);

  const monthlyPassiveIncome = Math.max(0, input.dividendsLast12m) / 12;
  const fiScore =
    input.monthlyExpense > 0
      ? (monthlyPassiveIncome / input.monthlyExpense) * 100
      : 0;

  return {
    fireTarget: isFinite(fireTarget) ? fireTarget : 0,
    progressPct,
    remainingToFire,
    fiScore,
    fiLevel: determineFILevel(fiScore),
  };
}
