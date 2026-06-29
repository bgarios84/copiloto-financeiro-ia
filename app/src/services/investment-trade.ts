"use server";

/**
 * Service — Investment Trade (Server Actions)
 * Sprint 6.5 — Livro de Operações
 *
 * Todas as funções são async — conformidade com "use server".
 * RLS + requireAuth() como segunda camada de segurança.
 *
 * RECALCULO AUTOMÁTICO:
 *   Após qualquer CRUD, recalculatePosition() é chamado internamente.
 *   Ele aplica todos os trades em ordem cronológica (custo médio ponderado,
 *   método brasileiro) e atualiza investment_position.
 */

import { createClient }   from "@/lib/supabase/server";
import { requireAuth }    from "@/lib/supabase/require-auth";
import { revalidatePath } from "next/cache";
import type {
  InvestmentTrade,
  TradeFormData,
  PositionSnapshot,
  ServiceResult,
} from "@/types/investment-trade";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseNum(s: string): number | null {
  if (!s || s.trim() === "") return null;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

function parseFee(s: string): number {
  return parseNum(s) ?? 0;
}

// ── Recalculation (private) ───────────────────────────────────────────────────

/**
 * Recalcula quantity, average_price e acquisition_value da posição
 * aplicando todos os trades ativos em ordem cronológica.
 *
 * Algoritmo (custo médio ponderado — método brasileiro):
 *   buy:           qty += t.quantity; avg = (total_cost + qty*price + fee) / new_qty
 *   sell:          qty -= t.quantity; avg inalterado; total_cost = qty * avg
 *   bonus:         qty += t.quantity; total_cost inalterado; avg = total_cost / new_qty
 *   split:         qty *= t.unit_price; total_cost inalterado; avg = total_cost / new_qty
 *   reverse_split: qty *= t.unit_price; total_cost inalterado; avg = total_cost / new_qty
 *   dividend/amortization: sem impacto na posição
 */
async function recalculatePosition(
  positionId: string,
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  // 1. Fetch all active trades, chronological order
  const { data: trades, error } = await supabase
    .from("investment_trade")
    .select("trade_type, trade_date, quantity, unit_price, fee, created_at")
    .eq("investment_position_id", positionId)
    .is("deleted_at", null)
    .order("trade_date",  { ascending: true })
    .order("created_at", { ascending: true });

  if (error || !trades || trades.length === 0) {
    // No trades: don't touch position (preserve manual values)
    return;
  }

  // 2. Apply algorithm
  let qty       = 0;
  let totalCost = 0; // Custo total de aquisição (base para avg_price)

  for (const t of trades as Array<{
    trade_type: string;
    quantity:   number | null;
    unit_price: number | null;
    fee:        number;
  }>) {
    const tQty   = t.quantity   ?? 0;
    const tPrice = t.unit_price ?? 0;
    const tFee   = t.fee        ?? 0;

    switch (t.trade_type) {
      case "buy": {
        const cost = tQty * tPrice + tFee;
        totalCost += cost;
        qty       += tQty;
        break;
      }
      case "sell": {
        const avgBefore = qty > 0 ? totalCost / qty : 0;
        qty       -= tQty;
        if (qty <= 0) { qty = 0; totalCost = 0; }
        else          { totalCost = qty * avgBefore; }
        break;
      }
      case "bonus": {
        // Bonus shares at zero cost — dilutes average price
        qty += tQty;
        // totalCost unchanged
        break;
      }
      case "split": {
        // unit_price is the split ratio (e.g., 3 = 1 share becomes 3)
        if (tPrice > 0) {
          qty *= tPrice;
          // totalCost unchanged — same investment, more shares
        }
        break;
      }
      case "reverse_split": {
        // unit_price is the grouping ratio (e.g., 0.5 = 2 shares become 1)
        if (tPrice > 0) {
          qty *= tPrice;
          // totalCost unchanged
          if (qty < 0) qty = 0;
        }
        break;
      }
      // dividend, amortization: cashflow only, no position impact
    }
  }

  const avgPrice: number         = qty > 0 ? totalCost / qty : 0;
  const snapshot: PositionSnapshot = {
    quantity:          Math.max(0, qty),
    average_price:     avgPrice,
    acquisition_value: Math.max(0, totalCost),
  };

  // 3. Update position (only the 3 derived fields)
  await supabase
    .from("investment_position")
    .update({
      quantity:          snapshot.quantity,
      average_price:     snapshot.average_price,
      acquisition_value: snapshot.acquisition_value,
    })
    .eq("id", positionId);
}

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getTradesForPosition(
  positionId: string
): Promise<ServiceResult<InvestmentTrade[]>> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("investment_trade")
      .select("*")
      .eq("investment_position_id", positionId)
      .is("deleted_at", null)
      .order("trade_date",  { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as InvestmentTrade[], error: null };
  } catch {
    return { data: null, error: "Erro ao buscar operações." };
  }
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createTrade(
  positionId: string,
  form: TradeFormData
): Promise<ServiceResult<InvestmentTrade>> {
  try {
    const { id: userId } = await requireAuth();
    const supabase       = await createClient();

    const { data, error } = await supabase
      .from("investment_trade")
      .insert({
        user_id:                userId,
        investment_position_id: positionId,
        trade_type:             form.trade_type,
        trade_date:             form.trade_date,
        quantity:               parseNum(form.quantity),
        unit_price:             parseNum(form.unit_price),
        total_amount:           parseNum(form.total_amount),
        fee:                    parseFee(form.fee),
        tax:                    parseFee(form.tax),
        currency:               form.currency || "BRL",
        notes:                  form.notes.trim() || null,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    await recalculatePosition(positionId, supabase);
    revalidatePath(`/investments/${positionId}/trades`);
    revalidatePath("/investments");
    return { data: data as InvestmentTrade, error: null };
  } catch {
    return { data: null, error: "Erro ao criar operação." };
  }
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateTrade(
  tradeId:    string,
  positionId: string,
  form:       TradeFormData
): Promise<ServiceResult<InvestmentTrade>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("investment_trade")
      .update({
        trade_type:   form.trade_type,
        trade_date:   form.trade_date,
        quantity:     parseNum(form.quantity),
        unit_price:   parseNum(form.unit_price),
        total_amount: parseNum(form.total_amount),
        fee:          parseFee(form.fee),
        tax:          parseFee(form.tax),
        currency:     form.currency || "BRL",
        notes:        form.notes.trim() || null,
      })
      .eq("id", tradeId)
      .is("deleted_at", null)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    await recalculatePosition(positionId, supabase);
    revalidatePath(`/investments/${positionId}/trades`);
    revalidatePath("/investments");
    return { data: data as InvestmentTrade, error: null };
  } catch {
    return { data: null, error: "Erro ao atualizar operação." };
  }
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────

export async function deleteTrade(
  tradeId:    string,
  positionId: string
): Promise<ServiceResult<null>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from("investment_trade")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", tradeId)
      .is("deleted_at", null);

    if (error) return { data: null, error: error.message };
    await recalculatePosition(positionId, supabase);
    revalidatePath(`/investments/${positionId}/trades`);
    revalidatePath("/investments");
    return { data: null, error: null };
  } catch {
    return { data: null, error: "Erro ao excluir operação." };
  }
}
