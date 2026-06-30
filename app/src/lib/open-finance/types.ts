/**
 * Open Finance — Provider Abstraction Types
 * Sprint 9.1 — Open Finance Foundation
 *
 * Define a interface que qualquer provider (Pluggy, Belvo, etc.) deve implementar.
 * A camada de servico (src/services/open-finance.ts) usa apenas esta interface —
 * nunca importa o provider diretamente.
 */

// ── Tipos retornados pelo provider ────────────────────────────────────────────

export type OFAccountType =
  | "checking"
  | "savings"
  | "credit"
  | "investment"
  | "wallet";

/**
 * Conta retornada pelo provider apos sincronizacao.
 * Campos normalizados — independentes do provider especifico.
 */
export interface OFProviderAccount {
  /** ID unico da conta no provider (ex: account_id do Pluggy). */
  externalId:      string;
  /** ISPB ou ID interno do provider para a instituicao. */
  institutionCode: string;
  name:            string;
  type:            OFAccountType;
  currency:        string;
  /** Saldo atual da conta. Sempre positivo; tipo determina debito/credito. */
  balance:         number;
  creditLimit?:    number;
  availableLimit?: number;
  lastFour?:       string;
  /** Payload original do provider para auditoria. */
  rawData:         Record<string, unknown>;
}

/**
 * Transacao retornada pelo provider.
 * Stub no Sprint 9.1 — implementacao completa no Sprint 9.2.
 */
export interface OFProviderTransaction {
  /** ID unico da transacao no provider. */
  externalId:        string;
  /** Conta de origem (provider_account_id). */
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

/** Resumo de uma operacao de sincronizacao. */
export interface OFSyncResult {
  accountsSynced:      number;
  transactionsCreated: number;
  transactionsUpdated: number;
  transactionsSkipped: number;
  errors:              string[];
  syncedAt:            string;   // ISO timestamp
}

/**
 * Evento de webhook normalizado.
 * Stub no Sprint 9.1 — implementacao completa no Sprint 9.3.
 */
export interface OFProviderWebhookEvent {
  eventType:       string;
  providerItemId:  string;
  payload:         Record<string, unknown>;
  receivedAt:      string;   // ISO timestamp
}

/** Status de uma conexao retornado pelo provider. */
export interface OFConnectionInfo {
  providerItemId:   string;
  status:           "connected" | "expired" | "error" | "pending_user_action";
  institutionCode:  string | null;
  errorMessage?:    string;
  lastUpdated:      string;   // ISO timestamp
}

// ── Interface do provider ─────────────────────────────────────────────────────

/**
 * Contrato que qualquer implementacao de provider Open Finance deve satisfazer.
 *
 * Regras:
 * - Nunca expor secrets no retorno dos metodos.
 * - Nunca armazenar credenciais — apenas referencias (item_id).
 * - Metodos com stub no Sprint 9.1 lancam OFNotImplementedError.
 */
export interface OpenFinanceProvider {
  readonly name: OFProvider;

  /**
   * Gera um Connect Token de curta duracao (~30min) para o widget do provider.
   * O token e passado para o frontend e nunca persiste no banco.
   *
   * @param userId - ID do usuario autenticado (para associar a conexao)
   * @returns connectToken (para o widget) + expiresAt
   */
  createConnectToken(userId: string): Promise<{
    connectToken: string;
    expiresAt:    string;
  }>;

  /**
   * Busca o status atual de uma conexao no provider.
   *
   * @param providerItemId - item_id armazenado em open_finance_connection
   */
  getConnection(providerItemId: string): Promise<OFConnectionInfo>;

  /**
   * Encerra a conexao e revoga o consentimento no provider.
   * Deve ser chamado antes de deletar o registro local.
   *
   * @param providerItemId - item_id da conexao a encerrar
   */
  disconnect(providerItemId: string): Promise<void>;

  /**
   * Busca contas associadas a uma conexao.
   *
   * @param providerItemId - item_id da conexao
   */
  syncAccounts(providerItemId: string): Promise<OFProviderAccount[]>;

  /**
   * Busca transacoes de uma conta num periodo.
   * STUB no Sprint 9.1 — retorna array vazio.
   *
   * @param providerAccountId - account_id da conta no provider
   * @param from - data inicio (YYYY-MM-DD)
   * @param to   - data fim (YYYY-MM-DD)
   */
  syncTransactions(
    providerAccountId: string,
    from: string,
    to:   string,
  ): Promise<OFProviderTransaction[]>;

  /**
   * Cria novo Connect Token para conexao existente (reautorizacao).
   * Usado quando status = 'expired' | 'pending_user_action'.
   *
   * @param providerItemId - item_id da conexao a reautorizar
   */
  refreshConnection(providerItemId: string): Promise<{
    connectToken: string;
    expiresAt:    string;
  }>;

  /**
   * Valida a assinatura e parseia um evento de webhook recebido.
   * STUB no Sprint 9.1 — retorna o payload sem processamento.
   *
   * @param rawBody  - corpo bruto da requisicao (Buffer ou string)
   * @param signature - header de assinatura enviado pelo provider
   */
  handleWebhook(
    rawBody:   Buffer | string,
    signature: string,
  ): Promise<OFProviderWebhookEvent>;
}

// ── Erros ─────────────────────────────────────────────────────────────────────

export type OFProvider = "pluggy" | "belvo";

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

export class OFNotImplementedError extends OFError {
  constructor(method: string) {
    super("NOT_IMPLEMENTED", `${method} nao implementado neste sprint.`, false);
    this.name = "OFNotImplementedError";
  }
}
