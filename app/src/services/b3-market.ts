"use server";

/**
 * Service — B3 Market Data (Server Actions)
 * Sprint 7.1 / 7.1.1 — Market Data + Dividendos B3
 *
 * Apenas funções async — conformidade com "use server".
 * Dados de mercado compartilhados (sem user_id).
 * RLS: SELECT para authenticated; escrita exclusiva do service_role.
 */

import { createClient } from "@/lib/supabase/server";
import { requireAuth }  from "@/lib/supabase/require-auth";
import type { B3QuoteMap, ServiceResult } from "@/types/b3-market";
import type { B3DividendEvent } from "@/types/b3-dividend";

// ── Cotações ──────────────────────────────────────────────────────────────────

/**
 * Retorna o mapa de cotações mais recentes para os tickers fornecidos.
 * Exemplo de retorno: { PETR4: 38.20, XPML11: 118.00 }
 *
 * Algoritmo:
 *   1. Busca todas as cotações dos tickers solicitados
 *   2. Ordena por ticker ASC, quote_date DESC
 *   3. Em JS, mantém apenas a primeira (mais recente) por ticker
 */
export async function getLatestB3Quotes(
  tickers: string[]
): Promise<ServiceResult<B3QuoteMap>> {
  if (tickers.length === 0) return { data: {}, error: null };

  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("b3_quote")
      .select("ticker, close_price, quote_date")
      .in("ticker", tickers)
      .order("ticker",     { ascending: true })
      .order("quote_date", { ascending: false });

    if (error) return { data: null, error: error.message };

    // Mantém apenas a cotação mais recente por ticker
    const map: B3QuoteMap = {};
    for (const row of (data ?? []) as Array<{ ticker: string; close_price: number }>) {
      if (!(row.ticker in map)) {
        map[row.ticker] = row.close_price;
      }
    }

    return { data: map, error: null };
  } catch {
    return { data: null, error: "Erro ao buscar cotações B3." };
  }
}

// ── Dividendos / Proventos ────────────────────────────────────────────────────

/**
 * Retorna todos os eventos de dividendos/proventos para os tickers fornecidos.
 * Inclui eventos passados (12 meses) e futuros (próximos pagamentos).
 * Ordena por ticker ASC, payment_date DESC.
 */
export async function getDividendEventsForTickers(
  tickers: string[]
): Promise<ServiceResult<B3DividendEvent[]>> {
  if (tickers.length === 0) return { data: [], error: null };

  try {
    await requireAuth();
    const supabase = await createClient();

    // Janela: 12 meses atrás até o futuro
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("b3_dividend_event")
      .select("*")
      .in("ticker", tickers)
      .or(`ex_date.gte.${cutoffStr},payment_date.gte.${cutoffStr}`)
      .order("ticker",       { ascending: true })
      .order("payment_date", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as B3DividendEvent[], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar proventos B3." };
  }
}
