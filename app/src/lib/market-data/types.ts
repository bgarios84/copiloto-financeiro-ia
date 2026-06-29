/**
 * Market Data Engine — Tipos e Interfaces
 * Sprint 7.2
 *
 * Interface desacoplada de provider: permite trocar brapi → yahoo → B3 direto
 * sem alterar a camada de serviço ou UI.
 */

// ── Resultado de uma cotação individual ───────────────────────────────────────

export interface QuoteResult {
  ticker:      string;
  price:       number;       // preço de fechamento / último negócio
  currency:    string;       // ex: "BRL"
  quoteDate:   string;       // ISO date: "2025-08-01"
  source:      QuoteSource;
}

export type QuoteSource = "brapi" | "b3" | "yahoo" | "manual" | "seed";

// ── Resultado de um batch de cotações ────────────────────────────────────────

export interface QuoteBatchResult {
  quotes:  QuoteResult[];
  failed:  string[];         // tickers que não retornaram cotação
  errors:  string[];         // mensagens de erro por falha
}

// ── Interface do provider — implementar para cada fonte ───────────────────────

export interface MarketDataProvider {
  /** Nome do provider para logging e auditoria */
  readonly name: string;

  /**
   * Busca cotações para os tickers fornecidos.
   * Implementações devem tratar rate-limits internamente (batch, retry, etc.).
   * @param tickers — ex: ["PETR4", "XPML11", "BBAS3"]
   */
  fetchQuotes(tickers: string[]): Promise<QuoteBatchResult>;
}

// ── Resultado do serviço de atualização ──────────────────────────────────────

export interface UpdateQuotesResult {
  provider:  string;
  updated:   number;
  failed:    string[];
  errors:    string[];
  updatedAt: string;         // ISO datetime
}
