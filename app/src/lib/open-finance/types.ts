/**
 * Open Finance -- Provider Abstraction Types
 * Sprint 9.1C -- Provider Foundation
 * Sprint 9.8  -- OFProviderInvestment + syncInvestments
 *
 * Define a interface que qualquer provider (Pluggy, Belvo, etc.) deve implementar.
 * A camada de servico (src/services/open-finance.ts) usa apenas esta interface.
 *
 * Tipos de dominio (tabelas DB): src/types/open-finance.ts
 */

import type { OpenFinanceProviderName } from "@/types/open-finance";

// -- Tipos normalizados retornados pelo provider --------------------------------

/**
 * Conta retornada pelo provider apos sincronizacao.
 * Campos normalizados -- independentes do provider especifico.
 */
export interface OFProviderAccount {
  /** ID unico da conta no provider (ex: account_id do Pluggy). */
  externalId:      string;
  /** ISPB ou identificador da instituicao no provider. */
  institutionCode: string;
  name:            string;
  type:            "checking" | "savings" | "credit" | "investment" | "wallet";
  currency:        string;
  balance:         number;
  creditLimit?:    number;
  availableLimit?: number;
  lastFour?:       string;
  /** Payload original para auditoria. */
  rawData:         Record<string, unknown>;
}

/**
 * Transacao retornada pelo provider.
 */
export interface OFProviderTransaction {
  externalId:        string;
  accountExternalId: string;
  /** Data no formato YYYY-MM-DD. */
  date:              string;
  /** Valor absoluto (sempre positivo). */
  amount:            number;
  type:              "debit" | "credit";
  description:       string;
  category?:         string;
  status:            "pending" | "posted";
  rawData:           Record<string, unknown>;
}

/**
 * Posicao de investimento retornada pelo provider apos sincronizacao.
 * Sprint 9.8 -- Investment Sync
 */
export interface OFProviderInvestment {
  /** ID unico do investimento no provider. */
  externalId:       string;
  /** Nome do ativo (ex: "VALE3", "CDB Banco XYZ 120% CDI"). */
  name:             string;
  /** Codigo do ativo / ticker. Pode ser null para renda fixa. */
  code:             string | null;
  /** Tipo bruto do provider (ex: "EQUITY", "MUTUAL_FUND", "FIXED_INCOME"). */
  type:             string;
  /** Codigo da moeda (ex: "BRL", "USD"). */
  currency:         string;
  /** Valor atual total da posicao. */
  currentValue:     number | null;
  /** Valor de aquisicao total (custo). */
  acquisitionValue: number | null;
  /** Quantidade de cotas/acoes. */
  quantity:         number | null;
  /** Taxa anual (percentual). */
  annualRate:       number | null;
  /** Rentabilidade do ultimo mes. */
  lastMonthRate:    number | null;
  /** Payload original para auditoria. */
  rawData:          Record<string, unknown>;
}

/** Status de uma conexao retornado pelo provider. */
export interface OFConnectionInfo {
  providerItemId:  string;
  status:          "connected" | "expired" | "error" | "pending_user_action";
  institutionCode: string | null;
  errorMessage?:   string;
  lastUpdated:     string;
}

/** Resumo de uma operacao de sincronizacao. */
export interface OFSyncResult {
  accountsSynced:          number;
  transactionsCreated:     number;
  transactionsUpdated:     number;
  transactionsSkipped:     number;
  /** Sprint 9.6 -- pares identificados pela reconciliacao automatica */
  transactionsReconciled?: number;
  errors:                  string[];
  syncedAt:                string;
}

/**
 * Evento de webhook normalizado.
 */
export interface OFProviderWebhookEvent {
  eventType:      string;
  providerItemId: string;
  payload:        Record<string, unknown>;
  receivedAt:     string;
}

// -- Interface do provider -----------------------------------------------------

/**
 * Contrato que qualquer implementacao de provider deve satisfazer.
 */
export interface OpenFinanceProvider {
  readonly name: OpenFinanceProviderName;

  createConnectToken(userId: string): Promise<{ connectToken: string; expiresAt: string }>;

  getConnection(providerItemId: string): Promise<OFConnectionInfo>;

  disconnect(providerItemId: string): Promise<void>;

  syncAccounts(providerItemId: string): Promise<OFProviderAccount[]>;

  syncTransactions(
    providerAccountId: string,
    from: string,
    to:   string,
  ): Promise<OFProviderTransaction[]>;

  /** Sprint 9.8 -- Retorna posicoes de investimento do provider item. */
  syncInvestments(providerItemId: string): Promise<OFProviderInvestment[]>;

  refreshConnection(providerItemId: string): Promise<{ connectToken: string; expiresAt: string }>;

  handleWebhook(rawBody: Buffer | string, signature: string): Promise<OFProviderWebhookEvent>;
}

// -- Erros ---------------------------------------------------------------------

export type OFErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "TOKEN_EXPIRED"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMIT"
  | "ACCOUNT_NOT_FOUND"
  | "INVALID_SIGNATURE"
  | "NETWORK_TIMEOUT"
  | "DATA_VALIDATION"
  | "NOT_IMPLEMENTED"
  | "PROVIDER_NOT_SUPPORTED";

export class OFError extends Error {
  constructor(
    public readonly code: OFErrorCode,
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "OFError";
  }
}

export class OFNotImplementedError extends OFError {
  constructor(method: string) {
    super(
      "NOT_IMPLEMENTED",
      `Provider method '${method}' nao implementado.`,
      false,
    );
    this.name = "OFNotImplementedError";
  }
}
