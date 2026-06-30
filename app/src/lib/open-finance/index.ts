/**
 * Open Finance — Provider Factory
 * Sprint 9.1C — Provider Foundation
 *
 * Ponto de entrada publico da camada de provider.
 * A camada de servico importa apenas daqui — nunca do provider diretamente.
 *
 * Variavel de ambiente:
 *   OPEN_FINANCE_PROVIDER=pluggy  (default)
 */

import type { OpenFinanceProvider } from "./types";
import { OFError } from "./types";
import { getConfiguredProvider } from "./env";

/**
 * Retorna a instancia do provider configurado.
 * Lazy import evita carregar SDKs de providers nao usados.
 *
 * @throws OFError se OPEN_FINANCE_PROVIDER tiver valor invalido.
 */
export async function getOpenFinanceProvider(): Promise<OpenFinanceProvider> {
  const provider = getConfiguredProvider();

  if (provider === "pluggy") {
    const { PluggyProvider } = await import("./pluggy");
    return new PluggyProvider();
  }

  // Belvo: importar aqui quando implementado no futuro
  throw new OFError(
    "PROVIDER_NOT_SUPPORTED",
    `Provider '${provider}' ainda nao implementado.`,
    false,
  );
}

// Re-exportacoes publicas da camada de provider
export type {
  OpenFinanceProvider,
  OFProviderAccount,
  OFProviderTransaction,
  OFSyncResult,
  OFProviderWebhookEvent,
  OFConnectionInfo,
  OFErrorCode,
} from "./types";

export { OFError, OFNotImplementedError } from "./types";
