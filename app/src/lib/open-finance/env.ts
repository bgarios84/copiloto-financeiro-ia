/**
 * Open Finance — Environment Variable Validation
 * Sprint 9.1C — Provider Foundation
 *
 * Ponto unico de leitura de env vars do Open Finance.
 * Falha rapido (fail-fast) na inicializacao se qualquer var obrigatoria estiver ausente.
 *
 * REGRAS:
 *   - Importar somente de codigo server-side (services, lib, route handlers).
 *   - Nunca usar NEXT_PUBLIC_ para estas variaveis.
 *   - Nunca logar os valores — apenas confirmar presenca.
 */

import type { OpenFinanceProviderName } from "@/types/open-finance";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[open-finance/env] Variavel de ambiente '${name}' nao configurada. ` +
      "Adicione no .env.local (dev) ou nas variaveis de ambiente do servidor (producao). " +
      "Nunca use prefixo NEXT_PUBLIC_ para secrets.",
    );
  }
  return value;
}

/**
 * Retorna as credenciais do Pluggy validadas.
 * Lanca erro descritivo se qualquer variavel estiver ausente.
 * Chamado no construtor do PluggyProvider — falha na inicializacao, nao em runtime.
 */
export function getPluggyEnv(): { clientId: string; clientSecret: string } {
  return {
    clientId:     requireEnv("PLUGGY_CLIENT_ID"),
    clientSecret: requireEnv("PLUGGY_CLIENT_SECRET"),
  };
}

/**
 * Retorna o nome do provider configurado.
 * Default: "pluggy".
 * Lanca erro se o valor nao for um provider suportado.
 */
export function getConfiguredProvider(): OpenFinanceProviderName {
  const raw = process.env.OPEN_FINANCE_PROVIDER ?? "pluggy";
  if (raw === "pluggy" || raw === "belvo") return raw;
  throw new Error(
    `[open-finance/env] OPEN_FINANCE_PROVIDER='${raw}' invalido. ` +
    "Valores aceitos: 'pluggy' | 'belvo'.",
  );
}
