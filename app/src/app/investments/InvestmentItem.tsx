"use client";

/**
 * InvestmentItem — card de uma posição de investimento
 * Sprint 6.4
 */

import { useState }  from "react";
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { InvestmentPosition } from "@/types/investment";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ICONS, ASSET_CLASS_COLORS } from "@/types/investment";
import type { FxRateMap } from "@/types/fx-rate";
import { convertToBRL } from "@/lib/fx-rate";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style:    "currency",
      currency,
      minimumFractionDigits: currency === "BRL" ? 2 : 2,
      maximumFractionDigits: ["BTC", "ETH"].includes(currency) ? 8 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
}

function formatBRL(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style:    "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(amount);
}

function gainLoss(current: number | null, acquisition: number | null) {
  if (current === null || acquisition === null || acquisition === 0) return null;
  const abs = current - acquisition;
  const pct = (abs / acquisition) * 100;
  return { abs, pct };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  position:  InvestmentPosition;
  rateMap:   FxRateMap;
  onEdit:    (p: InvestmentPosition) => void;
  onDelete:  (p: InvestmentPosition) => void;
}

export function InvestmentItem({ position, rateMap, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const label      = ASSET_CLASS_LABELS[position.asset_class] ?? position.asset_class;
  const icon       = ASSET_CLASS_ICONS[position.asset_class]  ?? "💰";
  const accentColor = ASSET_CLASS_COLORS[position.asset_class] ?? "#6B7280";

  const currentBRL = position.current_value !== null
    ? convertToBRL(position.current_value, position.currency, rateMap)
    : null;

  const gl = gainLoss(position.current_value, position.acquisition_value);

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(position);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: accentColor + "20" }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {position.asset_name}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {position.ticker && (
                <span className="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                  {position.ticker}
                </span>
              )}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: accentColor + "20", color: accentColor }}
              >
                {label}
              </span>
              {position.currency !== "BRL" && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {position.currency}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(position)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            title="Editar"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            className={`p-1.5 rounded-lg transition-colors ${
              confirmDelete
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-red-500"
            }`}
            title={confirmDelete ? "Confirmar exclusão" : "Excluir"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Values */}
      <div className="space-y-1">
        {position.current_value !== null ? (
          <>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(position.current_value, position.currency)}
            </p>
            {position.currency !== "BRL" && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {currentBRL !== null
                  ? `≈ ${formatBRL(currentBRL)}`
                  : <span className="text-amber-500">≈ BRL sem cotação</span>
                }
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">
            Valor não informado
          </p>
        )}
      </div>

      {/* Gain / Loss */}
      {gl !== null && (
        <div className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${
          gl.abs >= 0
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-500 dark:text-red-400"
        }`}>
          {gl.abs > 0
            ? <TrendingUp  className="w-4 h-4" />
            : gl.abs < 0
              ? <TrendingDown className="w-4 h-4" />
              : <Minus className="w-4 h-4 text-zinc-400" />
          }
          <span>
            {gl.abs >= 0 ? "+" : ""}
            {formatCurrency(gl.abs, position.currency)}
            {" "}({gl.pct >= 0 ? "+" : ""}{gl.pct.toFixed(2)}%)
          </span>
        </div>
      )}

      {/* Footer metadata */}
      <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500 flex-wrap">
        {position.quantity !== null && (
          <span>
            {position.quantity.toLocaleString("pt-BR")} un.
          </span>
        )}
        {position.institution && (
          <span className="truncate">{position.institution}</span>
        )}
        {position.notes && (
          <span className="truncate italic">{position.notes}</span>
        )}
      </div>
    </div>
  );
}
