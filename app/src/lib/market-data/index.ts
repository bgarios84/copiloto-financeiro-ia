/**
 * Market Data Engine — Factory
 * Sprint 7.2
 *
 * Para trocar de provider no futuro:
 *   1. Criar src/lib/market-data/yahoo.ts implementando MarketDataProvider
 *   2. Alterar MARKET_DATA_PROVIDER para "yahoo"
 *   3. Nenhuma outra alteração necessária
 */

import type { MarketDataProvider } from "./types";
import { BrapiProvider }           from "./brapi";

type ProviderName = "brapi"; // adicionar "yahoo" | "b3" conforme implementado

const MARKET_DATA_PROVIDER: ProviderName = "brapi";

export function getMarketDataProvider(): MarketDataProvider {
  switch (MARKET_DATA_PROVIDER) {
    case "brapi":
      return new BrapiProvider();
    default:
      throw new Error(`Provider desconhecido: ${MARKET_DATA_PROVIDER}`);
  }
}

export type { MarketDataProvider, QuoteResult, QuoteBatchResult, UpdateQuotesResult } from "./types";
