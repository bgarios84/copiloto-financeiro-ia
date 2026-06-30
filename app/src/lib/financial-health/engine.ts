/**
 * Financial Health Engine — Ponto de entrada principal
 * Sprint 11.1
 *
 * computeHealthSnapshot() agrega todos os modulos e retorna um HealthSnapshot completo.
 * Funcao pura — sem I/O, sem "use server" / "use client".
 */

import type { HealthInput, HealthSnapshot } from "./types.ts";
import { computeWealth         } from "./wealth.ts";
import { computeCashFlow       } from "./cash-flow.ts";
import { computeSavings        } from "./savings.ts";
import { computeEmergencyReserve } from "./emergency-reserve.ts";
import { computePortfolio      } from "./portfolio.ts";
import { computePassiveIncome  } from "./passive-income.ts";
import { computeFireProgress   } from "./fire-progress.ts";
import { computeScore          } from "./score.ts";

/**
 * Calcula todos os indicadores de saude financeira a partir do input.
 *
 * @param input  - Dados do usuario (todos os valores em BRL)
 * @param now    - Data/hora de referencia (ISO string). Default: new Date().toISOString()
 * @returns      HealthSnapshot com todos os indicadores calculados
 */
export function computeHealthSnapshot(
  input: HealthInput,
  now   = new Date().toISOString(),
): HealthSnapshot {
  const wealth           = computeWealth(input);
  const cashFlow         = computeCashFlow(input);
  const savings          = computeSavings(input);
  const emergencyReserve = computeEmergencyReserve(input);
  const portfolio        = computePortfolio(input);
  const passiveIncome    = computePassiveIncome(input);
  const fireProgress     = computeFireProgress(input, wealth.netWorth);
  const score            = computeScore(wealth, savings, emergencyReserve, portfolio, passiveIncome);

  return {
    computedAt: now,
    wealth,
    cashFlow,
    savings,
    emergencyReserve,
    portfolio,
    passiveIncome,
    fireProgress,
    score,
  };
}
