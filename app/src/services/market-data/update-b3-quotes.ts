"use server";

/**
 * Server Action -- Atualizacao de Cotacoes B3
 * Sprint 7.2 / 7.3
 *
 * Delega para runB3Update() apos validar sessao do usuario.
 * Para execucao via cron, usar /api/cron/update-b3-quotes.
 */

import { requireAuth } from "@/lib/supabase/require-auth";
import { runB3Update } from "@/lib/market-data/run-b3-update";
import type { UpdateQuotesResult } from "@/lib/market-data/types";
import type { ServiceResult }      from "@/types/b3-market";

export async function updateB3Quotes(
  tickers: string[] = []
): Promise<ServiceResult<UpdateQuotesResult>> {
  try {
    await requireAuth();
    return runB3Update(tickers);
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Erro de autenticacao.",
    };
  }
}
