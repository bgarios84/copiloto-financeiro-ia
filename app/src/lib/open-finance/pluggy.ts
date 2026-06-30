/**
 * Open Finance — Pluggy Provider Implementation
 * Sprint 9.1C — Provider Foundation
 * Sprint 9.4  — Transaction Sync
 * Sprint 9.4B — Migrado para GET /v2/transactions com cursor pagination (410 fix)
 * Sprint 9.4C — Removidos from/to/pageSize dos params v2 (causavam 400); filtragem client-side
 *
 * SEGURANCA:
 *   - Credenciais lidas via getPluggyEnv() — nunca process.env direto.
 *   - API key (TTL 2h) obtida fresh por request — nunca persiste.
 *   - Connect Token (TTL 30min) passado ao widget, nunca armazenado no banco.
 *   - Apenas provider_item_id (referencia nao-sensivel) e salvo no banco.
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
  id:           string;
  name:         string;
  type:         string;
  subtype:      string;
  currencyCode: string;
  balance:      number;
  creditData?:  { creditLimit: number; availableCreditLimit: number };
  number?:      string;
}

interface PluggyAccountsResponse {
  total:   number;
  results: PluggyAccountResponse[];
}

interface PluggyTransactionResponse {
  id:          string;
  description: string;
  /** Valor absoluto (sempre positivo no Pluggy v2). */
  amount:      number;
  /** ISO date string — pode ter horario, usamos apenas YYYY-MM-DD. */
  date:        string;
  /** DEBIT = saida/despesa; CREDIT = entrada/receita. */
  type:        "DEBIT" | "CREDIT";
  category?:   string;
  status:      "POSTED" | "PENDING";
  accountId:   string;
}

/** Pluggy v2 cursor-paginated transactions response */
interface PluggyTransactionsV2Response {
  results:     PluggyTransactionResponse[];
  /** Cursor para a proxima pagina; ausente/null quando for a ultima. */
  nextCursor?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapExecutionStatus(s: string): OFConnectionInfo["status"] {
  switch (s) {
    case "SUCCESS":
    case "PARTIAL_SUCCESS":
      return "connected";
    case "LOGIN_ERROR":
    case "INVALID_CREDENTIALS":
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

  private readonly baseUrl       = "https://api.pluggy.ai";
  private readonly clientId:     string;
  private readonly clientSecret: string;

  constructor() {
    const env         = getPluggyEnv();
    this.clientId     = env.clientId;
    this.clientSecret = env.clientSecret;
  }

  // ── Autenticacao (privado) ────────────────────────────────────────────────

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

  /**
   * Busca transacoes de uma conta no periodo [from, to] (YYYY-MM-DD).
   * Usa GET /v2/transactions com paginacao por cursor.
   *
   * A API v2 NAO aceita from/to/pageSize — apenas accountId e cursor.
   * Filtragem por data e feita client-side apos receber cada pagina.
   * Early-exit: para de paginar quando a pagina inteira estiver antes de `from`
   * (assumindo ordem decrescente de data retornada pela API).
   *
   * Sprint 9.4C — removidos from/to/pageSize dos params (causavam 400).
   */
  async syncTransactions(
    providerAccountId: string,
    from: string,
    to:   string,
  ): Promise<OFProviderTransaction[]> {
    const apiKey = await this.authenticate();

    const all: PluggyTransactionResponse[] = [];
    let cursor: string | undefined = undefined;

    do {
      const params = new URLSearchParams({ accountId: providerAccountId });
      if (cursor) params.set("cursor", cursor);

      const res = await this.request<PluggyTransactionsV2Response>(
        `/v2/transactions?${params.toString()}`,
        { apiKey },
      );

      // Filtrar pelo periodo desejado client-side
      const inRange = res.results.filter((tx) => {
        const d = tx.date.slice(0, 10);
        return d >= from && d <= to;
      });
      all.push(...inRange);

      // Early-exit: se toda a pagina esta antes de `from`, nao ha mais dados relevantes
      const allBeforeFrom =
        res.results.length > 0 &&
        res.results.every((tx) => tx.date.slice(0, 10) < from);

      cursor = (!allBeforeFrom && res.nextCursor) ? res.nextCursor : undefined;
    } while (cursor);

    return all.map((tx): OFProviderTransaction => ({
      externalId:        tx.id,
      accountExternalId: tx.accountId,
      date:              tx.date.slice(0, 10),
      amount:            Math.abs(tx.amount),
      type:              tx.type === "CREDIT" ? "credit" : "debit",
      description:       tx.description || "Transacao importada",
      category:          tx.category ?? undefined,
      status:            tx.status === "PENDING" ? "pending" : "posted",
      rawData:           tx as unknown as Record<string, unknown>,
    }));
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

  /** STUB — validacao HMAC implementada no Sprint 9.5. */
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
