/**
 * Open Finance -- Investment Sync Service
 * Sprint 9.8 -- Sincronizacao de Investimentos
 *
 * Sincroniza posicoes de investimento do provider (Pluggy) para investment_position.
 *
 * Estrategia de deduplicacao (sem schema changes):
 *   1. Busca por (user_id, ticker) se o ativo tem codigo
 *   2. Fallback: busca por (user_id, asset_name, institution)
 *
 * Preservacao de edicoes manuais:
 *   - Nunca sobrescreve: notes, asset_class
 *   - Sobrescreve apenas se nulo: average_price
 *   - Sempre atualiza: current_value, quantity, current_price, updated_at
 *   - Pula posicoes com deleted_at IS NOT NULL (usuario deletou)
 */

import { getOpenFinanceProvider } from "@/lib/open-finance";
import type { OFProviderInvestment } from "@/lib/open-finance/types";
import type { AssetClass } from "@/types/investment";
import type { createServiceRoleClient } from "@/lib/supabase/service-role";

// -- Tipos exportados ---------------------------------------------------------

export interface InvestmentSyncResult {
  investmentsCreated: number;
  investmentsUpdated: number;
  investmentsSkipped: number;
  errors:             string[];
}

// -- Mapeamento de tipos do provider para AssetClass --------------------------

function mapProviderTypeToAssetClass(type: string): AssetClass {
  const t = (type ?? "").toUpperCase();
  if (t === "EQUITY" || t === "SECURITY") return "stock_br";
  if (t === "ETF")                         return "etf_br";
  if (t === "MUTUAL_FUND" || t === "FUND") return "fund";
  if (t === "FIXED_INCOME")                return "fixed_income";
  if (t === "CRYPTO")                      return "crypto";
  return "other";
}

// -- Sync interno (aceita client de service_role) -----------------------------

/**
 * Sincroniza investimentos de uma conexao especifica.
 * Usado pelo auto-sync (cron) -- requer service_role client.
 *
 * @param db              - Supabase service_role client (bypassa RLS)
 * @param userId          - UUID do dono da conexao
 * @param connectionId    - UUID da open_finance_connection
 * @param institutionName - Nome da instituicao para preencher investment_position.institution
 */
export async function syncInvestmentsInternal(
  db:              ReturnType<typeof createServiceRoleClient>,
  userId:          string,
  connectionId:    string,
  institutionName: string | null,
): Promise<InvestmentSyncResult> {
  const result: InvestmentSyncResult = {
    investmentsCreated: 0,
    investmentsUpdated: 0,
    investmentsSkipped: 0,
    errors:             [],
  };

  // Buscar provider_item_id da conexao
  const { data: conn } = await db
    .from("open_finance_connection")
    .select("provider_item_id")
    .eq("id", connectionId)
    .single();

  if (!conn) {
    result.errors.push("Conexao nao encontrada.");
    return result;
  }

  // Buscar investimentos do provider
  let investments: OFProviderInvestment[];
  try {
    const provider = await getOpenFinanceProvider();
    investments    = await provider.syncInvestments(conn.provider_item_id);
  } catch (err) {
    result.errors.push(
      `Erro ao buscar investimentos: ${err instanceof Error ? err.message : String(err)}`,
    );
    return result;
  }

  if (investments.length === 0) {
    return result;
  }

  const now = new Date().toISOString();

  for (const inv of investments) {
    try {
      const ticker      = inv.code?.trim() || null;
      const assetName   = inv.name;
      const assetClass  = mapProviderTypeToAssetClass(inv.type);
      const institution = institutionName;

      // 1. Tentar deduplica por ticker
      let existingRow: { id: string; average_price: number | null } | null = null;

      if (ticker) {
        const { data: byTicker } = await db
          .from("investment_position")
          .select("id, average_price")
          .eq("user_id", userId)
          .eq("ticker", ticker)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        existingRow = byTicker ?? null;
      }

      // 2. Fallback: deduplica por nome + instituicao
      if (!existingRow) {
        let q = db
          .from("investment_position")
          .select("id, average_price")
          .eq("user_id", userId)
          .eq("asset_name", assetName)
          .is("deleted_at", null)
          .limit(1);

        if (institution) {
          q = q.eq("institution", institution);
        }

        const { data: byName } = await q.maybeSingle();
        existingRow = byName ?? null;
      }

      if (existingRow) {
        // UPDATE -- apenas campos de mercado (preserva edicoes manuais: notes, asset_class)
        type UpdatePayload = {
          current_value:  number | null;
          updated_at:     string;
          quantity?:      number;
          current_price?: number;
          average_price?: number;
        };

        const updatePayload: UpdatePayload = {
          current_value: inv.currentValue,
          updated_at:    now,
        };

        if (inv.quantity !== null) {
          updatePayload.quantity = inv.quantity;
        }

        if (inv.currentValue !== null && inv.quantity !== null && inv.quantity > 0) {
          updatePayload.current_price = inv.currentValue / inv.quantity;
        }

        // average_price: preenche apenas se ainda nao tiver (preserva edicao manual)
        if (
          existingRow.average_price === null &&
          inv.acquisitionValue !== null &&
          inv.quantity !== null &&
          inv.quantity > 0
        ) {
          updatePayload.average_price = inv.acquisitionValue / inv.quantity;
        }

        const { error: updateErr } = await db
          .from("investment_position")
          .update(updatePayload)
          .eq("id", existingRow.id)
          .eq("user_id", userId);

        if (updateErr) {
          result.errors.push(`Update "${assetName}": ${updateErr.message}`);
          result.investmentsSkipped++;
        } else {
          result.investmentsUpdated++;
        }
      } else {
        // INSERT -- nova posicao sincronizada do Open Finance
        const currentPrice =
          inv.currentValue !== null && inv.quantity !== null && inv.quantity > 0
            ? inv.currentValue / inv.quantity
            : null;

        const avgPrice =
          inv.acquisitionValue !== null && inv.quantity !== null && inv.quantity > 0
            ? inv.acquisitionValue / inv.quantity
            : null;

        const { error: insertErr } = await db.from("investment_position").insert({
          user_id:           userId,
          asset_name:        assetName,
          ticker:            ticker,
          asset_class:       assetClass,
          quantity:          inv.quantity,
          average_price:     avgPrice,
          current_price:     currentPrice,
          current_value:     inv.currentValue,
          acquisition_value: inv.acquisitionValue,
          currency:          inv.currency,
          institution:       institution,
          notes:             null,
          created_at:        now,
          updated_at:        now,
        });

        if (insertErr) {
          result.errors.push(`Insert "${assetName}": ${insertErr.message}`);
          result.investmentsSkipped++;
        } else {
          result.investmentsCreated++;
        }
      }
    } catch (err) {
      result.errors.push(
        `Investimento "${inv.name}": ${err instanceof Error ? err.message : "erro inesperado"}`,
      );
      result.investmentsSkipped++;
    }
  }

  return result;
}
