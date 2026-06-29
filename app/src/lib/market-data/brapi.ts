/**
 * Market Data Provider -- brapi.dev (v2)
 * Sprint 7.2
 *
 * Plano basico: 1 ativo por request (BATCH_SIZE = 1).
 * Alterar BATCH_SIZE se o plano permitir mais.
 *
 * Sem API key: funciona apenas para PETR4, MGLU3, VALE3, ITUB4.
 * Com API key: todos os ativos B3. Configurar BRAPI_API_KEY no .env.local.
 */

import type { MarketDataProvider, QuoteBatchResult, QuoteResult } from "./types";

// Plano basico brapi: 1 ativo por request.
// Alterar para valor maior se o plano permitir.
const BATCH_SIZE = 1;

export const BRAPI_FREE_TICKERS = ["PETR4", "MGLU3", "VALE3", "ITUB4"] as const;

interface BrapiV2QuoteData {
  currency:           string;
  regularMarketPrice: number;
  regularMarketTime?: string;
  shortName?:         string;
  longName?:          string;
}

interface BrapiV2QuoteItem {
  requestedSymbol: string;
  symbol:          string;
  changed:         boolean;
  data:            BrapiV2QuoteData | null;
}

interface BrapiV2Response {
  results?:     BrapiV2QuoteItem[];
  error?:       boolean | string;
  message?:     string;
  code?:        string;
  requestedAt?: string;
}

export class BrapiProvider implements MarketDataProvider {
  readonly name = "brapi";

  private readonly apiKey: string | null;
  private readonly baseUrl = "https://brapi.dev/api/v2";

  constructor() {
    this.apiKey = process.env.BRAPI_API_KEY ?? null;
  }

  async fetchQuotes(tickers: string[]): Promise<QuoteBatchResult> {
    const quotes:  QuoteResult[] = [];
    const failed:  string[]      = [];
    const errors:  string[]      = [];

    // Loop sequencial: respeita BATCH_SIZE (= 1 no plano basico)
    for (let i = 0; i < tickers.length; i += BATCH_SIZE) {
      const batch  = tickers.slice(i, i + BATCH_SIZE);
      const result = await this.fetchBatch(batch);
      quotes.push(...result.quotes);
      failed.push(...result.failed);
      errors.push(...result.errors);
    }

    return { quotes, failed, errors };
  }

  private async fetchBatch(tickers: string[]): Promise<QuoteBatchResult> {
    const url   = this.buildUrl(tickers);
    const today = new Date().toISOString().slice(0, 10);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.apiKey) {
      headers["Authorization"] = "Bearer " + this.apiKey;
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[brapi] GET", url, "| auth:", this.apiKey ? "Bearer ***" + this.apiKey.slice(-4) : "none");
    }

    let response: Response;
    try {
      response = await fetch(url, { cache: "no-store", headers });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { quotes: [], failed: tickers, errors: ["Falha na conexao com brapi: " + msg] };
    }

    let rawBody: string;
    try {
      rawBody = await response.text();
    } catch {
      rawBody = "";
    }

    if (response.status === 401) {
      const free = (BRAPI_FREE_TICKERS as readonly string[]);
      const paid = tickers.filter(t => !free.includes(t.toUpperCase()));
      const msg = paid.length > 0
        ? "brapi: tickers " + paid.join(", ") + " requerem BRAPI_API_KEY."
        : "brapi: autenticacao invalida. Verifique BRAPI_API_KEY.";
      return { quotes: [], failed: tickers, errors: [msg] };
    }

    if (!response.ok) {
      let errorMsg = "brapi HTTP " + response.status + ": " + response.statusText;
      try {
        const errJson = JSON.parse(rawBody) as { message?: string; code?: string };
        if (errJson.message) errorMsg += " | " + errJson.message;
        if (errJson.code)    errorMsg += " (code: " + errJson.code + ")";
      } catch { /* ignore */ }
      return { quotes: [], failed: tickers, errors: [errorMsg] };
    }

    let body: BrapiV2Response;
    try {
      body = JSON.parse(rawBody) as BrapiV2Response;
    } catch {
      return { quotes: [], failed: tickers, errors: ["brapi JSON invalido: " + rawBody.slice(0, 200)] };
    }

    if (body.error || !body.results) {
      return { quotes: [], failed: tickers, errors: [body.message ?? "Resposta inesperada da brapi."] };
    }

    const returnedSymbols = new Set(body.results.map(r => r.symbol.toUpperCase()));
    const notFound = tickers.filter(t => !returnedSymbols.has(t.toUpperCase()));

    const quotes: QuoteResult[] = body.results
      .filter(r => r.data !== null && r.data!.regularMarketPrice > 0)
      .map(r => ({
        ticker:    r.symbol.toUpperCase(),
        price:     r.data!.regularMarketPrice,
        currency:  r.data!.currency ?? "BRL",
        quoteDate: today,
        source:    "brapi" as const,
      }));

    const errs: string[] = notFound.length > 0
      ? ["Tickers nao encontrados na brapi: " + notFound.join(", ")]
      : [];

    return { quotes, failed: notFound, errors: errs };
  }

  private buildUrl(tickers: string[]): string {
    return this.baseUrl + "/stocks/quote?symbols=" + tickers.join(",");
  }
}
