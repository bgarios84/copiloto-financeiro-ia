"use client";

/**
 * Dashboard — Seção Patrimônio Consolidado
 * Sprint 7.4
 *
 * Componente separado para manter DashboardClient enxuto.
 * Renderiza:
 *   1. PatrimonioConsolidadoBanner  — total + 3 buckets (contas, investimentos, manual)
 *   2. Row: AlocacaoClasseCard | ExposicaoMoedaCard | DividendosCard
 *   3. InsightsSection              — 4 chips de insights simples
 */

import * as React from "react";
import {
  TrendingUp,
  Building2,
  Landmark,
  Coins,
  Globe2,
  Lightbulb,
  AlertTriangle,
  ChevronRight,
  PieChart,
  BarChart3,
} from "lucide-react";
import { DonutChart }       from "@/components/charts/DonutChart";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ASSET_CLASS_LABELS,
  ASSET_CLASS_COLORS,
} from "@/types/investment";
import type { AssetClass }       from "@/types/investment";
import type { DashboardData }    from "@/types/dashboard";
import type { InvestmentPosition } from "@/types/investment";
import type { B3QuoteMap }       from "@/types/b3-market";
import type { FxRateMap }        from "@/types/fx-rate";

// ── Constants ─────────────────────────────────────────────────────────────────

const B3_CLASSES = ["stock_br", "fii", "etf_br", "bdr"] as const;

const CURRENCY_COLORS: Record<string, string> = {
  BRL: "#3B82F6",
  USD: "#10B981",
  EUR: "#8B5CF6",
  GBP: "#F59E0B",
  BTC: "#F97316",
  ETH: "#6366F1",
};
const DEFAULT_CURRENCY_COLOR = "#6B7280";

// ── Helpers ───────────────────────────────────────────────────────────────────

function effectiveValue(
  pos:         InvestmentPosition,
  b3QuoteMap:  B3QuoteMap
): number {
  if (
    (B3_CLASSES as readonly string[]).includes(pos.asset_class) &&
    pos.ticker &&
    b3QuoteMap[pos.ticker]
  ) {
    const marketPrice = b3QuoteMap[pos.ticker];
    if (pos.quantity !== null) return pos.quantity * marketPrice;
  }
  if (pos.current_value !== null) return pos.current_value;
  if (pos.quantity !== null && pos.current_price !== null)
    return pos.quantity * pos.current_price;
  return 0;
}

