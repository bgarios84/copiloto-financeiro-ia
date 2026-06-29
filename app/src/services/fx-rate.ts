"use server";

/**
 * Service — FX Rate
 * Sprint 6.2 — Base Multi-moeda
 *
 * Funções utilitárias para buscar e aplicar taxas de câmbio.
 * fx_rate é dado de mercado compartilhado — sem requireAuth() para leitura,
 * mas a RLS policy exige `authenticated` (Supabase filtra automaticamente
 * via JWT ao usar createClient() com a sessão do usuário).
 *
 * Escrita é exclusiva do service_role (jobs agendados).
 * Esta service file NUNCA expõe mutações para o frontend.
 */

import { createClient } from "@/lib/supabase/server";
import type { FxRate, FxRateMap, ServiceResult } from "@/types/fx-rate";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Moeda base de consolidação patrimonial */
export const BASE_CURRENCY = "BRL";

/** Moedas suportadas para consolidação */
export const SUPPORTED_CURRENCIES = ["BRL", "USD", "EUR", "BTC", "ETH"] as const;

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Retorna a taxa mais recente disponível para um par de moedas.
 * Usa a data mais próxima disponível (não exige exatamente hoje).
 *
 * @param baseCurrency  — moeda de origem (ex: "USD")
 * @param quoteCurrency — moeda de destino (ex: "BRL")
 */
export async function getLatestRate(
  baseCurrency: string,
  quoteCurrency: string = BASE_CURRENCY
): Promise<ServiceResult<FxRate>> {
  try {
    // BRL → BRL = 1:1, sem consulta
    if (baseCurrency === quoteCurrency) {
      return {
        data: {
          id:            "identity",
          base_currency: baseCurrency,
          quote_currency: quoteCurrency,
          rate:          1,
          rate_date:     new Date().toISOString().slice(0, 10),
          source:        "manual",
          created_at:    new Date().toISOString(),
        },
        error: null,
      };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("fx_rate")
      .select("*")
      .eq("base_currency", baseCurrency)
      .eq("quote_currency", quoteCurrency)
      .order("rate_date", { ascending: false })
      .limit(1)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as FxRate, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar taxa de câmbio." };
  }
}

/**
 * Retorna um mapa de taxas para consolidação patrimonial.
 * Busca a taxa mais recente de cada moeda para BRL.
 *
 * Exemplo de retorno:
 *   { BRL: 1, USD: 5.70, EUR: 6.15, BTC: 580000, ETH: 19000 }
 *
 * Moedas sem taxa disponível são omitidas do mapa (caller deve tratar).
 */
export async function getLatestRatesForBRL(): Promise<ServiceResult<FxRateMap>> {
  try {
    const supabase = await createClient();

    // Busca a taxa mais recente por par usando DISTINCT ON equivalente:
    // ordena por (base, date DESC) e pega o primeiro de cada base
    const { data, error } = await supabase
      .from("fx_rate")
      .select("base_currency, rate, rate_date")
      .eq("quote_currency", BASE_CURRENCY)
      .order("base_currency", { ascending: true })
      .order("rate_date", { ascending: false });

    if (error) return { data: null, error: error.message };

    // Constrói mapa pegando apenas o primeiro (mais recente) de cada base
    const map: FxRateMap = { BRL: 1 };
    const seen = new Set<string>();

    for (const row of (data ?? []) as Array<{ base_currency: string; rate: number; rate_date: string }>) {
      if (!seen.has(row.base_currency)) {
        map[row.base_currency] = row.rate;
        seen.add(row.base_currency);
      }
    }

    return { data: map, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar taxas de câmbio." };
  }
}

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
 * Itens sem taxa disponível são somados como zero e retornados em `missing`.
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
