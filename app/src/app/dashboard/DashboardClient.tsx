"use client";

/**
 * Dashboard — Executive Dashboard
 * Sprint 8.1
 *
 * Layout:
 *  1. HeroCard          — patrimônio total + variação + buckets
 *  2. KPI Row           — receita | despesa | resultado | crédito
 *  3. 3-col row         — Distribuição Patrimonial | Distribuição Cambial | Próximos Dividendos
 *  4. 7+5 row           — Top 5 Posições | Performance
 *  5. 8+4 row           — Fluxo Mensal | Fluxo de Caixa
 *  6. 5+7 row           — Categorias | Radar
 */

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Sparkles,
  BarChart3,
  PieChart,
  Coins,
  Globe2,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Activity,
  Info,
  AlertCircle,
} from "lucide-react";
import { cn, formatCurrency }  from "@/lib/utils";
import { AreaChart }            from "@/components/charts/AreaChart";
import { DonutChart }           from "@/components/charts/DonutChart";
import { BarChart }             from "@/components/charts/BarChart";
import type { DashboardData, MonthlyCashFlow } from "@/types/dashboard";
import type { RadarInsight }                   from "@/lib/radar/types";
import type { InvestmentPosition, AssetClass }  from "@/types/investment";
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from "@/types/investment";
import { B3_QUOTED_CLASSES }    from "@/types/b3-market";
import type { B3QuoteMap }      from "@/types/b3-market";
import type { FxRateMap }       from "@/types/fx-rate";
import type { HealthSnapshot }    from "@/lib/financial-health";
import { FinancialHealthCard }    from "@/components/dashboard/FinancialHealthCard";
import type { FinancialInsight }  from "@/lib/financial-insights";
import { FinancialInsightsCard }  from "@/components/dashboard/FinancialInsightsCard";

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const CURRENCY_COLORS: Record<string, string> = {
  BRL: "#3B82F6", USD: "#10B981", EUR: "#8B5CF6",
  GBP: "#F59E0B", BTC: "#F97316", ETH: "#6366F1",
};
const FALLBACK_COLOR = "#6B7280";

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(iso: string) {
  return MONTH_LABELS[parseInt(iso.slice(5, 7), 10) - 1] ?? "?";
}

