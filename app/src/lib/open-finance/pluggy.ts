/**
 * Open Finance — Pluggy Provider Implementation
 * Sprint 9.1C — Provider Foundation
 *
 * Implementa OpenFinanceProvider usando a API REST do Pluggy.
 * Referencia: https://docs.pluggy.ai
 *
 * SEGURANCA:
 *   - Credenciais lidas via getPluggyEnv() — nunca process.env direto no provider.
 *   - API key do Pluggy (TTL 2h) obtido fresh a cada operacao — nunca persiste.
 *   - Connect Token (TTL ~30min) repassado ao widget, nunca armazenado no banco.
 *   - Apenas provider_item_id (referencia nao-sensivel) e salvo no banco.
 *
 * STUBS neste sprint:
 *   - syncTransactions: retorna [] — implementado no Sprint 9.2.
 *   - handleWebhook: parseia payload sem validar HMAC — implementado no Sprint 9.3.
 */

import type {
  OpenFinanceProvider,
  OFProviderAccount,
  OFProviderTransaction,
  OFProviderWebhookEvent,
  OFConnectionInfo,
} from "./types";
import { OFError } from "./types";
import { getPluggyEnv } from "./env";

// ── Tipos internos da API REST do Pluggy ──────────────────────────────────────

interface PluggyAuthResponse {
  apiKey: string;
}

interface PluggyConnectTokenResponse {
  accessToken: string;
}

interface PluggyItemResponse {
  id:              string;
  executionStatus: string;
  connector:       { institutionCode?: string };
  error?:          { code: string; message: string };
  lastUpdatedAt:   string | null;
}

interface PluggyAccountResponse {
  id:          string;
  name:        string;
  type:        string;      // "BANK" | "CREDIT"
  subtype:     string;      // "CHECKING_ACCOUNT" | "SAVINGS_ACCOUNT" | ...
  currencyCode: string;
  balance:     number;
  creditData?: {
    creditLimit:             number;
    availableCreditLimit:    number;
  };
  number?:     string;
}

interface PluggyAccountsResponse {
  total:   number;
  results: PluggyAccountResponse[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapExecutionStatus(s: string): OFConnectionInfo["status"] {
  switch (s) {
    case "SUCCESS":
    case "PARTIAL_SUCCESS":
      return "connected";
    case "LOGIN_ERROR":
    case "INVALID_CREDENTIALS":
      return "pending_user_action";
    case "WAITING_USER_INPUT":
      return "pending_user_action";
    case "ERROR":
    case "ITEM_ERROR":
      return "error";
    default:
      return "connected";
  }
}

function mapAccountType(
  type: string,
  subtype: string,
): OFProviderAccount["type"] {
  if (type === "CREDIT") return "credit";
  if (subtype === "SAVINGS_ACCOUNT") return "savings";
  return "checking";
}

// ── PluggyProvider ────────────────────────────────────────────────────────────

export class PluggyProvider implements OpenFinanceProvider {
  readonly name = "pluggy" as const;

  private readonly baseUrl = "https://api.pluggy.ai";
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor() {
    // Fail-fast: lanca erro descritivo se variaveis nao estiverem configuradas.
    const env = getPluggyEnv();
    this.clientId     = env.clientId;
    this.clientSecret = env.clientSecret;
  }

  // ── Autenticacao (privado) ────────────────────────────────────────────────

  /**
   * Obtem API key do Pluggy (TTL 2h).
   * Sempre fresh — nunca armazenado em banco ou cache persistente.
   */
  private async authenticate(): Promise<string> {
    const res = await this.request<PluggyAuthResponse>("/auth", {
      method: "POST",
      body:   JSON.stringify({ clientId: this.clientId, clientSecret: this.clientSecret }),
      auth:   false,
    });
    return res.apiKey;
  }

  // ── Fetch utilitario ──────────────────────────────────────────────────────

  private async request<T>(
    path:    string,
    options: RequestInit & { auth?: boolean; apiKey?: string },
  ): Promise<T> {
    const { auth = true, apiKey, ...rest } = options;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(rest.headers as Record<string, string> | undefined),
    };
    if (auth && apiKey) headers["X-API-KEY"] = apiKey;

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, { ...rest, headers });
    } catch (err) {
      throw new OFError("NETWORK_TIMEOUT", `Pluggy inacessivel: ${String(err)}`, true);
    }

