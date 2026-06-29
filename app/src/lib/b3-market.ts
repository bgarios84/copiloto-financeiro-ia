/**
 * Utilitários de cotação B3 — funções puras sem "use server"
 * Sprint 7.1 — Market Data B3
 *
 * Importável em Server Components e Client Components.
 * Não acessa Supabase — recebe o quoteMap já buscado como parâmetro.
 */

import type { B3QuoteMap } from "@/types/b3-market";
import { B3_QUOTED_CLASSES } from "@/types/b3-market";
import type { InvestmentPosition } from "@/types/investment";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Verifica se a posição é elegível para cotação automática B3.
 * Requer: asset_class em B3_QUOTED_CLASSES + ticker preenchido.
 */
export function isB3Quoted(position: InvestmentPosition): boolean {
  return (
    (B3_QUOTED_CLASSES as readonly string[]).includes(position.asset_class) &&
    !!position.ticker
  );
}

/**
 * Retorna o close_price B3 para a posição, se disponível.
 * Retorna null se a posição não for elegível ou não tiver cotação no mapa.
 */
export function b3QuotePrice(
  position: InvestmentPosition,
  quoteMap: B3QuoteMap
): number | null {
  if (!isB3Quoted(position)) return null;
  return quoteMap[position.ticker!] ?? null;
}

/**
 * Retorna o current_price efetivo para exibição:
 *   1. Cotação B3 (se disponível e elegível)
 *   2. Preço manual armazenado (fallback)
 */
export function effectiveCurrentPrice(
  position: InvestmentPosition,
  quoteMap: B3QuoteMap
): number | null {
  return b3QuotePrice(position, quoteMap) ?? position.current_price;
}

/**
 * Retorna o current_value efetivo para exibição e consolidação:
 *   1. quantity × cotação B3 (se cotação disponível e quantity preenchida)
 *   2. current_value armazenado (fallback)
 */
export function effectiveCurrentValue(
  position: InvestmentPosition,
  quoteMap: B3QuoteMap
): number | null {
  const livePrice = b3QuotePrice(position, quoteMap);
  if (livePrice !== null && position.quantity !== null) {
    return position.quantity * livePrice;
  }
  return position.current_value;
}

/**
 * Indica se o valor exibido vem de cotação B3 ao vivo
 * (vs. preço manual armazenado).
 */
export function isLiveQuote(
  position: InvestmentPosition,
  quoteMap: B3QuoteMap
): boolean {
  return b3QuotePrice(position, quoteMap) !== null;
}
