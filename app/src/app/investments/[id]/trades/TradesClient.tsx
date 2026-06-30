"use client";

/**
 * TradesClient — shell client da página de operações
 * Sprint 6.5
 * Sprint 10.2 — dark premium redesign (sem dark: prefixes)
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Info, AlertTriangle } from "lucide-react";
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

  const stats = useMemo(() => {
    let buys = 0, sells = 0, dividends = 0;
    for (const t of trades) {
      if (t.trade_type === "buy")      buys      += t.total_amount ?? 0;
      if (t.trade_type === "sell")     sells     += t.total_amount ?? 0;
      if (t.trade_type === "dividend") dividends += t.total_amount ?? 0;
    }
    return { buys, sells, dividends };
  }, [trades]);

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
      return [saved, ...prev].sort((a, b) => b.trade_date.localeCompare(a.trade_date));
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
      {/* ── Back + Header ──────────────────────────────────────────────────── */}
      <div>
        <Link
          href="/investments"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-200 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Investimentos
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{ASSET_CLASS_ICONS[position.asset_class]}</div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">
                {position.asset_name}
              </h1>
              <p className="text-[13px] text-zinc-500 mt-0.5 flex items-center gap-2">
                {position.ticker && (
                  <span className="font-mono font-bold text-zinc-400">{position.ticker}</span>
                )}
                <span>{ASSET_CLASS_LABELS[position.asset_class]}</span>
                {position.institution && <span>· {position.institution}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nova Operação
          </button>
        </div>
      </div>

      {/* ── Errors ─────────────────────────────────────────────────────────── */}
      {(initialError || deleteErr) && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-[13px] text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{initialError ?? deleteErr}</span>
        </div>
      )}

      {/* ── Position summary cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Quantidade atual</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">
            {fmtNum(position.quantity, 8).replace(/\.?0+$/, "") || "—"}
          </p>
          {hasTrades && <p className="text-[11px] text-blue-400 mt-0.5">calculado</p>}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Preço médio</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">
            {fmtCurrency(position.average_price, position.currency)}
          </p>
          {hasTrades && <p className="text-[11px] text-blue-400 mt-0.5">calculado</p>}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Custo total</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">
            {fmtCurrency(position.acquisition_value, position.currency)}
          </p>
          {hasTrades && <p className="text-[11px] text-blue-400 mt-0.5">calculado</p>}
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Valor atual</p>
          <p className="text-xl font-bold text-zinc-100 mt-1">
            {fmtCurrency(position.current_value, position.currency)}
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">manual</p>
        </div>
      </div>

      {/* ── Buy/sell/dividend totals ────────────────────────────────────────── */}
      {hasTrades && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-3">
            <p className="text-[11px] font-medium text-emerald-400 uppercase tracking-wide">Total comprado</p>
            <p className="text-base font-bold text-emerald-300 mt-0.5">
              {fmtCurrency(stats.buys, position.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3">
            <p className="text-[11px] font-medium text-red-400 uppercase tracking-wide">Total vendido</p>
            <p className="text-base font-bold text-red-300 mt-0.5">
              {fmtCurrency(stats.sells, position.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-3">
            <p className="text-[11px] font-medium text-blue-400 uppercase tracking-wide">Dividendos</p>
            <p className="text-base font-bold text-blue-300 mt-0.5">
              {fmtCurrency(stats.dividends, position.currency)}
            </p>
          </div>
        </div>
      )}

      {/* ── Trades table / empty ────────────────────────────────────────────── */}
      {!hasTrades ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-10 flex flex-col items-center text-center">
          <span className="text-4xl mb-3">📋</span>
          <p className="text-[13px] text-zinc-400 mb-1">
            Nenhuma operação registrada.
          </p>
          {(position.quantity !== null || position.acquisition_value !== null) && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg border border-amber-500/25 bg-amber-500/10 text-[12px] text-amber-400 max-w-sm text-left">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                Esta posição tem dados inseridos manualmente. Ao registrar operações, quantidade, preço médio e custo total serão recalculados automaticamente.
              </span>
            </div>
          )}
          <button
            onClick={openCreate}
            className="mt-5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors"
          >
            Registrar Primeira Operação
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Desktop header */}
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-zinc-800 bg-zinc-800/60">
                  {[
                    { label: "Data",       align: "left",  cls: "px-4" },
                    { label: "Tipo",       align: "left",  cls: "px-3" },
                    { label: "Qtd",        align: "right", cls: "px-3" },
                    { label: "Preço Unit.", align: "right", cls: "px-3 hidden lg:table-cell" },
                    { label: "Total",      align: "right", cls: "px-3" },
                    { label: "Taxa",       align: "right", cls: "px-3 hidden lg:table-cell" },
                    { label: "IR",         align: "right", cls: "px-3 hidden xl:table-cell" },
                    { label: "Obs.",       align: "left",  cls: "px-3 hidden xl:table-cell" },
                    { label: "",           align: "right", cls: "px-3 w-20" },
                  ].map(h => (
                    <th
                      key={h.label}
                      className={`${h.cls} py-3 text-${h.align} text-[11px] font-semibold text-zinc-500 uppercase tracking-wider`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              {/* Mobile header */}
              <thead className="md:hidden">
                <tr className="border-b border-zinc-800 bg-zinc-800/60">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                    {trades.length} {trades.length === 1 ? "operação" : "operações"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map(t => (
                  <TradeItem key={t.id} trade={t} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-zinc-800 flex flex-wrap gap-2">
            {Object.entries(TRADE_TYPE_LABELS).map(([type, label]) => {
              const colors = TRADE_TYPE_COLORS[type as keyof typeof TRADE_TYPE_COLORS];
              return (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${colors.bg} ${colors.text}`}
                >
                  {TRADE_TYPE_ICONS[type as keyof typeof TRADE_TYPE_ICONS]} {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recalculation note ──────────────────────────────────────────────── */}
      {hasTrades && (
        <p className="text-[12px] text-zinc-600 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Quantidade, preço médio e custo total são recalculados automaticamente após cada operação (custo médio ponderado, método brasileiro).
        </p>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
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
