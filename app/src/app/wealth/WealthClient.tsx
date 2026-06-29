"use client";

/**
 * WealthClient — Sprint 6.3
 *
 * Client Component da página /wealth com consolidação multi-moeda.
 *
 * - Patrimônio total consolidado em BRL (via fx_rate)
 * - Aviso de moedas sem cotação disponível
 * - Breakdown por moeda + por tipo de ativo
 * - Barra de alocação proporcional
 * - Grade de ativos com WealthItem
 */

import * as React from "react";
import { Plus, Landmark, AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { deleteManualAsset } from "@/services/manual-asset";
import { convertToBRL, consolidateInBRL } from "@/lib/fx-rate";
import {
  ASSET_TYPE_LABELS,
  ASSET_TYPE_ICONS,
  ASSET_TYPE_COLORS,
} from "@/types/manual-asset";
import type { ManualAsset, AssetByType } from "@/types/manual-asset";
import type { FxRateMap } from "@/types/fx-rate";
import { WealthItem }      from "./WealthItem";
import { WealthFormModal } from "./WealthFormModal";

// ── Currency label ─────────────────────────────────────────────────────────────

const CURRENCY_NAMES: Record<string, string> = {
  BRL: "Real (BRL)",
  USD: "Dólar (USD)",
  EUR: "Euro (EUR)",
  BTC: "Bitcoin (BTC)",
  ETH: "Ethereum (ETH)",
};

// ── Summary card ───────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, color, warning,
}: {
  label:   string;
  value:   string;
  sub?:    string;
  color:   "emerald" | "blue" | "violet" | "amber";
  warning?: boolean;
}) {
  const colors = {
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    blue:    "from-blue-500/10    to-blue-600/5    border-blue-500/20",
    violet:  "from-violet-500/10  to-violet-600/5  border-violet-500/20",
    amber:   "from-amber-500/10   to-amber-600/5   border-amber-500/20",
  };
  const textColors = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue:    "text-blue-600    dark:text-blue-400",
    violet:  "text-violet-600  dark:text-violet-400",
    amber:   "text-amber-600   dark:text-amber-400",
  };
  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", colors[color])}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[20px] font-bold tabular-nums", textColors[color])}>
        {value}
        {warning && <AlertTriangle className="ml-1.5 inline h-4 w-4 text-amber-500" />}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Allocation bar ─────────────────────────────────────────────────────────────