function toBRL(value: number, currency: string, fxRateMap: FxRateMap): number {
  if (currency === "BRL") return value;
  const rate = fxRateMap[currency];
  return rate ? value * rate : value; // fallback 1:1 (aviso mostrado)
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function currencyColor(currency: string): string {
  return CURRENCY_COLORS[currency] ?? DEFAULT_CURRENCY_COLOR;
}

// ── Métricas derivadas ────────────────────────────────────────────────────────

interface PatrimonioMetrics {
  totalPatrimonio:        number;
  totalAccounts:          number;
  totalInvestments:       number;
  totalManualAssets:      number;
  pctAccounts:            number;
  pctInvestments:         number;
  pctManual:              number;
  investmentsByClass:     Record<string, number>;
  currencyExposure:       Record<string, number>;
  totalDividends12m:      number;
  nextDividendDate:       string | null;
  nextDividendTicker:     string | null;
  topDividendTicker:      string | null;
  topDividendValue:       number;
  biggestPositionName:    string | null;
  biggestPositionBRL:     number;
  missingRates:           string[];
}

function buildMetrics(data: DashboardData): PatrimonioMetrics {
  const { summary, patrimonio } = data;
  const { investments, manualAssets, b3QuoteMap, dividendMap, fxRateMap } = patrimonio;

  const totalAccounts = summary?.total_balance ?? 0;

  // ── Investimentos ──────────────────────────────────────────────────────
  let totalInvestments = 0;
  const investmentsByClass: Record<string, number> = {};
  const investByCur: Record<string, number> = {};

  for (const pos of investments) {
    const raw     = effectiveValue(pos, b3QuoteMap);
    const valueBRL = toBRL(raw, pos.currency, fxRateMap);
    totalInvestments += valueBRL;
    investmentsByClass[pos.asset_class] =
      (investmentsByClass[pos.asset_class] ?? 0) + valueBRL;
    investByCur[pos.currency] = (investByCur[pos.currency] ?? 0) + valueBRL;
  }

  // ── Ativos manuais ─────────────────────────────────────────────────────
  let totalManualAssets = 0;
  const manualByCur: Record<string, number> = {};

  for (const asset of manualAssets) {
    const valueBRL = toBRL(asset.current_value, asset.currency, fxRateMap);
    totalManualAssets += valueBRL;
    manualByCur[asset.currency] = (manualByCur[asset.currency] ?? 0) + valueBRL;
  }

  const totalPatrimonio = totalAccounts + totalInvestments + totalManualAssets;

  const pct = (v: number) =>
    totalPatrimonio > 0 ? (v / totalPatrimonio) * 100 : 0;

  // ── Exposição por moeda ────────────────────────────────────────────────
  const currencyExposure: Record<string, number> = {};
  currencyExposure["BRL"] = (currencyExposure["BRL"] ?? 0) + totalAccounts;
  for (const [cur, val] of Object.entries(investByCur)) {
    currencyExposure[cur] = (currencyExposure[cur] ?? 0) + val;
  }
  for (const [cur, val] of Object.entries(manualByCur)) {
    currencyExposure[cur] = (currencyExposure[cur] ?? 0) + val;
  }

  // ── Dividendos ─────────────────────────────────────────────────────────
  let totalDividends12m = 0;
  let nextDividendDate: string | null  = null;
  let nextDividendTicker: string | null = null;
  let topDividendTicker: string | null  = null;
  let topDividendValue  = 0;

  for (const pos of investments) {
    if (!pos.ticker) continue;
    const ds  = dividendMap[pos.ticker];
    if (!ds)  continue;
    const qty    = pos.quantity ?? 0;
    const earned = ds.totalPerShare12m * qty;
    totalDividends12m += earned;

    if (earned > topDividendValue) {
      topDividendValue  = earned;
      topDividendTicker = pos.ticker;
    }
    if (ds.nextEvent?.payment_date) {
      if (!nextDividendDate || ds.nextEvent.payment_date < nextDividendDate) {
        nextDividendDate   = ds.nextEvent.payment_date;
        nextDividendTicker = pos.ticker;
      }
    }
  }

  // ── Maior posição ──────────────────────────────────────────────────────
  let biggestPositionName: string | null = null;
  let biggestPositionBRL  = 0;

  for (const pos of investments) {
    const valueBRL = toBRL(effectiveValue(pos, b3QuoteMap), pos.currency, fxRateMap);
    if (valueBRL > biggestPositionBRL) {
      biggestPositionBRL  = valueBRL;
      biggestPositionName = pos.ticker ?? pos.asset_name;
    }
  }

  // ── Moedas sem cotação ─────────────────────────────────────────────────
  const allCurrencies = new Set([
    ...investments.map(p => p.currency),
    ...manualAssets.map(a => a.currency),
  ]);
  const missingRates = [...allCurrencies].filter(
    c => c !== "BRL" && !fxRateMap[c]
  );

  return {
    totalPatrimonio,
    totalAccounts,
    totalInvestments,
    totalManualAssets,
    pctAccounts:      pct(totalAccounts),
    pctInvestments:   pct(totalInvestments),
    pctManual:        pct(totalManualAssets),
    investmentsByClass,
    currencyExposure,
    totalDividends12m,
    nextDividendDate,
    nextDividendTicker,
    topDividendTicker,
    topDividendValue,
    biggestPositionName,
    biggestPositionBRL,
    missingRates,
  };
}

// ═══════════════════════════════════════════════════════════════
// ENTRY POINT — exportado e usado em DashboardClient
// ═══════════════════════════════════════════════════════════════

export function DashboardPatrimonioSection({ data }: { data: DashboardData }) {
  const { investments, manualAssets } = data.patrimonio;
  const hasData = investments.length > 0 || manualAssets.length > 0;

  if (!hasData) {
    return (
      <PatrimonioEmptyState />
    );
  }

  const m = buildMetrics(data);

  return (
    <div className="space-y-4">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-foreground">
            Patrimônio &amp; Investimentos
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Visão consolidada de contas, investimentos e ativos manuais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/investments" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
            Investimentos <ChevronRight className="h-3 w-3" />
          </a>
          <a href="/wealth" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
            Patrimônio <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Banner total */}
      <PatrimonioConsolidadoBanner m={m} />

      {/* 3 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AlocacaoClasseCard m={m} />
        <ExposicaoMoedaCard m={m} />
        <DividendosCard m={m} />
      </div>

      {/* Insights */}
      <InsightsSection m={m} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════

function PatrimonioEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20">
        <TrendingUp className="h-6 w-6 text-blue-500" />
      </div>
      <h3 className="text-[14px] font-semibold text-foreground">
        Patrimônio &amp; Investimentos
      </h3>
      <p className="mt-1 text-[12px] text-muted-foreground max-w-xs mx-auto">
        Cadastre investimentos ou ativos manuais para ver sua visão patrimonial consolidada.
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        <a
          href="/investments"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-4 text-[12px] font-semibold text-primary-foreground hover:opacity-90"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Adicionar investimento
        </a>
        <a
          href="/wealth"
          className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-4 text-[12px] font-medium text-foreground hover:bg-secondary"
        >
          Cadastrar ativo
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BANNER — Patrimônio Consolidado
// ═══════════════════════════════════════════════════════════════

function PatrimonioConsolidadoBanner({ m }: { m: PatrimonioMetrics }) {
  const buckets = [
    {
      label:  "Contas",
      value:  m.totalAccounts,
      pct:    m.pctAccounts,
      color:  "#3B82F6",
      bg:     "bg-blue-500/10",
      text:   "text-blue-600 dark:text-blue-400",
      icon:   Landmark,
      href:   "/accounts",
    },
    {
      label:  "Investimentos",
      value:  m.totalInvestments,
      pct:    m.pctInvestments,
      color:  "#10B981",
      bg:     "bg-emerald-500/10",
      text:   "text-emerald-600 dark:text-emerald-400",
      icon:   TrendingUp,
      href:   "/investments",
    },
    {
      label:  "Patrimônio Manual",
      value:  m.totalManualAssets,
      pct:    m.pctManual,
      color:  "#8B5CF6",
      bg:     "bg-violet-500/10",
      text:   "text-violet-600 dark:text-violet-400",
      icon:   Building2,
      href:   "/wealth",
    },
  ] as const;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      {/* Total */}
      <div className="mb-5">
        <p className="text-[12px] font-medium text-muted-foreground">Patrimônio Total Consolidado</p>
        <p className="mt-0.5 text-[32px] font-bold tracking-tight text-foreground tabular-nums">
          {formatCurrency(m.totalPatrimonio)}
        </p>
      </div>

      {/* Barra proporcional */}
      <div className="mb-5 flex h-3 w-full overflow-hidden rounded-full gap-0.5">
        {buckets.map((b) => (
          b.pct > 0.5 ? (
            <div
              key={b.label}
              className="h-full rounded-full transition-all"
              style={{ width: `${b.pct}%`, backgroundColor: b.color }}
              title={`${b.label}: ${b.pct.toFixed(1)}%`}
            />
          ) : null
        ))}
      </div>

      {/* 3 buckets */}
      <div className="grid grid-cols-3 gap-3">
        {buckets.map((b) => (
          <a key={b.label} href={b.href} className="group">
            <div className="rounded-xl p-3 border border-transparent hover:border-border hover:bg-secondary/50 transition-all">
              <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", b.bg)}>
                <b.icon className={cn("h-4 w-4", b.text)} />
              </div>
              <p className="text-[11px] text-muted-foreground">{b.label}</p>
              <p className={cn("text-[15px] font-bold tabular-nums", b.text)}>
                {formatCurrency(b.value)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {b.pct.toFixed(1).replace(".", ",")}% do total
              </p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALOCAÇÃO POR CLASSE
// ═══════════════════════════════════════════════════════════════

function AlocacaoClasseCard({ m }: { m: PatrimonioMetrics }) {
  const entries = Object.entries(m.investmentsByClass)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const total = entries.reduce((s, [, v]) => s + v, 0);

  const donutData = entries.map(([cls, val]) => ({
    label: ASSET_CLASS_LABELS[cls as AssetClass] ?? cls,
    value: total > 0 ? Math.round((val / total) * 100) : 0,
    color: ASSET_CLASS_COLORS[cls as AssetClass] ?? "#6B7280",
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Alocação por Classe</p>
          <p className="text-[11px] text-muted-foreground">Investimentos em BRL</p>
        </div>
        <a href="/investments" className="text-[11px] text-primary hover:underline">
          Ver todos
        </a>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <PieChart className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-[12px] text-muted-foreground">Sem posições cadastradas</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <DonutChart
              data={donutData}
              size={120}
              strokeWidth={20}
              centerLabel="Invest."
              centerValue={total >= 1000
                ? `R$${(total / 1000).toFixed(0)}k`
                : formatCurrency(total)}
            />
          </div>
          <div className="space-y-2">
            {donutData.slice(0, 5).map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="flex-1 text-[11px] text-muted-foreground truncate">
                  {d.label}
                </span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">
                  {d.value}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPOSIÇÃO POR MOEDA
// ═══════════════════════════════════════════════════════════════

function ExposicaoMoedaCard({ m }: { m: PatrimonioMetrics }) {
  const entries = Object.entries(m.currencyExposure)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const total = entries.reduce((s, [, v]) => s + v, 0);

  const donutData = entries.map(([cur, val]) => ({
    label: cur,
    value: total > 0 ? Math.round((val / total) * 100) : 0,
    color: currencyColor(cur),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Exposição por Moeda</p>
          <p className="text-[11px] text-muted-foreground">Patrimônio total em BRL</p>
        </div>
        <Globe2 className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Globe2 className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-[12px] text-muted-foreground">Sem dados de exposição</p>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <DonutChart
              data={donutData}
              size={120}
              strokeWidth={20}
              centerLabel="Moedas"
              centerValue={`${donutData.length}`}
            />
          </div>
          <div className="space-y-2">
            {entries.map(([cur, val], i) => (
              <div key={cur} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: currencyColor(cur) }}
                />
                <span className="text-[11px] font-semibold text-foreground w-8">{cur}</span>
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${donutData[i]?.value ?? 0}%`,
                      backgroundColor: currencyColor(cur),
                    }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {donutData[i]?.value ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DIVIDENDOS
// ═══════════════════════════════════════════════════════════════

function DividendosCard({ m }: { m: PatrimonioMetrics }) {
  const hasDiv = m.totalDividends12m > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Proventos</p>
          <p className="text-[11px] text-muted-foreground">Últimos 12 meses</p>
        </div>
        <Coins className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {!hasDiv ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Coins className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-[12px] text-muted-foreground">
            Sem proventos registrados
          </p>
          <a href="/investments" className="mt-2 text-[11px] text-primary hover:underline">
            Adicionar investimento B3
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Total 12m */}
          <div className="rounded-xl bg-emerald-500/10 p-3.5">
            <p className="text-[10px] font-medium text-muted-foreground">Acumulado 12m</p>
            <p className="text-[22px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(m.totalDividends12m)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatCurrency(m.totalDividends12m / 12)}/mês estimado
            </p>
          </div>

          {/* Próximo pagamento */}
          {m.nextDividendDate && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                Próximo pagamento
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-foreground">
                  {m.nextDividendTicker ?? "—"}
                </span>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400">
                  {fmtDate(m.nextDividendDate)}
                </span>
              </div>
            </div>
          )}

          {/* Maior pagador */}
          {m.topDividendTicker && (
            <div>
              <p className="text-[10px] font-medium text-muted-foreground mb-1">
                Maior pagador 12m
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-foreground">
                  {m.topDividendTicker}
                </span>
                <span className="text-[12px] font-semibold text-violet-600 dark:text-violet-400 tabular-nums">
                  {formatCurrency(m.topDividendValue)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INSIGHTS
// ═══════════════════════════════════════════════════════════════

interface InsightChip {
  icon:    React.ElementType;
  label:   string;
  value:   string;
  sub?:    string;
  variant: "blue" | "emerald" | "violet" | "amber" | "rose";
}

const CHIP_COLORS: Record<InsightChip["variant"], { bg: string; text: string; icon: string }> = {
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-700 dark:text-blue-300",    icon: "text-blue-500"    },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", icon: "text-emerald-500" },
  violet:  { bg: "bg-violet-500/10",  text: "text-violet-700 dark:text-violet-300",  icon: "text-violet-500"  },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-700 dark:text-amber-300",    icon: "text-amber-500"   },
  rose:    { bg: "bg-rose-500/10",    text: "text-rose-700 dark:text-rose-300",      icon: "text-rose-500"    },
};

function InsightsSection({ m }: { m: PatrimonioMetrics }) {
  const chips: InsightChip[] = [];

  // 1. Maior posição
  if (m.biggestPositionName) {
    chips.push({
      icon:    TrendingUp,
      label:   "Maior posição",
      value:   m.biggestPositionName,
      sub:     formatCurrency(m.biggestPositionBRL),
      variant: "blue",
    });
  }

  // 2. Maior pagador de dividendos
  if (m.topDividendTicker) {
    chips.push({
      icon:    Coins,
      label:   "Maior dividendo 12m",
      value:   m.topDividendTicker,
      sub:     formatCurrency(m.topDividendValue),
      variant: "emerald",
    });
  }

  // 3. % em investimentos
  if (m.totalPatrimonio > 0) {
    chips.push({
      icon:    BarChart3,
      label:   "Em investimentos",
      value:   `${m.pctInvestments.toFixed(1).replace(".", ",")}%`,
      sub:     "do patrimônio total",
      variant: "violet",
    });
  }

  // 4. Aviso de moeda sem cotação
  if (m.missingRates.length > 0) {
    chips.push({
      icon:    AlertTriangle,
      label:   "Sem cotação de câmbio",
      value:   m.missingRates.join(", "),
      sub:     "valores estimados em 1:1",
      variant: "rose",
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <p className="text-[12px] font-semibold text-foreground">Insights</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {chips.map((chip, i) => {
          const colors = CHIP_COLORS[chip.variant];
          const Icon   = chip.icon;
          return (
            <div
              key={i}
              className={cn("rounded-xl p-3", colors.bg)}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <Icon className={cn("h-3.5 w-3.5", colors.icon)} />
                <p className="text-[10px] font-medium text-muted-foreground">{chip.label}</p>
              </div>
              <p className={cn("text-[14px] font-bold truncate", colors.text)}>
                {chip.value}
              </p>
              {chip.sub && (
                <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{chip.sub}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
