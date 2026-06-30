/**
 * Open Finance — Provider Abstraction Types
 * Sprint 9.1C — Provider Foundation
 *
 * Define a interface que qualquer provider (Pluggy, Belvo, etc.) deve implementar.
 * A camada de servico (src/services/open-finance.ts) usa apenas esta interface.
 *
 * Tipos de dominio (tabelas DB): src/types/open-finance.ts
 */

import type { OpenFinanceProviderName } from "@/types/open-finance";

// ── Tipos normalizados retornados pelo provider ────────────────────────────────

/**
 * Conta retornada pelo provider apos sincronizacao.
 * Campos normalizados — independentes do provider especifico.
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
 * Stub no Sprint 9.1C — implementacao completa no Sprint 9.2.
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

/** Status de uma conexao retornado pelo provider. */
export interface OFConnectionInfo {
  providerItemId:  string;
  status:          "connected" | "expired" | "error" | "pending_user_action";
  institutionCode: string | null;
  errorMessage?:   string;
  lastUpdated:     string;   // ISO timestamp
}

/** Resumo de uma operacao de sincronizacao. */
export interface OFSyncResult {
  accountsSynced:      number;
  transactionsCreated: number;
  transactionsUpdated: number;
  transactionsSkipped: number;
  errors:              string[];
  syncedAt:            string;
}

/**
 * Evento de webhook normalizado.
 * Stub no Sprint 9.1C — processamento completo no Sprint 9.3.
 */
export interface OFProviderWebhookEvent {
  eventType:      string;
  providerItemId: string;
  payload:        Record<string, unknown>;
  receivedAt:     string;
}

// ── Interface do provider ─────────────────────────────────────────────────────

/**
 * Contrato que qualquer implementacao de provider deve satisfazer.
 * A camada de servico usa apenas esta interface — nunca importa o provider diretamente.
 */
export interface OpenFinanceProvider {
  readonly name: OpenFinanceProviderName;

  /**
   * Gera um Connect Token de curta duracao (~30min) para o widget do provider.
   * Nunca persiste no banco — passado ao frontend apenas para o widget.
   */
  createConnectToken(userId: string): Promise<{ connectToken: string; expiresAt: string }>;

  /**
   * Busca o status atual de uma conexao no provider.
   */
  getConnection(providerItemId: string): Promise<OFConnectionInfo>;

  /**
   * Encerra a conexao e revoga o consentimento no provider.
   */
  disconnect(providerItemId: string): Promise<void>;

  /**
   * Busca e normaliza as contas de uma conexao.
   */
  syncAccounts(providerItemId: string): Promise<OFProviderAccount[]>;

  /**
   * Busca transacoes de uma conta num periodo.
   * STUB no Sprint 9.1C — retorna [] sem chamada real ao provider.
   */
  syncTransactions(
    providerAccountId: string,
    from: string,
    to:   string,
  ): Promise<OFProviderTransaction[]>;

  /**
   * Cria Connect Token para conexao existente (reautorizacao de sessao expirada).
   */
  refreshConnection(providerItemId: string): Promise<{ connectToken: string; expiresAt: string }>;

  /**
   * Parseia e valida evento de webhook recebido do provider.
   * STUB no Sprint 9.1C — validacao HMAC implementada no Sprint 9.3.
   */
  handleWebhook(rawBody: Buffer | string, signature: string): Promise<OFProviderWebhookEvent>;
}

// ── Erros ─────────────────────────────────────────────────────────────────────

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
    super("NOT_IMPLEMENTED", `${method}: nao implementado neste sprint.`, false);
    this.name = "OFNotImplementedError";
  }
}