function currentMonthLabel() {
  const d = new Date();
  return `${MONTH_LABELS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function safe2(arr: number[]) { return arr.length >= 2 ? arr : [0, 0]; }

function effectiveValue(pos: InvestmentPosition, b3: B3QuoteMap): number {
  const B3 = B3_QUOTED_CLASSES as readonly string[];
  if (B3.includes(pos.asset_class) && pos.ticker && b3[pos.ticker]) {
    if (pos.quantity !== null) return pos.quantity * b3[pos.ticker];
  }
  if (pos.current_value !== null) return pos.current_value;
  if (pos.quantity !== null && pos.current_price !== null) return pos.quantity * pos.current_price;
  return 0;
}

function toBRL(value: number, currency: string, fx: FxRateMap) {
  if (currency === "BRL") return value;
  return fx[currency] ? value * fx[currency] : value;
}

function curColor(c: string) { return CURRENCY_COLORS[c] ?? FALLBACK_COLOR; }

// ── Executive Metrics ─────────────────────────────────────────────────────────

interface ExMetrics {
  totalPatrimonio:   number;
  totalAccounts:     number;
  totalInvestments:  number;
  totalManualAssets: number;
  pctAccounts:       number;
  pctInvestments:    number;
  pctManual:         number;
  investByClass:     Record<string, number>;
  currencyExposure:  Record<string, number>;
  topPositions:      Array<{ pos: InvestmentPosition; valueBRL: number; pct: number }>;
  gainers:           Array<{ pos: InvestmentPosition; gainPct: number; gainBRL: number }>;
  losers:            Array<{ pos: InvestmentPosition; gainPct: number; gainBRL: number }>;
  totalGainBRL:      number;
  totalGainPct:      number;
  upcomingDivs:      Array<{ ticker: string; paymentDate: string; estimatedBRL: number }>;
  totalDivs12m:      number;
  missingRates:      string[];
  missingQuotes:     string[];
  biggestPosPct:     number;
  biggestPosName:    string;
}

function buildMetrics(data: DashboardData): ExMetrics {
  const { summary, patrimonio } = data;
  const { investments, manualAssets, b3QuoteMap, dividendMap, fxRateMap } = patrimonio;

  const totalAccounts = summary?.total_balance ?? 0;
  let totalInvestments = 0, totalAcq = 0;
  const investByClass: Record<string, number> = {};
  const investByCur: Record<string, number>   = {};
  type PV = { pos: InvestmentPosition; valueBRL: number };
  const posArr: PV[] = [];

  for (const pos of investments) {
    const raw      = effectiveValue(pos, b3QuoteMap);
    const valueBRL = toBRL(raw, pos.currency, fxRateMap);
    totalInvestments += valueBRL;
    investByClass[pos.asset_class] = (investByClass[pos.asset_class] ?? 0) + valueBRL;
    investByCur[pos.currency]      = (investByCur[pos.currency] ?? 0) + valueBRL;
    posArr.push({ pos, valueBRL });
    totalAcq += toBRL(pos.acquisition_value ?? 0, pos.currency, fxRateMap);
  }

  let totalManualAssets = 0;
  const manualByCur: Record<string, number> = {};
  for (const a of manualAssets) {
    const v = toBRL(a.current_value, a.currency, fxRateMap);
    totalManualAssets += v;
    manualByCur[a.currency] = (manualByCur[a.currency] ?? 0) + v;
  }

  const totalPatrimonio = totalAccounts + totalInvestments + totalManualAssets;
  const pct = (v: number) => totalPatrimonio > 0 ? (v / totalPatrimonio) * 100 : 0;

  const currencyExposure: Record<string, number> = {};
  currencyExposure["BRL"] = (currencyExposure["BRL"] ?? 0) + totalAccounts;
  for (const [c, v] of Object.entries(investByCur)) currencyExposure[c] = (currencyExposure[c] ?? 0) + v;
  for (const [c, v] of Object.entries(manualByCur)) currencyExposure[c] = (currencyExposure[c] ?? 0) + v;

  // top positions
  const topPositions = [...posArr]
    .sort((a, b) => b.valueBRL - a.valueBRL)
    .slice(0, 5)
    .map(({ pos, valueBRL }) => ({
      pos, valueBRL,
      pct: totalInvestments > 0 ? (valueBRL / totalInvestments) * 100 : 0,
    }));

  // performance
  const perf = posArr
    .filter(({ pos }) => (pos.acquisition_value ?? 0) > 0)
    .map(({ pos, valueBRL }) => {
      const acqBRL = toBRL(pos.acquisition_value!, pos.currency, fxRateMap);
      const gainBRL = valueBRL - acqBRL;
      const gainPct = acqBRL > 0 ? (gainBRL / acqBRL) * 100 : 0;
      return { pos, gainBRL, gainPct };
    });

  const gainers = perf.filter(p => p.gainBRL > 0).sort((a, b) => b.gainPct - a.gainPct).slice(0, 3);
  const losers  = perf.filter(p => p.gainBRL < 0).sort((a, b) => a.gainPct - b.gainPct).slice(0, 3);
  const totalGainBRL = totalInvestments - totalAcq;
  const totalGainPct = totalAcq > 0 ? (totalGainBRL / totalAcq) * 100 : 0;

  // upcoming dividends
  const upcomingDivs: ExMetrics["upcomingDivs"] = [];
  let totalDivs12m = 0;
  for (const pos of investments) {
    if (!pos.ticker) continue;
    const ds = dividendMap[pos.ticker];
    if (!ds) continue;
    totalDivs12m += ds.totalPerShare12m * (pos.quantity ?? 0);
    if (ds.nextEvent?.payment_date) {
      upcomingDivs.push({
        ticker:       pos.ticker,
        paymentDate:  ds.nextEvent.payment_date,
        estimatedBRL: ds.nextEvent.amount_per_share * (pos.quantity ?? 0),
      });
    }
  }
  upcomingDivs.sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

  // radar data
  const allCur = new Set([...investments.map(p => p.currency), ...manualAssets.map(a => a.currency)]);
  const missingRates  = [...allCur].filter(c => c !== "BRL" && !fxRateMap[c]);
  const missingQuotes = investments
    .filter(p => (B3_QUOTED_CLASSES as readonly string[]).includes(p.asset_class) && p.ticker && !b3QuoteMap[p.ticker])
    .map(p => p.ticker!);

  const top1 = topPositions[0];
  const biggestPosPct  = top1?.pct ?? 0;
  const biggestPosName = top1 ? (top1.pos.ticker ?? top1.pos.asset_name) : "";

  return {
    totalPatrimonio, totalAccounts, totalInvestments, totalManualAssets,
    pctAccounts: pct(totalAccounts), pctInvestments: pct(totalInvestments), pctManual: pct(totalManualAssets),
    investByClass, currencyExposure,
    topPositions, gainers, losers, totalGainBRL, totalGainPct,
    upcomingDivs: upcomingDivs.slice(0, 6), totalDivs12m,
    missingRates, missingQuotes, biggestPosPct, biggestPosName,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════

interface Props {
  data:               DashboardData;
  error:              string | null;
  radarInsights:      RadarInsight[];
  healthSnapshot:     HealthSnapshot | null;
  financialInsights:  FinancialInsight[];
}

export function DashboardClient({ data, error, radarInsights, healthSnapshot, financialInsights }: Props) {
  const { investments, manualAssets } = data.patrimonio;
  const hasData = data.summary !== null || investments.length > 0 || manualAssets.length > 0;

  if (!hasData && !error) return <WelcomeDashboard />;

  const m = buildMetrics(data);

  return (
    <div className="space-y-4 pb-10">
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* 1. Hero */}
      <HeroCard data={data} m={m} />

      {/* 2. KPI row */}
      <KPIRow data={data} m={m} />

      {/* 3. Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PatrimonioCard m={m} />
        <CambialCard m={m} />
        <DividendosCard m={m} />
      </div>

      {/* 4. Posições + Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <TopPosicoesCard className="lg:col-span-7" m={m} />
        <PerformanceCard className="lg:col-span-5" m={m} />
      </div>

      {/* 5. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <FluxoMensalChartCard className="lg:col-span-8" data={data} />
        <FluxoCaixaCard className="lg:col-span-4" data={data} />
      </div>

      {/* 6. Categorias + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <CategoriasCard className="lg:col-span-5" data={data} />
        <RadarCard className="lg:col-span-7" insights={radarInsights} />
      </div>

      {/* 7. Saúde Financeira + Insights */}
      {(healthSnapshot || financialInsights.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {healthSnapshot && (
            <FinancialHealthCard snapshot={healthSnapshot} className="lg:col-span-5" />
          )}
          <FinancialInsightsCard insights={financialInsights} className="lg:col-span-7" />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// WELCOME / EMPTY STATE
// ═══════════════════════════════════════════════════════════════

function WelcomeDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
        <Sparkles className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-[22px] font-bold text-foreground">Bem-vindo ao Copiloto Financeiro</h2>
      <p className="mt-2 max-w-sm text-[14px] text-muted-foreground">
        Comece adicionando suas contas, investimentos ou ativos para ver sua visão executiva consolidada.
      </p>
      <div className="mt-6 flex gap-3">
        <a href="/accounts"
          className="flex h-9 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold text-white bg-gradient-to-r from-blue-500 to-violet-600 transition-opacity hover:opacity-90">
          <Plus className="h-4 w-4" /> Adicionar conta
        </a>
        <a href="/investments"
          className="flex h-9 items-center gap-2 rounded-xl border border-border px-5 text-[13px] font-medium text-foreground hover:bg-secondary">
          Investimentos
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. HERO CARD
// ═══════════════════════════════════════════════════════════════

function HeroCard({ data, m }: { data: DashboardData; m: ExMetrics }) {
  const { summary } = data;
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateStr  = now.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });

  const monthlyResult = summary?.monthly_result ?? 0;
  const isResultPos   = monthlyResult >= 0;
  const gainPos       = m.totalGainBRL >= 0;

  const buckets = [
    { label: "Contas",        value: m.totalAccounts,     pct: m.pctAccounts,     color: "#3B82F6" },
    { label: "Investimentos", value: m.totalInvestments,  pct: m.pctInvestments,  color: "#10B981" },
    { label: "Ativos",        value: m.totalManualAssets, pct: m.pctManual,       color: "#8B5CF6" },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950 p-6 text-white shadow-xl">
      {/* Subtle grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 40px,white 40px,white 41px),repeating-linear-gradient(90deg,transparent,transparent 40px,white 40px,white 41px)" }} />

      <div className="relative">
        {/* Top bar */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[13px] text-blue-300">{greeting}, Bernardo</p>
            <p className="text-[11px] text-blue-400/70 capitalize">{dateStr}</p>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/20">
            <RefreshCw className="h-3 w-3" />
            Atualizar
          </button>
        </div>

        {/* Patrimônio total */}
        <div className="mb-5">
          <p className="text-[12px] font-medium text-blue-300/80">Patrimônio Total Consolidado</p>
          <p className="mt-0.5 text-[40px] font-bold tracking-tight leading-none tabular-nums">
            {formatCurrency(m.totalPatrimonio)}
          </p>

          {/* Variações */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Resultado do mês */}
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold",
              isResultPos ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
            )}>
              {isResultPos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {isResultPos ? "+" : ""}{formatCurrency(monthlyResult)} este mês
            </div>

            {/* Rentabilidade investimentos */}
            {(m.gainers.length > 0 || m.losers.length > 0) && (
              <div className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold",
                gainPos ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
              )}>
                <Activity className="h-3.5 w-3.5" />
                {gainPos ? "+" : ""}{m.totalGainPct.toFixed(1).replace(".", ",")}% invest.
              </div>
            )}
          </div>
        </div>

        {/* Stacked bar */}
        {m.totalPatrimonio > 0 && (
          <div className="mb-4 flex h-2 w-full overflow-hidden rounded-full gap-0.5">
            {buckets.map(b =>
              b.pct > 0.5 ? (
                <div key={b.label} className="h-full rounded-full"
                  style={{ width: `${b.pct}%`, backgroundColor: b.color }}
                  title={`${b.label}: ${b.pct.toFixed(1)}%`} />
              ) : null
            )}
          </div>
        )}

        {/* 3 buckets */}
        <div className="grid grid-cols-3 gap-3">
          {buckets.map(b => (
            <div key={b.label} className="rounded-xl bg-white/5 px-3 py-2.5">
              <div className="mb-1 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                <p className="text-[10px] font-medium text-blue-300/80">{b.label}</p>
              </div>
              <p className="text-[14px] font-bold text-white tabular-nums">{formatCurrency(b.value)}</p>
              <p className="text-[10px] text-blue-400/60">{b.pct.toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// fake totalAcq for HeroCard (not in ExMetrics — use inline check)
// We'll use totalGainBRL !== 0 as proxy

// ═══════════════════════════════════════════════════════════════
// 2. KPI ROW
// ═══════════════════════════════════════════════════════════════

function Sparkline({ pts, positive, uid }: { pts: number[]; positive: boolean; uid: string }) {
  const W = 80, H = 32;
  if (pts.length < 2) return null;
  const min = Math.min(...pts), max = Math.max(...pts);
  const range = max - min || 1;
  const points = pts.map((v, i) => [
    (i / (pts.length - 1)) * W,
    H - 4 - ((v - min) / range) * (H - 8),
  ] as [number, number]);
  const line = points.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = points[i - 1];
    return `${acc} C${(px + x) / 2},${py} ${(px + x) / 2},${y} ${x},${y}`;
  }, "");
  const area  = `${line} L${W},${H} L0,${H} Z`;
  const color = positive ? "#10B981" : "#F87171";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
      <defs>
        <linearGradient id={`sp-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KPIRow({ data }: { data: DashboardData; m: ExMetrics }) {
  const { summary, cashFlow } = data;
  const incArr = cashFlow.map(m => m.total_income);
  const expArr = cashFlow.map(m => m.total_expense);
  const netArr = cashFlow.map(m => m.net_result);

  const prev = cashFlow.length >= 2 ? cashFlow[cashFlow.length - 2] : null;
  const deltaInc = prev && prev.total_income  > 0 ? ((( summary?.monthly_income  ?? 0) - prev.total_income)  / prev.total_income)  * 100 : null;
  const deltaExp = prev && prev.total_expense > 0 ? ((( summary?.monthly_expense ?? 0) - prev.total_expense) / prev.total_expense) * 100 : null;

  const income  = summary?.monthly_income  ?? 0;
  const expense = summary?.monthly_expense ?? 0;
  const result  = summary?.monthly_result  ?? 0;
  const avail   = summary?.total_credit_available ?? 0;
  const limit   = summary?.total_credit_limit ?? 0;

  const cards = [
    { label: "Receita do Mês",    value: income,   positive: true,       delta: deltaInc, trend: safe2(incArr), icon: TrendingUp,   color: "emerald" },
    { label: "Despesa do Mês",    value: expense,  positive: false,      delta: deltaExp ? -deltaExp : null, trend: safe2(expArr), icon: TrendingDown, color: "rose"    },
    { label: "Resultado",         value: result,   positive: result >= 0, delta: null,    trend: safe2(netArr), icon: Wallet,        color: result >= 0 ? "emerald" : "rose"   },
    { label: "Crédito Disponível", value: avail,   positive: true,       delta: null,    trend: safe2([limit - avail, avail]), icon: CreditCard, color: "blue"    },
  ] as const;

  const COLORS: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
    rose:    { bg: "bg-rose-500/10",    text: "text-rose-500"    },
    blue:    { bg: "bg-blue-500/10",    text: "text-blue-500"    },
  };

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((c) => {
        const pal  = COLORS[c.color] ?? COLORS.blue;
        const Icon = c.icon;
        const uid  = c.label.toLowerCase().replace(/\s+/g, "-");
        return (
          <div key={c.label} className={cn(
            "group relative overflow-hidden rounded-xl border border-border bg-card p-5",
            "shadow-[var(--shadow-card)] transition-all duration-200",
            "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
          )}>
            <div className="mb-3 flex items-start justify-between">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", pal.bg)}>
                <Icon className={cn("h-4 w-4", pal.text)} />
              </div>
              <Sparkline pts={c.trend} positive={c.positive} uid={uid} />
            </div>
            <p className="text-[12px] font-medium text-muted-foreground">{c.label}</p>
            <p className="mt-0.5 text-[20px] font-bold tracking-tight text-foreground tabular-nums">
              {formatCurrency(c.value)}
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              {c.delta !== null ? (
                <>
                  <span className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    c.positive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}>
                    {c.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(c.delta).toFixed(1).replace(".", ",")}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">vs mês ant.</span>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground">{currentMonthLabel()}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3A. DISTRIBUIÇÃO PATRIMONIAL
// ═══════════════════════════════════════════════════════════════

function PatrimonioCard({ m }: { m: ExMetrics }) {
  const buckets = [
    { label: "Contas",        value: m.totalAccounts,     pct: m.pctAccounts,    color: "#3B82F6", href: "/accounts"     },
    { label: "Investimentos", value: m.totalInvestments,  pct: m.pctInvestments, color: "#10B981", href: "/investments"  },
    { label: "Ativos Manuais",value: m.totalManualAssets, pct: m.pctManual,      color: "#8B5CF6", href: "/wealth"       },
  ];
  const donut = buckets.map(b => ({ label: b.label, value: Math.round(b.pct), color: b.color }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Distribuição Patrimonial</p>
          <p className="text-[11px] text-muted-foreground">Por tipo de ativo</p>
        </div>
        <Building2 className="h-4 w-4 text-muted-foreground/50" />
      </div>
      {m.totalPatrimonio === 0 ? (
        <EmptyState icon={PieChart} msg="Sem patrimônio cadastrado" />
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <DonutChart data={donut} size={120} strokeWidth={20}
              centerLabel="Total"
              centerValue={m.totalPatrimonio >= 1000
                ? `R$${(m.totalPatrimonio / 1000).toFixed(0)}k`
                : formatCurrency(m.totalPatrimonio)}
            />
          </div>
          <div className="space-y-2.5">
            {buckets.map(b => (
              <a key={b.label} href={b.href} className="flex items-center gap-2 group">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                <span className="flex-1 text-[12px] text-muted-foreground group-hover:text-foreground truncate">{b.label}</span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">{formatCurrency(b.value)}</span>
                <span className="w-7 text-right text-[10px] text-muted-foreground">{b.pct.toFixed(0)}%</span>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 3B. DISTRIBUIÇÃO CAMBIAL
// ═══════════════════════════════════════════════════════════════

function CambialCard({ m }: { m: ExMetrics }) {
  const entries = Object.entries(m.currencyExposure)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  // Group "Outras" — keep top 4 explicit, rest merge
  const TOP_CURRENCIES = ["BRL", "USD", "EUR", "BTC"];
  const topEntries: [string, number][] = [];
  let outras = 0;
  for (const [cur, val] of entries) {
    if (TOP_CURRENCIES.includes(cur) || topEntries.length < 4) topEntries.push([cur, val]);
    else outras += val;
  }
  if (outras > 0) topEntries.push(["Outras", outras]);

  const donut = topEntries.map(([cur, val]) => ({
    label: cur,
    value: total > 0 ? Math.round((val / total) * 100) : 0,
    color: curColor(cur),
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Distribuição Cambial</p>
          <p className="text-[11px] text-muted-foreground">Exposição por moeda</p>
        </div>
        <Globe2 className="h-4 w-4 text-muted-foreground/50" />
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={Globe2} msg="Sem dados de exposição" />
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <DonutChart data={donut} size={120} strokeWidth={20}
              centerLabel="Moedas" centerValue={`${entries.length}`} />
          </div>
          <div className="space-y-2">
            {topEntries.map(([cur, val], i) => (
              <div key={cur} className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: curColor(cur) }} />
                <span className="w-10 text-[11px] font-semibold text-foreground">{cur}</span>
                <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full"
                    style={{ width: `${donut[i]?.value ?? 0}%`, backgroundColor: curColor(cur) }} />
                </div>
                <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                  {donut[i]?.value ?? 0}%
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
// 3C. PRÓXIMOS DIVIDENDOS
// ═══════════════════════════════════════════════════════════════

function DividendosCard({ m }: { m: ExMetrics }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Próximos Dividendos</p>
          <p className="text-[11px] text-muted-foreground">
            {m.totalDivs12m > 0 ? `R$${(m.totalDivs12m / 12).toFixed(0)}/mês estimado` : "12m acumulado"}
          </p>
        </div>
        <Coins className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {m.upcomingDivs.length === 0 ? (
        <EmptyState icon={Coins} msg="Sem pagamentos previstos" sub="Adicione posições B3" />
      ) : (
        <div className="space-y-2">
          {m.upcomingDivs.map((d, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary/50 transition-colors">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Coins className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground">{d.ticker}</p>
                <p className="text-[10px] text-muted-foreground">
                  {d.estimatedBRL > 0 ? `~ ${formatCurrency(d.estimatedBRL)}` : "valor a confirmar"}
                </p>
              </div>
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 shrink-0">
                {fmtDate(d.paymentDate)}
              </span>
            </div>
          ))}
        </div>
      )}

      {m.totalDivs12m > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Acumulado 12m</span>
            <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(m.totalDivs12m)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4A. TOP 5 POSIÇÕES
// ═══════════════════════════════════════════════════════════════

function TopPosicoesCard({ className, m }: { className?: string; m: ExMetrics }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Top 5 Posições</p>
          <p className="text-[11px] text-muted-foreground">Por valor de mercado em BRL</p>
        </div>
        <a href="/investments" className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
          Ver todas <ChevronRight className="h-3 w-3" />
        </a>
      </div>

      {m.topPositions.length === 0 ? (
        <EmptyState icon={BarChart3} msg="Sem posições cadastradas" />
      ) : (
        <div className="space-y-2">
          {m.topPositions.map(({ pos, valueBRL, pct }, i) => {
            const color = ASSET_CLASS_COLORS[pos.asset_class as AssetClass] ?? FALLBACK_COLOR;
            return (
              <div key={pos.id} className="flex items-center gap-3">
                {/* Rank */}
                <span className="w-5 shrink-0 text-[11px] font-bold text-muted-foreground/50 text-center">{i + 1}</span>
                {/* Color dot */}
                <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg"
                  style={{ backgroundColor: color + "20" }}>
                  <span className="text-[11px] font-bold" style={{ color }}>{pos.ticker?.slice(0, 4) ?? "—"}</span>
                </div>
                {/* Name + class */}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground truncate">
                    {pos.ticker ?? pos.asset_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {ASSET_CLASS_LABELS[pos.asset_class as AssetClass] ?? pos.asset_class}
                  </p>
                </div>
                {/* Bar */}
                <div className="w-16 h-1.5 overflow-hidden rounded-full bg-secondary shrink-0">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
                </div>
                {/* Value + pct */}
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-bold text-foreground tabular-nums">{formatCurrency(valueBRL)}</p>
                  <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 4B. PERFORMANCE
// ═══════════════════════════════════════════════════════════════

function PerformanceCard({ className, m }: { className?: string; m: ExMetrics }) {
  const hasPerf = m.gainers.length > 0 || m.losers.length > 0;

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Performance</p>
          <p className="text-[11px] text-muted-foreground">Vs. preço médio de aquisição</p>
        </div>
        <Activity className="h-4 w-4 text-muted-foreground/50" />
      </div>

      {/* Total gain/loss */}
      {(m.gainers.length > 0 || m.losers.length > 0) && (
        <div className={cn(
          "mb-4 rounded-xl p-3",
          m.totalGainBRL >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
        )}>
          <p className="text-[10px] font-medium text-muted-foreground">Resultado total investimentos</p>
          <p className={cn("text-[20px] font-bold tabular-nums",
            m.totalGainBRL >= 0
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}>
            {m.totalGainBRL >= 0 ? "+" : ""}{formatCurrency(m.totalGainBRL)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {m.totalGainPct >= 0 ? "+" : ""}{m.totalGainPct.toFixed(2).replace(".", ",")}% acumulado
          </p>
        </div>
      )}

      {!hasPerf ? (
        <EmptyState icon={Activity} msg="Sem dados de performance" sub="Informe o preço médio de aquisição" />
      ) : (
        <div className="space-y-3">
          {m.gainers.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" /> Maiores valorizações
              </p>
              {m.gainers.map(({ pos, gainPct, gainBRL }) => (
                <PerfRow key={pos.id} pos={pos} gainPct={gainPct} gainBRL={gainBRL} positive />
              ))}
            </div>
          )}
          {m.losers.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-rose-500" /> Maiores desvalorizações
              </p>
              {m.losers.map(({ pos, gainPct, gainBRL }) => (
                <PerfRow key={pos.id} pos={pos} gainPct={gainPct} gainBRL={gainBRL} positive={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PerfRow({ pos, gainPct, gainBRL, positive }: {
  pos: InvestmentPosition; gainPct: number; gainBRL: number; positive: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
        positive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                 : "bg-rose-500/15 text-rose-600 dark:text-rose-400")}>
        {positive ? "▲" : "▼"}
      </span>
      <span className="flex-1 text-[12px] font-medium text-foreground truncate">
        {pos.ticker ?? pos.asset_name}
      </span>
      <div className="text-right shrink-0">
        <p className={cn("text-[11px] font-bold tabular-nums",
          positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {positive ? "+" : ""}{gainPct.toFixed(1).replace(".", ",")}%
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {positive ? "+" : ""}{formatCurrency(gainBRL)}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 5A. FLUXO MENSAL CHART
// ═══════════════════════════════════════════════════════════════

type Periodo = "3M" | "6M" | "12M";
const PERIODO_SLICES: Record<Periodo, number> = { "3M": 3, "6M": 6, "12M": 12 };

function FluxoMensalChartCard({ className, data }: { className?: string; data: DashboardData }) {
  const [periodo, setPeriodo] = React.useState<Periodo>("6M");
  const slice   = data.cashFlow.slice(-PERIODO_SLICES[periodo]);
  const income  = slice.map(m => ({ label: monthLabel(m.month), value: m.total_income }));
  const cur     = slice[slice.length - 1]?.total_income ?? 0;
  const prev    = slice[slice.length - 2]?.total_income ?? 0;
  const variacao = prev > 0 ? ((cur - prev) / prev) * 100 : 0;
  const isPos   = variacao >= 0;

  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-[var(--shadow-card)]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">Histórico de Receitas</p>
          <p className="mt-0.5 text-[22px] font-bold tracking-tight text-foreground tabular-nums">
            {formatCurrency(cur)}
          </p>
          {variacao !== 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                isPos ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}>
                {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {isPos ? "+" : "-"}{Math.abs(variacao).toFixed(1).replace(".", ",")}%
              </span>
              <span className="text-[11px] text-muted-foreground">vs mês ant.</span>
            </div>
          )}
        </div>
        <div className="flex items-center rounded-lg bg-secondary p-0.5 shrink-0">
          {(["3M", "6M", "12M"] as Periodo[]).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={cn("rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                periodo === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="px-2 pb-4">
        {income.length >= 2 ? (
          <AreaChart data={income} height={160} color="#10B981" gradientId="receita-ex"
            showGrid showLabels showDots={income.length <= 4}
            formatValue={v => `R$${(v / 1000).toFixed(1)}k`} />
        ) : (
          <div className="flex h-40 items-center justify-center">
            <p className="text-[12px] text-muted-foreground">Registre transações para ver o histórico</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 5B. FLUXO DE CAIXA
// ═══════════════════════════════════════════════════════════════

function FluxoCaixaCard({ className, data }: { className?: string; data: DashboardData }) {
  const { summary, cashFlow } = data;
  const income  = summary?.monthly_income  ?? 0;
  const expense = summary?.monthly_expense ?? 0;
  const surplus = summary?.monthly_result  ?? 0;
  const poupPct = income > 0 ? (surplus / income) * 100 : 0;
  const despPct = income > 0 ? Math.min(100, (expense / income) * 100) : 0;

  const saldoData = cashFlow.slice(-6).map((m: MonthlyCashFlow) => ({
    label: monthLabel(m.month), value: m.net_result,
    color: m.net_result >= 0 ? "#10B981" : "#F87171",
  }));

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">Fluxo de Caixa</p>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {currentMonthLabel()}
        </span>
      </div>
      {income === 0 && expense === 0 ? (
        <EmptyState icon={BarChart3} msg="Sem transações este mês" />
      ) : (
        <>
          <div className="space-y-2.5 mb-4">
            <BarRow label="Receitas"  value={income}  pct={100}    color="bg-emerald-500" textColor="text-emerald-600 dark:text-emerald-400" />
            <BarRow label="Despesas"  value={expense} pct={despPct} color="bg-rose-500"    textColor="text-rose-600 dark:text-rose-400"    prefix="- " />
          </div>
          <div className={cn("mb-4 rounded-xl p-3",
            surplus >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
            <p className="text-[10px] text-muted-foreground">Saldo do mês</p>
            <p className={cn("text-[18px] font-bold tabular-nums",
              surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {formatCurrency(surplus)}
            </p>
            {income > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Taxa de poupança: {poupPct.toFixed(1).replace(".", ",")}%
              </p>
            )}
          </div>
          {saldoData.length >= 2 && (
            <>
              <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Resultado mensal</p>
              <BarChart data={saldoData} height={64} showLabels showGrid={false}
                defaultColor="#10B981" formatValue={v => `R$${(v / 1000).toFixed(1)}k`} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function BarRow({ label, value, pct, color, textColor, prefix = "" }: {
  label: string; value: number; pct: number; color: string; textColor: string; prefix?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className={cn("text-[12px] font-semibold tabular-nums", textColor)}>
          {prefix}{formatCurrency(value)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6A. CATEGORIAS DE DESPESA
// ═══════════════════════════════════════════════════════════════

function CategoriasCard({ className, data }: { className?: string; data: DashboardData }) {
  const cats  = data.expenseByCategory;
  const total = cats.reduce((s, c) => s + c.total_amount, 0);
  const PAL   = ["#3B82F6","#10B981","#F59E0B","#EC4899","#8B5CF6","#6B7280"];

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Despesas por Categoria</p>
          <p className="text-[11px] text-muted-foreground">{currentMonthLabel()}</p>
        </div>
        {total > 0 && (
          <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
            {formatCurrency(total)}
          </span>
        )}
      </div>
      {cats.length === 0 ? (
        <EmptyState icon={PieChart} msg="Sem despesas este mês" />
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <DonutChart
              data={cats.map((c, i) => ({
                label: c.category_name,
                value: total > 0 ? Math.round((c.total_amount / total) * 100) : 0,
                color: c.category_color ?? PAL[i % PAL.length],
              }))}
              size={110} strokeWidth={18}
              centerLabel="Total"
              centerValue={total >= 1000 ? `R$${(total / 1000).toFixed(1)}k` : `R$${total.toFixed(0)}`}
            />
          </div>
          <div className="space-y-2">
            {cats.map((cat, i) => {
              const p = total > 0 ? Math.round((cat.total_amount / total) * 100) : 0;
              return (
                <div key={cat.category_id ?? i} className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.category_color ?? PAL[i % PAL.length] }} />
                  <span className="flex-1 text-[11px] text-muted-foreground truncate">{cat.category_name}</span>
                  <span className="text-[11px] font-semibold text-foreground tabular-nums">
                    {formatCurrency(cat.total_amount)}
                  </span>
                  <span className="w-6 text-right text-[10px] text-muted-foreground">{p}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 6B. RADAR FINANCEIRO
// ═══════════════════════════════════════════════════════════════

const RADAR_STYLES: Record<string, { border: string; bg: string; iconBg: string; iconText: string }> = {
  danger:  { border: "border-rose-500/20",    bg: "bg-rose-500/5",     iconBg: "bg-rose-500/15",    iconText: "text-rose-600 dark:text-rose-400"      },
  warning: { border: "border-amber-500/20",   bg: "bg-amber-500/5",    iconBg: "bg-amber-500/15",   iconText: "text-amber-600 dark:text-amber-400"     },
  success: { border: "border-emerald-500/20", bg: "bg-emerald-500/5",  iconBg: "bg-emerald-500/15", iconText: "text-emerald-600 dark:text-emerald-400" },
  info:    { border: "border-blue-500/20",    bg: "bg-blue-500/5",     iconBg: "bg-blue-500/15",    iconText: "text-blue-600 dark:text-blue-400"       },
};

const RADAR_ICONS: Record<string, React.ElementType> = {
  AlertTriangle: AlertTriangle,
  AlertCircle:   AlertCircle,
  TrendingUp:    TrendingUp,
  TrendingDown:  TrendingDown,
  PieChart:      PieChart,
  CreditCard:    CreditCard,
  BarChart3:     BarChart3,
  Globe2:        Globe2,
  Coins:         Coins,
  ShieldCheck:   ShieldCheck,
  Info:          Info,
  Lightbulb:     Lightbulb,
};

function RadarCard({ className, insights }: { className?: string; insights: RadarInsight[] }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10">
          <Lightbulb className="h-4 w-4 text-amber-500" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Radar Financeiro</p>
          <p className="text-[11px] text-muted-foreground">
            {insights.length} {insights.length === 1 ? "alerta" : "alertas"} encontrados
          </p>
        </div>
      </div>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <ShieldCheck className="h-10 w-10 text-emerald-500/40 mb-2" />
          <p className="text-[13px] font-medium text-foreground">Tudo certo por aqui</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Nenhum alerta ou anomalia detectada.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insights.map((ins) => {
            const s    = RADAR_STYLES[ins.severity] ?? RADAR_STYLES.info;
            const Icon = RADAR_ICONS[ins.icon] ?? Info;
            return (
              <div key={ins.id} className={cn("flex gap-3 rounded-xl border p-3", s.border, s.bg)}>
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", s.iconBg)}>
                  <Icon className={cn("h-4 w-4", s.iconText)} />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold leading-tight text-foreground">{ins.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground leading-relaxed">{ins.description}</p>
                  {ins.action && (
                    <p className="mt-1 text-[10px] font-medium text-primary/80 leading-snug">{ins.action}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════
// SHARED — Empty State
// ═══════════════════════════════════════════════════════════════

function EmptyState({ icon: Icon, msg, sub }: { icon: React.ElementType; msg: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-7 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/25 mb-2" />
      <p className="text-[12px] text-muted-foreground">{msg}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</p>}
    </div>
  );
}
