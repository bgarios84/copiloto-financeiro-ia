/**
 * Financial Health Engine — Reserva de emergencia
 * Sprint 11.1
 *
 * Calculos:
 *   monthsCovered = liquidBalance / monthlyExpense
 *   targetAmount  = monthlyExpense * targetMonths
 *   progress      = min(100, liquidBalance / targetAmount * 100)
 *
 * Status:
 *   insufficient  < 1 mes coberto
 *   building      >= 1 mes, < targetMonths
 *   adequate      >= targetMonths, < 12 meses
 *   excess        >= 12 meses (dinheiro parado desnecessariamente)
 */

import type { HealthInput, EmergencyReserveResult, EmergencyStatus } from "./types";

const DEFAULT_TARGET_MONTHS = 6;

export function computeEmergencyReserve(input: HealthInput): EmergencyReserveResult {
  const targetMonths =
    (input.emergencyReserveTargetMonths ?? DEFAULT_TARGET_MONTHS);
  const liquidBalance  = Math.max(0, input.liquidBalance);
  const monthlyExpense = Math.max(0, input.monthlyExpense);

  const monthsCovered =
    monthlyExpense > 0 ? liquidBalance / monthlyExpense : Infinity;

  const targetAmount =
    monthlyExpense > 0 ? monthlyExpense * targetMonths : 0;

  const progress =
    targetAmount > 0
      ? Math.min(100, (liquidBalance / targetAmount) * 100)
      : monthsCovered === Infinity ? 100 : 0;

  let status: EmergencyStatus;
  if      (monthsCovered >= 12)           status = "excess";
  else if (monthsCovered >= targetMonths) status = "adequate";
  else if (monthsCovered >= 1)            status = "building";
  else                                    status = "insufficient";

  return {
    liquidBalance,
    monthsCovered: isFinite(monthsCovered) ? monthsCovered : 999,
    targetMonths,
    targetAmount,
    progress,
    status,
  };
}
