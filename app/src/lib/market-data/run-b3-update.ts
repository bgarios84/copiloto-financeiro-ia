/**
 * Market Data — lógica core de atualização de cotações B3
 *
 * Função pura sem "use server" e sem requireAuth().
 * Pode ser chamada por:
 *   - Server Action (após requireAuth)   → /admin/market-data
 *   - Route Handler (após CRON_SECRET)  → /api/cron/update-b3-quotes
 *
 * Usa createServiceRoleClient() para bypasasr RLS ao escrever em b3_quote.
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getMarketDataProvider }   from "@/lib/market-data/index";
import type { UpdateQuotesResult } from "@/lib/market-data/types";
import type { ServiceResult }      from "@/types/b3-market";

interface AssetRow {
  id:     string;
  ticker: string;
}

/**
 * Busca cotações externas e faz upsert em b3_quote.
 *
 * @param tickers — lista de tickers a atualizar.
 *                  Se vazio, atualiza todos os ativos ativos em b3_asset.
 */
export async function runB3Update(
  tickers: string[] = []
): Promise<ServiceResult<UpdateQuotesResult>> {
  try {
    const supabase = createServiceRoleClient();

    // 1. Resolve tickers
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

    // 2. Busca asset_id de cada ticker (FK obrigatória em b3_quote)
    const { data: assetRows, error: idErr } = await supabase
      .from("b3_asset")
      .select("id, ticker")
      .in("ticker", resolvedTickers);

    if (idErr) return { data: null, error: idErr.message };

    const assetMap: Record<string, string> = {};
    for (const row of (assetRows ?? []) as AssetRow[]) {
      assetMap[row.ticker.toUpperCase()] = row.id;
    }

    const knownTickers   = Object.keys(assetMap);
    const unknownTickers = resolvedTickers.filter(
      t => !(t.toUpperCase() in assetMap)
    );

    // 3. Chama provider de mercado
    const provider    = getMarketDataProvider();
    const batchResult = await provider.fetchQuotes(knownTickers);

    // 4. Upsert em b3_quote
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
      error: err instanceof Error ? err.message : "Erro inesperado ao atualizar cotacoes.",
    };
  }
}
