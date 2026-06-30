/**
 * Open Finance — Pluggy Provider Implementation
 * Sprint 9.1 — Open Finance Foundation
 *
 * Implementa OpenFinanceProvider usando a API REST do Pluggy.
 * Documentacao: https://docs.pluggy.ai
 *
 * SEGURANCA:
 *   - PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET sao server-only (sem NEXT_PUBLIC_).
 *   - O API key do Pluggy (vida 2h) e obtido fresh a cada operacao — nunca persiste.
 *   - O Connect Token (vida ~30min) e repassado ao frontend widget e nunca armazenado.
 *   - Apenas o item_id (referencia nao-sensivel) e armazenado no banco.
 *
 * STUBS neste sprint:
 *   - syncTransactions: retorna [] (implementado no Sprint 9.2)
 *   - handleWebhook:    retorna estrutura sem validar assinatura (Sprint 9.3)
 */

import type {
  OpenFinanceProvider,
  OFProviderAccount,
  OFProviderTransaction,
  OFProviderWebhookEvent,
  OFConnectionInfo,
  OFAccountType,
} from "./types";
import { OFError, OFNotImplementedError } from "./types";

// ── Tipos internos da API do Pluggy ──────────────────────────────────────────

interface PluggyAuthResponse {
  apiKey: string;
}

interface PluggyConnectTokenResponse {
  accessToken: string;
}

interface PluggyItemResponse {
  id:                string;
  status:            string;    // "UPDATED" | "UPDATING" | "LOGIN_ERROR" | "WAITING_USER_INPUT" | ...
  connector:         { primaryColor: string; name: string; institutionCode?: string };
  error?:            { code: string; message: string };
  lastUpdatedAt:     string | null;
  executionStatus:   string;
}

interface PluggyAccountResponse {
  id:             string;
  itemId:         string;
  name:           string;
  type:           string;     // "BANK" | "CREDIT"
  subtype:        string;     // "CHECKING_ACCOUNT" | "SAVINGS_ACCOUNT" | "CREDIT_CARD" | ...
  currencyCode:   string;
  balance:        number;
  creditData?:    {
    creditLimit:    number;
    availableCreditLimit: number;
    brand?:         string;
    balanceCloseDate?: string;
  };
  number?:        string;     // ultimos 4 digitos
}

interface PluggyAccountsResponse {
  total:   number;
  results: PluggyAccountResponse[];
}

// ── Mapeamento de status ──────────────────────────────────────────────────────

function mapPluggyStatus(
  executionStatus: string,
): OFConnectionInfo["status"] {
  switch (executionStatus) {
    case "SUCCESS":
    case "PARTIAL_SUCCESS":
      return "connected";
    case "ERROR":
    case "ITEM_ERROR":
      return "error";
    case "LOGIN_ERROR":
    case "INVALID_CREDENTIALS":
      return "pending_user_action";
    case "WAITING_USER_INPUT":
    case "CREATING":
    case "MERGING":
    case "UPDATING":
      return "connected"; // transiente — tratar como conectado
    default:
      return "error";
  }
}

function mapPluggyAccountType(
  type: string,
  subtype: string,
): OFAccountType {
  if (type === "CREDIT") return "credit";
  switch (subtype) {
    case "SAVINGS_ACCOUNT": return "savings";
    case "CHECKING_ACCOUNT": return "checking";
    default:                 return "checking";
  }
}

// ── PluggyProvider ────────────────────────────────────────────────────────────

export class PluggyProvider implements OpenFinanceProvider {
  readonly name = "pluggy" as const;

