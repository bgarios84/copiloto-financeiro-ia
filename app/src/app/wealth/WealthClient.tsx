"use client";

/**
 * WealthClient — Sprint 6.1
 *
 * Client Component da página /wealth (Patrimônio Manual).
 *
 * - Cards de resumo: patrimônio total, # de ativos, maior ativo
 * - Alocação por tipo (barra visual proporcional)
 * - Grade de ativos com WealthItem
 * - Modal de criação/edição
 */

import * as React from "react";
import { Plus, Landmark, AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { deleteManualAsset } from "@/services/manual-asset";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_ICONS,
  ASSET_TYPE_COLORS,
} from "@/types/manual-asset";
import type { ManualAsset, AssetByType } from "@/types/manual-asset";
import { WealthItem }      from "./WealthItem";
import { WealthFormModal } from "./WealthFormModal";

// ── Summary card ───────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "emerald" | "blue" | "violet";
}) {
  const colors = {
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    blue:    "from-blue-500/10    to-blue-600/5    border-blue-500/20",
    violet:  "from-violet-500/10  to-violet-600/5  border-violet-500/20",
  };
  const textColors = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue:    "text-blue-600    dark:text-blue-400",
    violet:  "text-violet-600  dark:text-violet-400",
  };
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", colors[color])}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[20px] font-bold tabular-nums", textColors[color])}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Allocation bar ─────────────────────────────────────────────────────────────

function AllocationBar({ byType }: { byType: AssetByType[] }) {
  if (byType.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[12px] font-semibold text-foreground">Alocação por tipo</p>
      {/* Stacked bar */}
      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
        {byType.map((t) => (
          <div
            key={t.asset_type}
            style={{
              width:           `${t.percentage}%`,
              backgroundColor: ASSET_TYPE_COLORS[t.asset_type],
            }}
            title={`${ASSET_TYPE_LABELS[t.asset_type]}: ${t.percentage.toFixed(1)}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {byType.map((t) => (
          <div key={t.asset_type} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: ASSET_TYPE_COLORS[t.asset_type] }}
            />
            <span className="text-[11px] text-muted-foreground truncate">
              {ASSET_TYPE_ICONS[t.asset_type]} {ASSET_TYPE_LABELS[t.asset_type]}
            </span>
            <span className="ml-auto text-[11px] font-semibold tabular-nums text-foreground">
              {t.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface WealthClientProps {
  initialAssets: ManualAsset[];
  initialError:  string | null;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function WealthClient({ initialAssets, initialError }: WealthClientProps) {
  const [assets,      setAssets]      = React.useState<ManualAsset[]>(initialAssets);
  const [globalError, setGlobalError] = React.useState<string | null>(initialError);
  const [modalOpen,   setModalOpen]   = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<ManualAsset | null>(null);
  const [deletingIds,  setDeletingIds]  = React.useState<Set<string>>(new Set());

  // ── Derived ────────────────────────────────────────────────────────────────

  const totalWealth = assets.reduce((s, a) => s + a.current_value, 0);

  const topAsset = assets.length > 0
    ? assets.reduce((top, a) => a.current_value > top.current_value ? a : top)
    : null;

  const byType = React.useMemo((): AssetByType[] => {
    const map = new Map<string, { total: number; count: number }>();
    for (const a of assets) {
      const existing = map.get(a.asset_type);
      if (existing) {
        existing.total += a.current_value;
        existing.count += 1;
      } else {
        map.set(a.asset_type, { total: a.current_value, count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([asset_type, { total, count }]) => ({
        asset_type: asset_type as ManualAsset["asset_type"],
        total,
        count,
        percentage: totalWealth > 0 ? (total / totalWealth) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [assets, totalWealth]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingAsset(null);
    setModalOpen(true);
  }

  function openEdit(asset: ManualAsset) {
    setEditingAsset(asset);
    setModalOpen(true);
  }

  function handleSuccess(asset: ManualAsset) {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === asset.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = asset;
        return next.sort((a, b) => b.current_value - a.current_value);
      }
      return [...prev, asset].sort((a, b) => b.current_value - a.current_value);
    });
    setGlobalError(null);
  }

  async function handleDelete(id: string) {
    setDeletingIds((s) => new Set(s).add(id));
    setGlobalError(null);
    const result = await deleteManualAsset(id);
    setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    if (result.error) {
      setGlobalError(result.error);
    } else {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Patrimônio</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {assets.length === 0
              ? "Adicione seus ativos para acompanhar seu patrimônio."
              : `${assets.length} ativo${assets.length > 1 ? "s" : ""} cadastrado${assets.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white",
            "bg-gradient-to-r from-emerald-500 to-blue-600 transition-opacity hover:opacity-90"
          )}
        >
          <Plus className="h-4 w-4" />
          Novo ativo
        </button>
      </div>

      {/* Error */}
      {globalError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="ml-auto font-medium underline underline-offset-2">
            Fechar
          </button>
        </div>
      )}

      {/* Summary cards */}
      {assets.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Patrimônio total"
            value={formatCurrency(totalWealth)}
            sub={`${assets.length} ativo${assets.length > 1 ? "s" : ""}`}
            color="emerald"
          />
          <SummaryCard
            label="Tipos de ativos"
            value={String(byType.length)}
            sub={byType[0] ? `Principal: ${ASSET_TYPE_LABELS[byType[0].asset_type]}` : undefined}
            color="blue"
          />
          <SummaryCard
            label="Maior ativo"
            value={topAsset ? formatCurrency(topAsset.current_value) : "—"}
            sub={topAsset?.name}
            color="violet"
          />
        </div>
      )}

      {/* Allocation chart */}
      {byType.length > 0 && (
        <div className="mb-6">
          <AllocationBar byType={byType} />
        </div>
      )}

      {/* Empty state */}
      {assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
            <Landmark className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-[15px] font-semibold text-foreground">Nenhum ativo cadastrado</p>
          <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
            Adicione imóveis, veículos, ações, cripto e outros ativos para consolidar seu patrimônio.
          </p>
          <button
            onClick={openCreate}
            className={cn(
              "mt-5 flex h-9 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold text-white",
              "bg-gradient-to-r from-emerald-500 to-blue-600 transition-opacity hover:opacity-90"
            )}
          >
            <Plus className="h-4 w-4" />
            Adicionar primeiro ativo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <WealthItem
              key={asset.id}
              asset={asset}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deletingIds.has(asset.id)}
            />
          ))}
        </div>
      )}

      <WealthFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        editing={editingAsset}
      />
    </>
  );
}
