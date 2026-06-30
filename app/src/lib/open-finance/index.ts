/**
 * Open Finance — Provider Factory
 * Sprint 9.1 — Open Finance Foundation
 *
 * Retorna a implementacao do provider configurada via variavel de ambiente.
 * A camada de servico importa apenas esta funcao — nunca o provider diretamente.
 *
 * Variavel de ambiente:
 *   OPEN_FINANCE_PROVIDER=pluggy  (default)
 *   OPEN_FINANCE_PROVIDER=belvo
 */

import type { OpenFinanceProvider } from "./types";
import { OFError } from "./types";

/**
 * Retorna a instancia do provider configurado.
 * Lazy import para evitar carregar SDKs de providers nao usados.
 *
 * @throws OFError se o provider configurado nao for suportado.
 */
export async function getOpenFinanceProvider(): Promise<OpenFinanceProvider> {
  const provider = process.env.OPEN_FINANCE_PROVIDER ?? "pluggy";

  if (provider === "pluggy") {
    const { PluggyProvider } = await import("./pluggy");
    return new PluggyProvider();
  }

  throw new OFError(
    "PROVIDER_NOT_SUPPORTED",
    `Provider '${provider}' nao suportado. Configure OPEN_FINANCE_PROVIDER=pluggy.`,
    false,
  );
}

// Re-exportar tipos publicos para conveniencia
export type {
  OpenFinanceProvider,
  OFProviderAccount,
  OFProviderTransaction,
  OFSyncResult,
  OFProviderWebhookEvent,
  OFConnectionInfo,
  OFProvider,
  OFAccountType,
  OFErrorCode,
} from "./types";

export { OFError, OFNotImplementedError } from "./types";