  private readonly baseUrl = "https://api.pluggy.ai";
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    const clientId     = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new OFError(
        "PROVIDER_UNAVAILABLE",
        "PLUGGY_CLIENT_ID ou PLUGGY_CLIENT_SECRET nao configurados. " +
        "Adicione as variaveis de ambiente no servidor (nunca NEXT_PUBLIC_).",
        false,
      );
    }

    this.clientId     = clientId;
    this.clientSecret = clientSecret;
  }

  // ── Autenticacao (interno) ──────────────────────────────────────────────────

  /**
   * Obtem um API key do Pluggy (vida util: 2h).
   * Chamado internamente antes de cada operacao — nunca armazenado.
   */
  private async authenticate(): Promise<string> {
    const response = await this.fetch<PluggyAuthResponse>("/auth", {
      method: "POST",
      body: JSON.stringify({
        clientId:     this.clientId,
        clientSecret: this.clientSecret,
      }),
      skipAuth: true,
    });
    return response.apiKey;
  }

  // ── Metodo utilitario de fetch ──────────────────────────────────────────────

  private async fetch<T>(
    path:    string,
    options: RequestInit & { skipAuth?: boolean; apiKey?: string } = {},
  ): Promise<T> {
    const { skipAuth = false, apiKey, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(fetchOptions.headers as Record<string, string> | undefined),
    };

    if (!skipAuth && apiKey) {
      headers["X-API-KEY"] = apiKey;
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...fetchOptions,
        headers,
      });
    } catch (err) {
      throw new OFError(
        "NETWORK_TIMEOUT",
        `Erro de rede ao conectar com Pluggy: ${String(err)}`,
        true,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new OFError("TOKEN_EXPIRED", "API key do Pluggy expirado ou invalido.", false);
    }

    if (response.status === 429) {
      throw new OFError("RATE_LIMIT", "Rate limit do Pluggy atingido.", true);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new OFError(
        "PROVIDER_UNAVAILABLE",
        `Pluggy retornou ${response.status}: ${body}`,
        response.status >= 500,
      );
    }

    return response.json() as Promise<T>;
  }

  // ── createConnectToken ──────────────────────────────────────────────────────

  async createConnectToken(
    _userId: string,
  ): Promise<{ connectToken: string; expiresAt: string }> {
    const apiKey = await this.authenticate();

    const result = await this.fetch<PluggyConnectTokenResponse>("/connect_token", {
      method: "POST",
      body:   JSON.stringify({}),
      apiKey,
    });

    // O Connect Token do Pluggy expira em ~30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return { connectToken: result.accessToken, expiresAt };
  }

  // ── getConnection ───────────────────────────────────────────────────────────

  async getConnection(providerItemId: string): Promise<OFConnectionInfo> {
    const apiKey = await this.authenticate();

    const item = await this.fetch<PluggyItemResponse>(
      `/items/${providerItemId}`,
      { apiKey },
    );

    return {
      providerItemId:  item.id,
      status:          mapPluggyStatus(item.executionStatus),
      institutionCode: item.connector.institutionCode ?? null,
      errorMessage:    item.error?.message,
      lastUpdated:     item.lastUpdatedAt ?? new Date().toISOString(),
    };
  }

  // ── disconnect ──────────────────────────────────────────────────────────────

  async disconnect(providerItemId: string): Promise<void> {
    const apiKey = await this.authenticate();

    await this.fetch<void>(`/items/${providerItemId}`, {
      method: "DELETE",
      apiKey,
    });
  }

  // ── syncAccounts ────────────────────────────────────────────────────────────

  async syncAccounts(providerItemId: string): Promise<OFProviderAccount[]> {
    const apiKey = await this.authenticate();

    const result = await this.fetch<PluggyAccountsResponse>(
      `/accounts?itemId=${providerItemId}`,
      { apiKey },
    );

    return result.results.map((account): OFProviderAccount => ({
      externalId:      account.id,
      institutionCode: "", // preenchido pelo caller via getConnection
      name:            account.name,
      type:            mapPluggyAccountType(account.type, account.subtype),
      currency:        account.currencyCode,
      balance:         account.balance,
      creditLimit:     account.creditData?.creditLimit,
      availableLimit:  account.creditData?.availableCreditLimit,
      lastFour:        account.number ?? undefined,
      rawData:         account as unknown as Record<string, unknown>,
    }));
  }

  // ── syncTransactions ────────────────────────────────────────────────────────
  // STUB — Sprint 9.1. Implementacao completa no Sprint 9.2.

  async syncTransactions(
    _providerAccountId: string,
    _from: string,
    _to:   string,
  ): Promise<OFProviderTransaction[]> {
    // Stub intencional: sincronizacao de transacoes sera implementada no Sprint 9.2.
    // Retorna array vazio para que o caller possa tratar sem erro.
    return [];
  }

  // ── refreshConnection ───────────────────────────────────────────────────────

  async refreshConnection(
    providerItemId: string,
  ): Promise<{ connectToken: string; expiresAt: string }> {
    const apiKey = await this.authenticate();

    // No Pluggy, reautorizacao de item existente usa o mesmo endpoint de connect_token
    // com o itemId como parametro — o widget vai reautorizar a conexao existente.
    const result = await this.fetch<PluggyConnectTokenResponse>("/connect_token", {
      method: "POST",
      body:   JSON.stringify({ itemId: providerItemId }),
      apiKey,
    });

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return { connectToken: result.accessToken, expiresAt };
  }

  // ── handleWebhook ───────────────────────────────────────────────────────────
  // STUB — Sprint 9.1. Validacao HMAC e processamento no Sprint 9.3.

  async handleWebhook(
    rawBody:   Buffer | string,
    _signature: string,
  ): Promise<OFProviderWebhookEvent> {
    // Stub intencional: validacao de assinatura e processamento de eventos
    // sera implementada no Sprint 9.3.
    // Por enquanto, apenas parseia o payload para persistir na fila.

    let payload: Record<string, unknown>;
    try {
      const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
      payload = JSON.parse(bodyStr) as Record<string, unknown>;
    } catch {
      throw new OFError("DATA_VALIDATION", "Webhook payload nao e JSON valido.", false);
    }

    const eventType      = String(payload.event      ?? "unknown");
    const providerItemId = String(payload.itemId ?? payload.id ?? "");

    return {
      eventType,
      providerItemId,
      payload,
      receivedAt: new Date().toISOString(),
    };
  }
}