    if (response.status === 401 || response.status === 403) {
      throw new OFError("TOKEN_EXPIRED", "API key do Pluggy invalido ou expirado.", false);
    }
    if (response.status === 429) {
      throw new OFError("RATE_LIMIT", "Rate limit do Pluggy atingido.", true);
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new OFError(
        "PROVIDER_UNAVAILABLE",
        `Pluggy ${response.status}: ${body}`,
        response.status >= 500,
      );
    }

    return response.json() as Promise<T>;
  }

  // ── Metodos publicos ──────────────────────────────────────────────────────

  async createConnectToken(
    _userId: string,
  ): Promise<{ connectToken: string; expiresAt: string }> {
    const apiKey = await this.authenticate();
    const res    = await this.request<PluggyConnectTokenResponse>("/connect_token", {
      method: "POST",
      body:   JSON.stringify({}),
      apiKey,
    });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    return { connectToken: res.accessToken, expiresAt };
  }

  async getConnection(providerItemId: string): Promise<OFConnectionInfo> {
    const apiKey = await this.authenticate();
    const item   = await this.request<PluggyItemResponse>(
      `/items/${providerItemId}`,
      { apiKey },
    );
    return {
      providerItemId:  item.id,
      status:          mapExecutionStatus(item.executionStatus),
      institutionCode: item.connector.institutionCode ?? null,
      errorMessage:    item.error?.message,
      lastUpdated:     item.lastUpdatedAt ?? new Date().toISOString(),
    };
  }

  async disconnect(providerItemId: string): Promise<void> {
    const apiKey = await this.authenticate();
    await this.request<void>(`/items/${providerItemId}`, { method: "DELETE", apiKey });
  }

  async syncAccounts(providerItemId: string): Promise<OFProviderAccount[]> {
    const apiKey = await this.authenticate();
    const res    = await this.request<PluggyAccountsResponse>(
      `/accounts?itemId=${providerItemId}`,
      { apiKey },
    );
    return res.results.map((a): OFProviderAccount => ({
      externalId:      a.id,
      institutionCode: "",
      name:            a.name,
      type:            mapAccountType(a.type, a.subtype),
      currency:        a.currencyCode,
      balance:         a.balance,
      creditLimit:     a.creditData?.creditLimit,
      availableLimit:  a.creditData?.availableCreditLimit,
      lastFour:        a.number,
      rawData:         a as unknown as Record<string, unknown>,
    }));
  }

  /** STUB — Sprint 9.1C. Implementacao real no Sprint 9.2. */
  async syncTransactions(
    _providerAccountId: string,
    _from: string,
    _to:   string,
  ): Promise<OFProviderTransaction[]> {
    return [];
  }

  async refreshConnection(
    providerItemId: string,
  ): Promise<{ connectToken: string; expiresAt: string }> {
    const apiKey = await this.authenticate();
    const res    = await this.request<PluggyConnectTokenResponse>("/connect_token", {
      method: "POST",
      body:   JSON.stringify({ itemId: providerItemId }),
      apiKey,
    });
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    return { connectToken: res.accessToken, expiresAt };
  }

  /** STUB — Sprint 9.1C. Validacao HMAC no Sprint 9.3. */
  async handleWebhook(
    rawBody:    Buffer | string,
    _signature: string,
  ): Promise<OFProviderWebhookEvent> {
    let payload: Record<string, unknown>;
    try {
      const str = typeof rawBody === "string" ? rawBody : rawBody.toString("utf-8");
      payload   = JSON.parse(str) as Record<string, unknown>;
    } catch {
      throw new OFError("DATA_VALIDATION", "Webhook payload invalido — nao e JSON.", false);
    }
    return {
      eventType:      String(payload["event"] ?? "unknown"),
      providerItemId: String(payload["itemId"] ?? payload["id"] ?? ""),
      payload,
      receivedAt:     new Date().toISOString(),
    };
  }
}
