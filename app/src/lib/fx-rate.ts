/**
 * Utilitários de câmbio — funções puras sem "use server"
 * Sprint 6.2 — Base Multi-moeda
 *
 * Importável tanto em Server Components quanto em Client Components.
 * Não acessa Supabase — recebe o rateMap já buscado como parâmetro.
 */

import type { FxRateMap } from "@/types/fx-rate";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Moeda base de consolidação patrimonial */
export const BASE_CURRENCY = "BRL";

/** Moedas suportadas para consolidação */
export const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR", "BTC", "ETH"] as const;

// ── Conversion helpers ─────────────────────────────────────────────────────────

/**
 * Converte um valor de uma moeda para BRL usando o mapa de taxas.
 * Retorna null se a taxa não estiver disponível no mapa.
 *
 * @param amount   — valor a converter
 * @param currency — moeda de origem (ex: "USD")
 * @param rateMap  — mapa retornado por getLatestRatesForBRL()
 */
export function convertToBRL(
  amount: number,
  currency: string,
  rateMap: FxRateMap
): number | null {
  if (currency === BASE_CURRENCY) return amount;
  const rate = rateMap[currency];
  if (rate === undefined) return null;
  return amount * rate;
}

/**
 * Consolida um array de valores multi-moeda em BRL.
 * Itens sem taxa disponível são omitidos da soma e retornados em `missing`.
 *
 * @param items    — array de { amount, currency }
 * @param rateMap  — mapa de taxas
 */
export function consolidateInBRL(
  items: Array<{ amount: number; currency: string }>,
  rateMap: FxRateMap
): { totalBRL: number; missing: string[] } {
  let totalBRL = 0;
  const missing: string[] = [];

  for (const item of items) {
    const converted = convertToBRL(item.amount, item.currency, rateMap);
    if (converted === null) {
      if (!missing.includes(item.currency)) missing.push(item.currency);
    } else {
      totalBRL += converted;
    }
  }

  return { totalBRL, missing };
}
