/**
 * Utilitários de dividendos/proventos B3 — funções puras sem "use server"
 * Sprint 7.1.1
 */

import type { B3DividendEvent, DividendSummary, DividendMap } from "@/types/b3-dividend";
import type { B3QuoteMap } from "@/types/b3-market";

// ── Date helpers ──────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function twelveMonthsAgo(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function isFuture(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return dateStr > today();
}

function isWithin12m(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const cutoff = twelveMonthsAgo();
  return dateStr >= cutoff && dateStr <= today();
}

// ── Core ──────────────────────────────────────────────────────────────────────

/**
 * Computa o resumo de dividendos para um ticker específico.
 * @param ticker      — código do ativo
 * @param events      — todos os eventos daquele ticker
 * @param quoteMap    — mapa de cotações B3 para calcular DY
 */
export function computeDividendSummary(
  ticker:   string,
  events:   B3DividendEvent[],
  quoteMap: B3QuoteMap
): DividendSummary {
  // Eventos dos últimos 12 meses (usa ex_date como referência, fallback payment_date)
  const events12m = events.filter(e =>
    isWithin12m(e.ex_date ?? e.payment_date)
  );

  const totalPerShare12m = events12m.reduce(
    (sum, e) => sum + e.amount_per_share,
    0
  );

  // Próximo evento futuro (payment_date > hoje), o mais próximo
  const futureEvents = events
    .filter(e => isFuture(e.payment_date))
    .sort((a, b) => (a.payment_date ?? "").localeCompare(b.payment_date ?? ""));

  const nextEvent = futureEvents[0] ?? null;

  // DY = totalPerShare12m / currentPrice × 100
  const currentPrice = quoteMap[ticker] ?? null;
  const dy =
    currentPrice !== null && currentPrice > 0 && totalPerShare12m > 0
      ? (totalPerShare12m / currentPrice) * 100
      : null;

  return { ticker, events12m, totalPerShare12m, nextEvent, dy };
}

/**
 * Constrói o DividendMap a partir de todos os eventos e do mapa de cotações.
 * Agrupa por ticker, computa resumo para cada um.
 */
export function buildDividendMap(
  events:   B3DividendEvent[],
  quoteMap: B3QuoteMap
): DividendMap {
  // Agrupa por ticker
  const byTicker: Record<string, B3DividendEvent[]> = {};
  for (const e of events) {
    if (!byTicker[e.ticker]) byTicker[e.ticker] = [];
    byTicker[e.ticker].push(e);
  }

  const map: DividendMap = {};
  for (const [ticker, tickerEvents] of Object.entries(byTicker)) {
    map[ticker] = computeDividendSummary(ticker, tickerEvents, quoteMap);
  }
  return map;
}

/**
 * Total de dividendos acumulados pelo usuário (por cota × quantidade).
 * @param summary  — DividendSummary do ativo
 * @param quantity — quantidade de cotas/ações do usuário
 */
export function userAccumulatedDividends(
  summary:  DividendSummary,
  quantity: number | null
): number | null {
  if (quantity === null || quantity === 0) return null;
  return summary.totalPerShare12m * quantity;
}
