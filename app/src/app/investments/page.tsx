import type { Metadata } from "next";
import { requireAuth }                  from "@/lib/supabase/require-auth";
import { getInvestmentPositions }        from "@/services/investment";
import { getLatestRatesForBRL }          from "@/services/fx-rate";
import { getLatestB3Quotes, getDividendEventsForTickers } from "@/services/b3-market";
import { B3_QUOTED_CLASSES }             from "@/types/b3-market";
import { buildDividendMap }              from "@/lib/b3-dividend";
import { AppLayout }                     from "@/components/layout/AppLayout";
import { InvestmentsClient }             from "./InvestmentsClient";

export const metadata: Metadata = { title: "Investimentos" };

export default async function InvestmentsPage() {
  await requireAuth();

  const positionsResult = await getInvestmentPositions();
  const positions = positionsResult.data ?? [];

  // Tickers elegíveis para cotação e dividendos B3
  const tickers: string[] = [];
  const seen = new Set<string>();
  for (const p of positions) {
    if (
      (B3_QUOTED_CLASSES as readonly string[]).includes(p.asset_class) &&
      p.ticker &&
      !seen.has(p.ticker)
    ) {
      tickers.push(p.ticker);
      seen.add(p.ticker);
    }
  }

  const [ratesResult, b3QuotesResult, dividendsResult] = await Promise.all([
    getLatestRatesForBRL(),
    getLatestB3Quotes(tickers),
    getDividendEventsForTickers(tickers),
  ]);

  const b3QuoteMap = b3QuotesResult.data ?? {};
  const dividendMap = buildDividendMap(dividendsResult.data ?? [], b3QuoteMap);

  return (
    <AppLayout>
      <InvestmentsClient
        initialPositions={positions}
        initialError={positionsResult.error}
        rateMap={ratesResult.data ?? { BRL: 1 }}
        rateError={ratesResult.error}
        b3QuoteMap={b3QuoteMap}
        b3QuoteError={b3QuotesResult.error}
        dividendMap={dividendMap}
      />
    </AppLayout>
  );
}
