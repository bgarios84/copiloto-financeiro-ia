"use server";

/**
 * Service — FX Rate (Server Actions)
 * Sprint 6.2 — Base Multi-moeda
 *
 * Apenas funções async que acessam Supabase.
 * Constantes e helpers puros estão em @/lib/fx-rate.ts.
 *
 * A RLS policy exige `authenticated` — o createClient() do SSR
 * injeta o JWT automaticamente, garantindo acesso apenas a usuários logados.
 * Escrita é exclusiva do service_role (jobs agendados). Esta service
 * file NUNCA expõe mutações para o frontend.
 */

import { createClient } from "@/lib/supabase/server";
import { BASE_CURRENCY } from "@/lib/fx-rate";
import type { FxRate, FxRateMap, ServiceResult } from "@/types/fx-rate";

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Retorna a taxa mais recente disponível para um par de moedas.
 * BRL → BRL retorna 1 sem consulta ao banco.
 */
export async function getLatestRate(
  baseCurrency: string,
  quoteCurrency: string = BASE_CURRENCY
): Promise<ServiceResult<FxRate>> {
  try {
    if (baseCurrency === quoteCurrency) {
      return {
        data: {
          id:             "identity",
          base_currency:  baseCurrency,
          quote_currency: quoteCurrency,
          rate:           1,
          rate_date:      new Date().toISOString().slice(0, 10),
          source:         "manual",
          created_at:     new Date().toISOString(),
        },
        error: null,
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fx_rate")
      .select("*")
      .eq("base_currency",  baseCurrency)
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
 * Retorna mapa de taxas para consolidação patrimonial em BRL.
 * Ex: { BRL: 1, USD: 5.70, EUR: 6.15, BTC: 580000, ETH: 19000 }
 *
 * Moedas sem taxa disponível são omitidas do mapa
 * (caller deve tratar via consolidateInBRL de @/lib/fx-rate).
 */
export async function getLatestRatesForBRL(): Promise<ServiceResult<FxRateMap>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fx_rate")
      .select("base_currency, rate, rate_date")
      .eq("quote_currency", BASE_CURRENCY)
      .order("base_currency", { ascending: true })
      .order("rate_date",     { ascending: false });

    if (error) return { data: null, error: error.message };

    // Pega apenas a taxa mais recente por base_currency
    const map: FxRateMap = { BRL: 1 };
    const seen = new Set<string>();

    for (const row of (data ?? []) as Array<{ base_currency: string; rate: number }>) {
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