function AllocationBar({ byType }: { byType: AssetByType[] }) {
  if (byType.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[12px] font-semibold text-foreground">Alocação por tipo (em BRL)</p>
      <div className="mb-4 flex h-3 w-full overflow-hidden rounded-full">
        {byType.map((t) => (
          <div
            key={t.asset_type}
            style={{ width: `${t.percentage}%`, backgroundColor: ASSET_TYPE_COLORS[t.asset_type] }}
            title={`${ASSET_TYPE_LABELS[t.asset_type]}: ${t.percentage.toFixed(1)}%`}
          />
        ))}
      </div>
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
            <span className="ml-auto text-[11px] font-semibold tabular-nums text-foreground shrink-0">
              {t.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Currency breakdown ─────────────────────────────────────────────────────────

function CurrencyBreakdown({
  byCurrency,
  totalBRL,
}: {
  byCurrency: Array<{ currency: string; totalBRL: number | null; count: number }>;
  totalBRL: number;
}) {
  if (byCurrency.length <= 1 && byCurrency[0]?.currency === "BRL") return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="mb-3 text-[12px] font-semibold text-foreground">Por moeda</p>
      <div className="flex flex-col gap-2">
        {byCurrency.map(({ currency, totalBRL: brl, count }) => (
          <div key={currency} className="flex items-center gap-3">
            <span className="w-10 shrink-0 text-[12px] font-semibold text-foreground">{currency}</span>
            <div className="flex-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                {brl !== null && totalBRL > 0 && (
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min((brl / totalBRL) * 100, 100)}%` }}
                  />
                )}
              </div>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {brl !== null
                ? `${formatCurrency(brl)} (${totalBRL > 0 ? ((brl / totalBRL) * 100).toFixed(0) : 0}%)`
                : <span className="text-amber-500">sem cotação</span>}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {count} ativo{count > 1 ? "s" : ""}
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
  rateMap:       FxRateMap;
  rateError:     string | null;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function WealthClient({
  initialAssets,
  initialError,
  rateMap,
  rateError,
}: WealthClientProps) {
  const [assets,       setAssets]       = React.useState<ManualAsset[]>(initialAssets);
  const [globalError,  setGlobalError]  = React.useState<string | null>(initialError);
  const [modalOpen,    setModalOpen]    = React.useState(false);
  const [editingAsset, setEditingAsset] = React.useState<ManualAsset | null>(null);
  const [deletingIds,  setDeletingIds]  = React.useState<Set<string>>(new Set());

  // ── Consolidation ──────────────────────────────────────────────────────────

  const { totalBRL, missing } = React.useMemo(
    () => consolidateInBRL(
      assets.map((a) => ({ amount: a.current_value, currency: a.currency })),
      rateMap
    ),
    [assets, rateMap]
  );

  // Alocação por tipo (em BRL, ignorando ativos sem taxa)
  const byType = React.useMemo((): AssetByType[] => {
    const map = new Map<string, { total: number; count: number }>();
    for (const a of assets) {
      const brl = convertToBRL(a.current_value, a.currency, rateMap);
      if (brl === null) continue;
      const existing = map.get(a.asset_type);
      if (existing) { existing.total += brl; existing.count += 1; }
      else           { map.set(a.asset_type, { total: brl, count: 1 }); }
    }
    return Array.from(map.entries())
      .map(([asset_type, { total, count }]) => ({
        asset_type: asset_type as ManualAsset["asset_type"],
        total,
        count,
        percentage: totalBRL > 0 ? (total / totalBRL) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [assets, rateMap, totalBRL]);

  // Breakdown por moeda
  const byCurrency = React.useMemo(() => {
    const map = new Map<string, { totalBRL: number | null; count: number }>();
    for (const a of assets) {
      const brl = convertToBRL(a.current_value, a.currency, rateMap);
      const existing = map.get(a.currency);
      if (existing) {
        existing.count += 1;
        if (brl !== null && existing.totalBRL !== null) existing.totalBRL += brl;
        else existing.totalBRL = null;
      } else {
        map.set(a.currency, { totalBRL: brl, count: 1 });
      }
    }
    return Array.from(map.entries())
      .map(([currency, { totalBRL: brl, count }]) => ({ currency, totalBRL: brl, count }))
      .sort((a, b) => (b.totalBRL ?? 0) - (a.totalBRL ?? 0));
  }, [assets, rateMap]);

  const topAsset = assets.length > 0
    ? assets.reduce((top, a) => {
        const brlA = convertToBRL(a.current_value, a.currency, rateMap) ?? 0;
        const brlT = convertToBRL(top.current_value, top.currency, rateMap) ?? 0;
        return brlA > brlT ? a : top;
      })
    : null;

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openCreate()             { setEditingAsset(null); setModalOpen(true); }
  function openEdit(a: ManualAsset) { setEditingAsset(a);    setModalOpen(true); }

  function handleSuccess(asset: ManualAsset) {
    setAssets((prev) => {
      const idx = prev.findIndex((a) => a.id === asset.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = asset;
        return next.sort((a, b) => {
          const bA = convertToBRL(a.current_value, a.currency, rateMap) ?? 0;
          const bB = convertToBRL(b.current_value, b.currency, rateMap) ?? 0;
          return bB - bA;
        });
      }
      return [...prev, asset].sort((a, b) => {
        const bA = convertToBRL(a.current_value, a.currency, rateMap) ?? 0;
        const bB = convertToBRL(b.current_value, b.currency, rateMap) ?? 0;
        return bB - bA;
      });
    });
    setGlobalError(null);
  }

  async function handleDelete(id: string) {
    setDeletingIds((s) => new Set(s).add(id));
    setGlobalError(null);
    const result = await deleteManualAsset(id);
    setDeletingIds((s) => { const n = new Set(s); n.delete(id); return n; });
    if (result.error) setGlobalError(result.error);
    else              setAssets((prev) => prev.filter((a) => a.id !== id));
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
              : `${assets.length} ativo${assets.length > 1 ? "s" : ""} · consolidado em BRL`}
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

      {/* Rate error */}
      {rateError && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Taxas de câmbio indisponíveis: {rateError}. Valores em moeda estrangeira não serão consolidados.</span>
        </div>
      )}

      {/* Missing currencies warning */}
      {missing.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Sem cotação para {missing.join(", ")} — estes ativos não estão incluídos no total em BRL.
          </span>
          <span className="ml-auto text-[10px] text-amber-500/60 shrink-0" aria-label="Cotações atualizadas diariamente"><RefreshCw className="h-3.5 w-3.5" /></span>
        </div>
      )}

      {/* Global error */}
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
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Total consolidado (BRL)"
            value={formatCurrency(totalBRL)}
            sub={missing.length > 0 ? `+ ${missing.length} moeda${missing.length > 1 ? "s" : ""} sem cotação` : undefined}
            color="emerald"
            warning={missing.length > 0}
          />
          <SummaryCard
            label="Ativos cadastrados"
            value={String(assets.length)}
            sub={`${byType.length} tipo${byType.length > 1 ? "s" : ""}`}
            color="blue"
          />
          <SummaryCard
            label="Maior ativo (BRL)"
            value={topAsset ? formatCurrency(convertToBRL(topAsset.current_value, topAsset.currency, rateMap) ?? topAsset.current_value) : "—"}
            sub={topAsset?.name}
            color="violet"
          />
          <SummaryCard
            label="Moedas"
            value={String(new Set(assets.map((a) => a.currency)).size)}
            sub={missing.length > 0 ? `${missing.length} sem cotação` : "todas cobertas"}
            color={missing.length > 0 ? "amber" : "emerald"}
            warning={missing.length > 0}
          />
        </div>
      )}

      {/* Currency breakdown */}
      {byCurrency.length > 1 && (
        <div className="mb-6">
          <CurrencyBreakdown byCurrency={byCurrency} totalBRL={totalBRL} />
        </div>
      )}

      {/* Allocation by type */}
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
              rateMap={rateMap}
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
