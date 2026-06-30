"use client";

/**
 * TradeItem — linha de tabela de uma operação
 * Sprint 6.5
 * Sprint 10.2 — dark premium redesign (sem dark: prefixes)
 */

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { InvestmentTrade } from "@/types/investment-trade";
import { TRADE_TYPE_LABELS, TRADE_TYPE_ICONS, TRADE_TYPE_COLORS } from "@/types/investment-trade";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtNum(n: number | null, dec = 2): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function fmtCurrency(n: number | null, currency: string): string {
  if (n === null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style:    "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: ["BTC", "ETH"].includes(currency) ? 8 : 2,
    }).format(n);
  } catch {
    return `${currency} ${fmtNum(n)}`;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  trade:    InvestmentTrade;
  onEdit:   (t: InvestmentTrade) => void;
  onDelete: (t: InvestmentTrade) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TradeItem({ trade, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const colors = TRADE_TYPE_COLORS[trade.trade_type];
  const label  = TRADE_TYPE_LABELS[trade.trade_type];
  const icon   = TRADE_TYPE_ICONS[trade.trade_type];

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(trade);
  };

  return (
    <>
      {/* ── Desktop row ──────────────────────────────────────────────────── */}
      <tr className="hidden md:table-row group hover:bg-zinc-800/40 transition-colors border-b border-zinc-800 last:border-0">

        {/* Data */}
        <td className="px-4 py-3 text-[13px] text-zinc-400 whitespace-nowrap">
          {fmtDate(trade.trade_date)}
        </td>

        {/* Tipo */}
        <td className="px-3 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text}`}>
            <span>{icon}</span>
            {label}
          </span>
        </td>

        {/* Quantidade */}
        <td className="px-3 py-3 text-right text-[13px] text-zinc-300">
          {fmtNum(trade.quantity, 8).replace(/\.?0+$/, "")}
        </td>

        {/* Preço unit. */}
        <td className="px-3 py-3 text-right text-[13px] text-zinc-300 hidden lg:table-cell">
          {fmtCurrency(trade.unit_price, trade.currency)}
        </td>

        {/* Total */}
        <td className="px-3 py-3 text-right text-[13px] font-semibold text-zinc-100">
          {fmtCurrency(trade.total_amount, trade.currency)}
        </td>

        {/* Fee */}
        <td className="px-3 py-3 text-right text-[13px] text-zinc-500 hidden lg:table-cell">
          {trade.fee > 0 ? fmtCurrency(trade.fee, trade.currency) : "—"}
        </td>

        {/* Tax */}
        <td className="px-3 py-3 text-right text-[13px] text-zinc-500 hidden xl:table-cell">
          {trade.tax > 0 ? fmtCurrency(trade.tax, trade.currency) : "—"}
        </td>

        {/* Notas */}
        <td className="px-3 py-3 text-[13px] text-zinc-500 hidden xl:table-cell max-w-[160px]">
          <span className="truncate block">{trade.notes ?? "—"}</span>
        </td>

        {/* Ações */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(trade)}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                confirmDelete
                  ? "bg-red-500/20 text-red-400"
                  : "hover:bg-zinc-700 text-zinc-500 hover:text-red-400"
              }`}
              title={confirmDelete ? "Confirmar exclusão" : "Excluir"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* ── Mobile row ───────────────────────────────────────────────────── */}
      <tr className="md:hidden border-b border-zinc-800 last:border-0">
        <td colSpan={9} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={`px-2 py-1 rounded-full text-[11px] font-medium flex-shrink-0 ${colors.bg} ${colors.text}`}>
              {icon} {label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-zinc-500">{fmtDate(trade.trade_date)}</p>
              {trade.quantity !== null && (
                <p className="text-[12px] text-zinc-400">
                  {fmtNum(trade.quantity, 8)} un.
                </p>
              )}
            </div>
            <p className="text-[13px] font-semibold text-zinc-100 flex-shrink-0">
              {fmtCurrency(trade.total_amount, trade.currency)}
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => onEdit(trade)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                onBlur={() => setConfirmDelete(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  confirmDelete
                    ? "bg-red-500/20 text-red-400"
                    : "hover:bg-zinc-800 text-zinc-500 hover:text-red-400"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
