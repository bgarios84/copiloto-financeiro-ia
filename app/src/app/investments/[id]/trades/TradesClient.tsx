"use client";

/**
 * TradesClient — shell client da página de operações
 * Sprint 6.5
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Info } from "lucide-react";
import type { InvestmentPosition } from "@/types/investment";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ICONS } from "@/types/investment";
import type { InvestmentTrade } from "@/types/investment-trade";
import { TRADE_TYPE_LABELS, TRADE_TYPE_ICONS, TRADE_TYPE_COLORS } from "@/types/investment-trade";
import { deleteTrade } from "@/services/investment-trade";
import { TradeItem }      from "./TradeItem";
import { TradeFormModal } from "./TradeFormModal";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number | null, dec = 2): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtCurrency(n: number | null, currency: string): string {
  if (n === null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency", currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: ["BTC", "ETH"].includes(currency) ? 8 : 2,
    }).format(n);
  } catch {
    return `${currency} ${fmtNum(n)}`;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  position:      InvestmentPosition;
  initialTrades: InvestmentTrade[];
  initialError:  string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TradesClient({ position, initialTrades, initialError }: Props) {
  const [trades,    setTrades]    = useState<InvestmentTrade[]>(initialTrades);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<InvestmentTrade | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const hasTrades = trades.length > 0;

  // Summary stats from trades
  const stats = useMemo(() => {
    let buys = 0, sells = 0, dividends = 0;
    for (const t of trades) {
      if (t.trade_type === "buy")  buys      += t.total_amount ?? 0;
      if (t.trade_type === "sell") sells     += t.total_amount ?? 0;
      if (t.trade_type === "dividend") dividends += t.total_amount ?? 0;
    }
    return { buys, sells, dividends };
  }, [trades]);

  // Handlers
  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (t: InvestmentTrade) => { setEditing(t); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSaved = (saved: InvestmentTrade) => {
    setTrades(prev => {
      const idx = prev.findIndex(t => t.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      // Prepend and sort by date desc
      return [saved, ...prev].sort(
        (a, b) => b.trade_date.localeCompare(a.trade_date)
      );
    });
  };

  const handleDelete = async (t: InvestmentTrade) => {
    setTrades(prev => prev.filter(x => x.id !== t.id));
    const result = await deleteTrade(t.id, position.id);
    if (result.error) {
      setDeleteErr(result.error);
      setTrades(prev => [...prev, t].sort((a, b) => b.trade_date.localeCompare(a.trade_date)));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div>
        <Link
          href="/investments"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Investimentos
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{ASSET_CLASS_ICONS[position.asset_class]}</div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {position.asset_name}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-2">
                {position.ticker && (
                  <span className="font-mono font-bold">{position.ticker}</span>
                )}
                <span>{ASSET_CLASS_LABELS[position.asset_class]}</span>
                {position.institution && <span>· {position.institution}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Operação
          </button>
        </div>
      </div>

      {/* Errors */}
      {(initialError || deleteErr) && (
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {initialError ?? deleteErr}
        </div>
      )}

      {/* Position summary (derived from trades) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Quantidade atual</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {fmtNum(position.quantity, 8).replace(/\.?0+$/, "") || "—"}
          </p>
          {hasTrades && (
            <p className="text-xs text-blue-500 mt-0.5">calculado</p>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Preço médio</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {fmtCurrency(position.average_price, position.currency)}
          </p>
          {hasTrades && (
            <p className="text-xs text-blue-500 mt-0.5">calculado</p>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Custo total</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {fmtCurrency(position.acquisition_value, position.currency)}
          </p>
          {hasTrades && (
            <p className="text-xs text-blue-500 mt-0.5">calculado</p>
          )}
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Valor atual</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {fmtCurrency(position.current_value, position.currency)}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">manual</p>
        </div>
      </div>

      {/* Trade summary (buy/sell/dividend totals) */}
      {hasTrades && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total comprado</p>
            <p className="text-base font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {fmtCurrency(stats.buys, position.currency)}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
            <p className="text-xs font-medium text-red-600 dark:text-red-400">Total vendido</p>
            <p className="text-base font-bold text-red-700 dark:text-red-300 mt-0.5">
              {fmtCurrency(stats.sells, position.currency)}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Dividendos</p>
            <p className="text-base font-bold text-blue-700 dark:text-blue-300 mt-0.5">
              {fmtCurrency(stats.dividends, position.currency)}
            </p>
          </div>
        </div>
      )}

      {/* Trades table */}
      {!hasTrades ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-10 flex flex-col items-center text-center">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-1">
            Nenhuma operação registrada.
          </p>
          {(position.quantity !== null || position.acquisition_value !== null) && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-400 max-w-sm text-left">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Esta posição tem dados inseridos manualmente. Ao registrar operações, quantidade, preço médio e custo total serão recalculados automaticamente.
              </span>
            </div>
          )}
          <button
            onClick={openCreate}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Registrar Primeira Operação
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  {["Data", "Tipo", "Qtd", "Preço Unit.", "Total", "Taxa", "IR", "Obs.", ""].map(h => (
                    <th key={h} className={`px-3 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ${
                      h === "Data" ? "text-left px-4" :
                      h === "Tipo" ? "text-left" :
                      h === "Obs." || h === "" ? "text-left" :
                      "text-right"
                    } ${["Preço Unit.", "Taxa"].includes(h) ? "hidden lg:table-cell" : ""}${h === "IR" || h === "Obs." ? " hidden xl:table-cell" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <thead className="md:hidden">
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    {trades.length} {trades.length === 1 ? "operação" : "operações"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <TradeItem
                    key={t.id}
                    trade={t}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-3">
            {Object.entries(TRADE_TYPE_LABELS).map(([type, label]) => {
              const colors = TRADE_TYPE_COLORS[type as keyof typeof TRADE_TYPE_COLORS];
              return (
                <span key={type} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                  {TRADE_TYPE_ICONS[type as keyof typeof TRADE_TYPE_ICONS]} {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Recalculation note */}
      {hasTrades && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Quantidade, preço médio e custo total são recalculados automaticamente após cada operação (custo médio ponderado, método brasileiro).
        </p>
      )}

      {/* Modal */}
      {modalOpen && (
        <TradeFormModal
          positionId={position.id}
          currency={position.currency}
          editing={editing}
          onClose={closeModal}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
