"use client";

/**
 * WealthItem — Sprint 6.3
 *
 * Card de ativo patrimonial com suporte a multi-moeda:
 *   - Valor original na moeda do ativo
 *   - Equivalente em BRL quando currency !== BRL
 *   - Aviso "sem cotação" quando taxa indisponível
 *   - Valorização (current vs acquisition) em moeda original
 */

import * as React from "react";
import { Pencil, Trash2, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_ICONS,
  ASSET_TYPE_COLORS,
} from "@/types/manual-asset";
import type { ManualAsset } from "@/types/manual-asset";
import type { FxRateMap } from "@/types/fx-rate";
import { convertToBRL } from "@/lib/fx-rate";

// ── Currency formatter ─────────────────────────────────────────────────────────

function formatInCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style:    "currency",
      currency,
      minimumFractionDigits: currency === "BTC" || currency === "ETH" ? 6 : 2,
      maximumFractionDigits: currency === "BTC" || currency === "ETH" ? 6 : 2,
    }).format(amount);
  } catch {
    // fallback para moedas não suportadas pelo Intl (ex: BTC, ETH)
    return `${currency} ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  }
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface WealthItemProps {
  asset:    ManualAsset;
  rateMap:  FxRateMap;
  onEdit:   (asset: ManualAsset) => void;
  onDelete: (id: string) => Promise<void>;
  deleting: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WealthItem({ asset, rateMap, onEdit, onDelete, deleting }: WealthItemProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── FX conversion ──────────────────────────────────────────────────────────

  const isForeign     = asset.currency !== "BRL";
  const valueBRL      = convertToBRL(asset.current_value, asset.currency, rateMap);
  const hasFxRate     = !isForeign || valueBRL !== null;

  // ── Valorização (em moeda original) ───────────────────────────────────────

  const hasGain = asset.acquisition_value !== null && asset.acquisition_value > 0;
  const gainAmount = hasGain ? asset.current_value - asset.acquisition_value! : null;
  const gainPct    = hasGain
    ? ((asset.current_value - asset.acquisition_value!) / asset.acquisition_value!) * 100
    : null;

  // ── Delete confirm ─────────────────────────────────────────────────────────

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      timerRef.current = setTimeout(() => setConfirmDelete(false), 4000);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirmDelete(false);
      void onDelete(asset.id);
    }
  }

  React.useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const color = ASSET_TYPE_COLORS[asset.asset_type];
  const icon  = ASSET_TYPE_ICONS[asset.asset_type];
  const label = ASSET_TYPE_LABELS[asset.asset_type];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={cn(
      "group relative rounded-xl border border-border bg-card p-4",
      "transition-all hover:border-border/80 hover:shadow-sm",
      deleting && "opacity-50 pointer-events-none"
    )}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>

        {/* Name + type */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">{asset.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {label}
            </span>
            {asset.custodian && (
              <span className="text-[11px] text-muted-foreground truncate">
                · {asset.custodian}
              </span>
            )}
            {isForeign && !hasFxRate && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
                title="Taxa de câmbio indisponível — valor não incluído no total em BRL"
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                sem cotação
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={cn(
          "flex shrink-0 items-center gap-1",
          "opacity-0 group-hover:opacity-100 transition-opacity"
        )}>
          <button
            onClick={() => onEdit(asset)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              confirmDelete
                ? "bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
                : "text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
            )}
            title={confirmDelete ? "Clique novamente para confirmar" : "Excluir"}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Value block */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          {/* Primary value */}
          <p className="text-[11px] text-muted-foreground">
            Valor atual {isForeign && <span className="font-medium text-foreground/60">({asset.currency})</span>}
          </p>
          <p className="text-[20px] font-bold tabular-nums text-foreground">
            {isForeign
              ? formatInCurrency(asset.current_value, asset.currency)
              : formatCurrency(asset.current_value)}
          </p>

          {/* BRL equivalent for foreign assets */}
          {isForeign && (
            <p className={cn(
              "mt-0.5 text-[12px] tabular-nums",
              hasFxRate ? "font-semibold text-muted-foreground" : "text-amber-600 dark:text-amber-400"
            )}>
              {hasFxRate && valueBRL !== null
                ? `≈ ${formatCurrency(valueBRL)}`
                : "≈ BRL sem cotação"}
            </p>
          )}
        </div>

        {/* Gain/loss (in original currency) */}
        {gainAmount !== null && gainPct !== null && (
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Desde aquisição</p>
            <div className={cn(
              "flex items-center gap-1 justify-end text-[13px] font-semibold tabular-nums",
              gainAmount > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : gainAmount < 0
                ? "text-rose-600 dark:text-rose-500"
                : "text-muted-foreground"
            )}>
              {gainAmount > 0
                ? <TrendingUp  className="h-3.5 w-3.5" />
                : gainAmount < 0
                ? <TrendingDown className="h-3.5 w-3.5" />
                : <Minus       className="h-3.5 w-3.5" />}
              {gainAmount >= 0 ? "+" : ""}
              {isForeign
                ? formatInCurrency(gainAmount, asset.currency)
                : formatCurrency(gainAmount)}
              <span className="text-[11px] font-medium">
                ({gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%)
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Custo: {isForeign
                ? formatInCurrency(asset.acquisition_value!, asset.currency)
                : formatCurrency(asset.acquisition_value!)}
            </p>
          </div>
        )}
      </div>

      {/* Notes */}
      {asset.notes && (
        <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">{asset.notes}</p>
      )}

      {/* Confirm delete tooltip */}
      {confirmDelete && (
        <div className="absolute right-3 -top-7 z-10 rounded-md bg-rose-500 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
          Clique novamente para confirmar
        </div>
      )}
    </div>
  );
}
