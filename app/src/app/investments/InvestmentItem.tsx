"use client";

/**
 * InvestmentItem — linha de tabela de uma posição de investimento
 * Sprint 7.1   — badge "ao vivo" / "manual" no preço atual
 * Sprint 7.1.1 — coluna dedicada de proventos 12m por ativo
 */

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus, ClipboardList } from "lucide-react";
import type { InvestmentPosition } from "@/types/investment";
import { ASSET_CLASS_LABELS, ASSET_CLASS_ICONS, ASSET_CLASS_COLORS } from "@/types/investment";
import type { FxRateMap } from "@/types/fx-rate";
import type { B3QuoteMap } from "@/types/b3-market";
import type { DividendMap } from "@/types/b3-dividend";
import { DIVIDEND_EVENT_LABELS } from "@/types/b3-dividend";
import { convertToBRL } from "@/lib/fx-rate";
import {
  effectiveCurrentPrice,
  effectiveCurrentValue,
  isLiveQuote,
} from "@/lib/b3-market";
import { userAccumulatedDividends } from "@/lib/b3-dividend";

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

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function gainLoss(current: number | null, acquisition: number | null) {
  if (current === null || acquisition === null || acquisition === 0) return null;
  const abs = current - acquisition;
  const pct = (abs / acquisition) * 100;
  return { abs, pct };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  position:    InvestmentPosition;
  rateMap:     FxRateMap;
  b3QuoteMap:  B3QuoteMap;
  dividendMap: DividendMap;
  onEdit:      (p: InvestmentPosition) => void;
  onDelete:    (p: InvestmentPosition) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function InvestmentItem({ position, rateMap, b3QuoteMap, dividendMap, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const label = ASSET_CLASS_LABELS[position.asset_class] ?? position.asset_class;
  const icon  = ASSET_CLASS_ICONS[position.asset_class]  ?? "💰";
  const color = ASSET_CLASS_COLORS[position.asset_class] ?? "#6B7280";

  // Valores efetivos (B3 ao vivo ou manual)
  const effPrice = effectiveCurrentPrice(position, b3QuoteMap);
  const effValue = effectiveCurrentValue(position, b3QuoteMap);
  const live     = isLiveQuote(position, b3QuoteMap);

  const valueBRL = effValue !== null
    ? convertToBRL(effValue, position.currency, rateMap)
    : null;

  const gl = gainLoss(effValue, position.acquisition_value);

  // Proventos do ativo
  const divSummary  = position.ticker ? (dividendMap[position.ticker] ?? null) : null;
  const accumulated = divSummary ? userAccumulatedDividends(divSummary, position.quantity) : null;
  const nextEvent   = divSummary?.nextEvent ?? null;
  const dy          = divSummary?.dy ?? null;
  const hasDivData  = divSummary !== null;

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    onDelete(position);
  };

  // Badge de fonte do preço
  const priceBadge = live ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
      ao vivo
    </span>
  ) : (
    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">manual</span>
  );

  // Célula de proventos (desktop)
  const dividendCell = hasDivData ? (
    <div className="flex flex-col items-end gap-0.5">
      {dy !== null ? (
        <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
          {dy.toFixed(2)}% DY
        </span>
      ) : (
        <span className="text-xs text-zinc-400">—</span>
      )}
      {accumulated !== null && accumulated > 0 && (
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {fmtBRL(accumulated)}
        </span>
      )}
      {nextEvent ? (
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
          {DIVIDEND_EVENT_LABELS[nextEvent.event_type]} {fmtDate(nextEvent.payment_date)}
        </span>
      ) : (
        <span className="text-[10px] text-zinc-300 dark:text-zinc-600">Sem próx.</span>
      )}
    </div>
  ) : (
    <span className="text-zinc-300 dark:text-zinc-600 text-sm">—</span>
  );

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
        <td className="px-3 py-3 text-right hidden xl:table-cell">
          {effPrice !== null ? (
            <div className="flex flex-col items-end">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {fmtCurrency(effPrice, position.currency)}
              </span>
              {priceBadge}
            </div>
          ) : (
            <span className="text-zinc-400 text-sm">—</span>
          )}
        </td>

        {/* Valor atual */}
        <td className="px-3 py-3 text-right">
          {effValue !== null ? (
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {fmtCurrency(effValue, position.currency)}
              </p>
              {position.currency !== "BRL" && (
                <p className="text-xs mt-0.5">
                  {valueBRL !== null
                    ? <span className="text-zinc-400 dark:text-zinc-500">{fmtBRL(valueBRL)}</span>
                    : <span className="text-amber-500">sem cotacao</span>
                  }
                </p>
              )}
            </div>
          ) : (
            <span className="text-zinc-400 text-sm">—</span>
          )}
        </td>

        {/* Proventos 12m */}
        <td className="px-3 py-3 text-right hidden lg:table-cell">
          {dividendCell}
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
            <Link
              href={`/investments/${position.id}/trades`}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Ver operacoes"
            >
              <ClipboardList className="w-3.5 h-3.5" />
            </Link>
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
              title={confirmDelete ? "Confirmar exclusao" : "Excluir"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* ── Mobile row (< md) ─────────────────────────────────────────────── */}
      <tr className="md:hidden border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <td colSpan={11} className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ backgroundColor: color + "20" }}
            >
              {icon}
            </div>

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
              {/* Proventos mobile */}
              {hasDivData && dy !== null && (
                <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
                  DY {dy.toFixed(2)}%
                  {nextEvent ? ` · Próx. ${fmtDate(nextEvent.payment_date)}` : ""}
                </p>
              )}
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {effValue !== null ? fmtCurrency(effValue, position.currency) : "—"}
              </p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {gl !== null && (
                  <p className={`text-xs font-medium ${
                    gl.abs >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                  }`}>
                    {gl.pct >= 0 ? "+" : ""}{gl.pct.toFixed(2)}%
                  </p>
                )}
                {priceBadge}
              </div>
              {accumulated !== null && accumulated > 0 && (
                <p className="text-[10px] text-zinc-400 mt-0.5">{fmtBRL(accumulated)}</p>
              )}
            </div>

            <div className="flex flex-col gap-1 flex-shrink-0">
              <Link
                href={`/investments/${position.id}/trades`}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-blue-600 transition-colors"
                title="Ver operacoes"
              >
                <ClipboardList className="w-3.5 h-3.5" />
              </Link>
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
