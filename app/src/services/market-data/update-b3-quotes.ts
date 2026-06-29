"use server";

/**
 * Service — Atualização de Cotações B3
 * Sprint 7.2
 *
 * Fluxo:
 *   1. requireAuth() — apenas usuários autenticados podem disparar
 *   2. Busca asset_ids de b3_asset para os tickers solicitados
 *   3. Chama o provider de mercado (brapi por padrão)
 *   4. Upsert em b3_quote via service_role client (bypassa RLS)
 *   5. Retorna ServiceResult com estatísticas da atualização
 *
 * Segurança:
 *   - BRAPI_API_KEY: lida server-side, nunca exposta ao browser
 *   - SUPABASE_SERVICE_ROLE_KEY: necessária para write em b3_quote
 */

import { requireAuth }            from "@/lib/supabase/require-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getMarketDataProvider }  from "@/lib/market-data";
import type { UpdateQuotesResult } from "@/lib/market-data";
import type { ServiceResult }     from "@/types/b3-market";

// ── Tipo do registro em b3_asset ──────────────────────────────────────────────

interface AssetRow {
  id:     string;
  ticker: string;
}

// ── Action principal ──────────────────────────────────────────────────────────

/**
 * Atualiza cotações B3 para os tickers fornecidos.
 *
 * @param tickers — lista de tickers (ex: ["PETR4", "XPML11"])
 *                  se vazio, busca todos os ativos ativos em b3_asset
 */
export async function updateB3Quotes(
  tickers: string[] = []
): Promise<ServiceResult<UpdateQuotesResult>> {
  try {
    await requireAuth();
    const supabase = createServiceRoleClient();

    // 1. Resolve tickers: usa os fornecidos ou busca todos ativos
    let resolvedTickers = tickers;
    if (resolvedTickers.length === 0) {
      const { data: assets, error: assetErr } = await supabase
        .from("b3_asset")
        .select("ticker")
        .eq("is_active", true);

      if (assetErr) return { data: null, error: assetErr.message };
      resolvedTickers = (assets ?? []).map((a: { ticker: string }) => a.ticker);
    }

    if (resolvedTickers.length === 0) {
      return {
        data: {
          provider:  "brapi",
          updated:   0,
          failed:    [],
          errors:    ["Nenhum ativo B3 cadastrado para atualizar."],
          updatedAt: new Date().toISOString(),
        },
        error: null,
      };
    }

    // 2. Busca asset_id para cada ticker (necessário para FK em b3_quote)
    const { data: assetRows, error: idErr } = await supabase
      .from("b3_asset")
      .select("id, ticker")
      .in("ticker", resolvedTickers);

    if (idErr) return { data: null, error: idErr.message };

    const assetMap: Record<string, string> = {};
    for (const row of (assetRows ?? []) as AssetRow[]) {
      assetMap[row.ticker.toUpperCase()] = row.id;
    }

    // Tickers sem cadastro em b3_asset não podem ser inseridos
    const knownTickers    = Object.keys(assetMap);
    const unknownTickers  = resolvedTickers.filter(
      t => !(t.toUpperCase() in assetMap)
    );

    // 3. Chama provider de mercado
    const provider = getMarketDataProvider();
    const batchResult = await provider.fetchQuotes(knownTickers);

    // 4. Upsert em b3_quote (ON CONFLICT ticker, quote_date → update price)
    const today = new Date().toISOString().slice(0, 10);
    let updated = 0;
    const upsertErrors: string[] = [...batchResult.errors];

    for (const quote of batchResult.quotes) {
      const assetId = assetMap[quote.ticker.toUpperCase()];
      if (!assetId) continue;

      const { error: upsertErr } = await supabase
        .from("b3_quote")
        .upsert(
          {
            asset_id:    assetId,
            ticker:      quote.ticker.toUpperCase(),
            close_price: quote.price,
            quote_date:  quote.quoteDate ?? today,
            source:      "brapi",
          },
          { onConflict: "ticker,quote_date" }
        );

      if (upsertErr) {
        upsertErrors.push(`${quote.ticker}: ${upsertErr.message}`);
        batchResult.failed.push(quote.ticker);
      } else {
        updated++;
      }
    }

    return {
      data: {
        provider:  provider.name,
        updated,
        failed:    [...batchResult.failed, ...unknownTickers],
        errors:    upsertErrors,
        updatedAt: new Date().toISOString(),
      },
      error: null,
    };
  } catch (err) {
    return {
      data:  null,
      error: err instanceof Error ? err.message : "Erro inesperado ao atualizar cotações.",
    };
  }
}
