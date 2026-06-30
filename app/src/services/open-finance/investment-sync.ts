/**
 * Open Finance -- Investment Sync Service
 * Sprint 9.8  -- Sincronizacao de Investimentos (estrutura inicial)
 * Sprint 9.11 -- Mapeamento completo de classes, subtipos, notes, institution_id
 *
 * Sincroniza posicoes de investimento do provider (Pluggy) para investment_position.
 *
 * Estrategia de deduplicacao (sem schema changes):
 *   1. Ticker: busca por (user_id, ticker) -- ativos com codigo
 *   2. Fallback: busca por (user_id, asset_name, institution) -- renda fixa e fundos sem ticker
 *
 * Preservacao de edicoes manuais:
 *   - Nunca sobrescreve: notes, asset_class
 *   - Sobrescreve apenas se nulo: average_price
 *   - Sempre atualiza: current_value, quantity, current_price, updated_at
 *   - Pula posicoes com deleted_at IS NOT NULL (usuario deletou)
 *
 * Mapeamento de classes (Sprint 9.11):
 *   EQUITY / SECURITY + subtype BDR       -> bdr
 *   EQUITY / SECURITY (outros)            -> stock_br
 *   FUND + subtype REAL_ESTATE / FII      -> fii
 *   MUTUAL_FUND / FUND (outros)           -> fund
 *   ETF / subtype ETF                     -> etf_br
 *   FIXED_INCOME                          -> fixed_income
 *   CRYPTO                                -> crypto
 *   outros                                -> other
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

/**
 * Converte type + subtype da Pluggy para AssetClass local.
 *
 * Subtipos relevantes da Pluggy (referencia da documentacao):
 *   - EQUITY: subtype pode ser "BDR", "UNIT", "STOCK", etc.
 *   - FUND: subtype pode ser "FII", "REAL_ESTATE_FUND", "MULTIMARKET_FUND", etc.
 *   - ETF: subtype pode ser "ETF", "ETF_FUND"
 */
function mapToAssetClass(type: string, subtype: string | null): AssetClass {
  const t = (type    ?? "").toUpperCase().trim();
  const s = (subtype ?? "").toUpperCase().trim();

  // BDR -- subtype BDR (vem como EQUITY ou SECURITY)
  if ((t === "EQUITY" || t === "SECURITY") && s === "BDR") return "bdr";

  // Acoes BR (default para EQUITY sem subtype BDR)
  if (t === "EQUITY" || t === "SECURITY") return "stock_br";

  // ETF -- pode vir como tipo direto ou subtype
  if (t === "ETF" || s === "ETF" || s === "ETF_FUND") return "etf_br";

  // FII -- FUND com subtype de fundo imobiliario
  if (t === "FUND" || t === "MUTUAL_FUND") {
    if (s === "FII" || s === "REAL_ESTATE_FUND" || s.includes("REAL_ESTATE")) return "fii";
    return "fund";
  }

  if (t === "FIXED_INCOME") return "fixed_income";
  if (t === "CRYPTO")       return "crypto";
  return "other";
}

// -- Sync interno (aceita client de service_role) -----------------------------

/**
 * Sincroniza investimentos de uma conexao especifica.
 * Chamado pelo sync-orchestrator apos syncAccountsCore e syncTransactionsCore.
 *
 * @param db              - Supabase service_role client (bypassa RLS)
 * @param userId          - UUID do dono da conexao
 * @param connectionId    - UUID da open_finance_connection
 * @param institutionName - Nome da instituicao (texto livre, preenche investment_position.institution)
 * @param institutionId   - UUID da institution (para notas de origem)
 */
export async function syncInvestmentsInternal(
  db:              ReturnType<typeof createServiceRoleClient>,
  userId:          string,
  connectionId:    string,
  institutionName: string | null,
  institutionId:   string | null = null,
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

  const now         = new Date().toISOString();
  const originNotes = institutionName
    ? `Importado via Open Finance (${institutionName})`
    : "Importado via Open Finance";

  for (const inv of investments) {
    try {
      const ticker     = inv.code?.trim() || null;
      const assetName  = inv.name;
      const assetClass = mapToAssetClass(inv.type, inv.subtype);

      // Calcular precos derivados
      const currentPrice =
        inv.currentValue !== null && inv.quantity !== null && inv.quantity > 0
          ? inv.currentValue / inv.quantity
          : null;

      const avgPrice =
        inv.acquisitionValue !== null && inv.quantity !== null && inv.quantity > 0
          ? inv.acquisitionValue / inv.quantity
          : null;

      // ── 1. Dedup por ticker ────────────────────────────────────────────────
      let existingRow: {
        id:            string;
        average_price: number | null;
        notes:         string | null;
        asset_class:   string | null;
      } | null = null;

      if (ticker) {
        const { data: byTicker } = await db
          .from("investment_position")
          .select("id, average_price, notes, asset_class")
          .eq("user_id", userId)
          .eq("ticker", ticker)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        existingRow = byTicker ?? null;
      }

      // ── 2. Fallback: dedup por nome + instituicao ──────────────────────────
      if (!existingRow) {
        let q = db
          .from("investment_position")
          .select("id, average_price, notes, asset_class")
          .eq("user_id", userId)
          .eq("asset_name", assetName)
          .is("deleted_at", null)
          .limit(1);

        if (institutionName) {
          q = q.eq("institution", institutionName);
        }

        const { data: byName } = await q.maybeSingle();
        existingRow = byName ?? null;
      }

      // ── 3. UPDATE ──────────────────────────────────────────────────────────
      if (existingRow) {
        type UpdatePayload = {
          current_value:     number | null;
          updated_at:        string;
          quantity?:         number;
          current_price?:    number;
          average_price?:    number;
          acquisition_value?: number | null;
        };

        const updatePayload: UpdatePayload = {
          current_value: inv.currentValue,
          updated_at:    now,
        };

        if (inv.quantity !== null) {
          updatePayload.quantity = inv.quantity;
        }

        if (currentPrice !== null) {
          updatePayload.current_price = currentPrice;
        }

        if (inv.acquisitionValue !== null) {
          updatePayload.acquisition_value = inv.acquisitionValue;
        }

        // average_price: preenche apenas se ainda nao tiver (preserva edicao manual)
        if (existingRow.average_price === null && avgPrice !== null) {
          updatePayload.average_price = avgPrice;
        }

        // asset_class: preserva edicao manual (nunca sobrescreve)
        // notes: preserva edicao manual (nunca sobrescreve)

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

      // ── 4. INSERT ──────────────────────────────────────────────────────────
      } else {
        const { error: insertErr } = await db.from("investment_position").insert({
          user_id:           userId,
          asset_name:        assetName,
          ticker,
          asset_class:       assetClass,
          quantity:          inv.quantity,
          average_price:     avgPrice,
          current_price:     currentPrice,
          current_value:     inv.currentValue,
          acquisition_value: inv.acquisitionValue,
          currency:          inv.currency ?? "BRL",
          institution:       institutionName,
          notes:             originNotes,
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
