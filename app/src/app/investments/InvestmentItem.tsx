"use client";

/**
 * InvestmentItem — linha de tabela de uma posição de investimento
 * Sprint 6.4.1 — layout tabela compacta
 */

import { useState } from "react";
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { InvestmentPosition } from "@/types/investment";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ICONS, ASSET_CLASS_COLORS } from "@/types/investment";
import type { FxRateMap } from "@/types/fx-rate";
import { convertToBRL } from "@/lib/fx-rate";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(
  n: number | null,
  opts: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
): string {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", opts);
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function fmtCurrency(amount: number, currency: string): string {
  try {
    const maxDec = ["BTC", "ETH"].includes(currency) ? 8 : 2;
    return new Intl.NumberFormat("pt-BR", {
      style:    "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDec,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
}

function gainLoss(current: number | null, acquisition: number | null) {
  if (current === null || acquisition === null || acquisition === 0) return null;
  const abs = current - acquisition;
  const pct = (abs / acquisition) * 100;
  return { abs, pct };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  position: InvestmentPosition;
  rateMap:  FxRateMap;
  onEdit:   (p: InvestmentPosition) => void;
  onDelete: (p: InvestmentPosition) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvestmentItem({ position, rateMap, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const label      = ASSET_CLASS_LABELS[position.asset_class] ?? position.asset_class;
  const icon       = ASSET_CLASS_ICONS[position.asset_class]  ?? "💰";
  const color      = ASSET_CLASS_COLORS[position.asset_class] ?? "#6B7280";

  const currentBRL = position.current_value !== null
    ? convertToBRL(position.current_value, position.currency, rateMap)
    : null;

  const gl = gainLoss(position.current_value, position.acquisition_value);

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(position);
  };

  return (
    <>
      {/* ── Desktop row (md+) ─────────────────────────────────────────────── */}
      <tr className="hidden md:table-row group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0">

        {/* Ativo */}
        <td className="px-4 py-3 min-w-[180px]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
              style={{ backgroundColor: color + "20" }}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]">
                {position.asset_name}
              </p>
              {position.ticker && (
                <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase">
                  {position.ticker}
                </p>
              )}
            </div>
          </div>
        </td>

        {/* Classe */}
        <td className="px-3 py-3 hidden lg:table-cell">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
            style={{ backgroundColor: color + "18", color }}
          >
            {label}
          </span>
        </td>

        {/* Qtd */}
        <td className="px-3 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400 hidden lg:table-cell">
          {fmtNum(position.quantity, { minimumFractionDigits: 0, maximumFractionDigits: 8 })}
        </td>

        {/* Preço médio */}
        <td className="px-3 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400 hidden xl:table-cell">
          {position.average_price !== null
            ? fmtCurrency(position.average_price, position.currency)
            : "—"}
        </td>

        {/* Preço atual */}
        <td className="px-3 py-3 text-right text-sm text-zinc-600 dark:text-zinc-400 hidden xl:table-cell">
          {position.current_price !== null
            ? fmtCurrency(position.current_price, position.currency)
            : "—"}
        </td>

        {/* Valor atual */}
        <td className="px-3 py-3 text-right">
          {position.current_value !== null ? (
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {fmtCurrency(position.current_value, position.currency)}
              </p>
              {position.currency !== "BRL" && (
                <p className="text-xs mt-0.5">
                  {currentBRL !== null
                    ? <span className="text-zinc-400 dark:text-zinc-500">{fmtBRL(currentBRL)}</span>
                    : <span className="text-amber-500">sem cotação</span>
                  }
                </p>
              )}
            </div>
          ) : (
            <span className="text-zinc-400 text-sm">—</span>
          )}
        </td>

        {/* Moeda */}
        <td className="px-3 py-3 text-center hidden md:table-cell">
          <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
            {position.currency}
          </span>
        </td>

        {/* Resultado */}
        <td className="px-3 py-3 text-right">
          {gl !== null ? (
            <div className={`flex flex-col items-end text-sm font-medium ${
              gl.abs >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
            }`}>
              <span className="flex items-center gap-1">
                {gl.abs > 0
                  ? <TrendingUp   className="w-3.5 h-3.5" />
                  : gl.abs < 0
                    ? <TrendingDown className="w-3.5 h-3.5" />
                    : <Minus        className="w-3.5 h-3.5 text-zinc-400" />
                }
                {gl.pct >= 0 ? "+" : ""}{gl.pct.toFixed(2)}%
              </span>
              <span className="text-xs opacity-80">
                {gl.abs >= 0 ? "+" : ""}{fmtCurrency(gl.abs, position.currency)}
              </span>
            </div>
          ) : (
            <span className="text-zinc-400 text-sm">—</span>
          )}
        </td>

        {/* Instituição */}
        <td className="px-3 py-3 text-sm text-zinc-500 dark:text-zinc-400 hidden xl:table-cell max-w-[120px]">
          <span className="truncate block">{position.institution ?? "—"}</span>
        </td>

        {/* Ações */}
        <td className="px-3 py-3">
          <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(position)}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              title="Editar"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                confirmDelete
                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-red-500"
              }`}
              title={confirmDelete ? "Confirmar exclusão" : "Excluir"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* ── Mobile row (< md) ─────────────────────────────────────────────── */}
      <tr className="md:hidden border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <td colSpan={10} className="px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ backgroundColor: color + "20" }}
            >
              {icon}
            </div>

            {/* Name + class */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {position.ticker
                  ? <><span className="font-mono">{position.ticker}</span> · {position.asset_name}</>
                  : position.asset_name
                }
              </p>
              <span
                className="inline-flex text-xs px-1.5 py-0.5 rounded-full mt-0.5"
                style={{ backgroundColor: color + "18", color }}
              >
                {label}
              </span>
            </div>

            {/* Value + result */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {position.current_value !== null
                  ? fmtCurrency(position.current_value, position.currency)
                  : "—"}
              </p>
              {gl !== null && (
                <p className={`text-xs font-medium ${
                  gl.abs >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                }`}>
                  {gl.pct >= 0 ? "+" : ""}{gl.pct.toFixed(2)}%
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                onClick={() => onEdit(position)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDelete}
                onBlur={() => setConfirmDelete(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  confirmDelete
                    ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500"
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
