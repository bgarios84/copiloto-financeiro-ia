"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Landmark,
  CreditCard,
  Building2,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Send,
  Bot,
  BarChart3,
  PieChart,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn, formatCurrency } from "@/lib/utils";
import { AreaChart } from "@/components/charts/AreaChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";
import type { DashboardData, MonthlyCashFlow } from "@/types/dashboard";

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  data:  DashboardData;
  error: string | null;
}

// ── Constants / Mock (TODO: substituir com dados reais nas sprints futuras) ───

const METAS = [
  { title: "Independência Financeira", current: 287450, target: 500000, color: "#3B82F6" },
  { title: "Comprar imóvel",           current:  56000, target: 100000, color: "#10B981" },
  { title: "Viagem em família",        current:   8500, target:  15000, color: "#F59E0B" },
  { title: "Aposentadoria tranquila",  current: 126000, target: 300000, color: "#8B5CF6" },
];

const AI_PROMPTS = [
  "Quanto gastei com restaurantes este mes?",
  "Qual foi minha maior despesa no cartao?",
  "Estou gastando mais do que recebo?",
  "Qual categoria mais pesa no orcamento?",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function monthLabel(isoDate: string): string {
  const m = parseInt(isoDate.slice(5, 7), 10) - 1;
  return MONTH_LABELS[m] ?? "?";
}

function currentMonthLabel(): string {
  const now = new Date();
  return `${MONTH_LABELS[now.getMonth()]}/${String(now.getFullYear()).slice(2)}`;
}

function safe2(arr: number[]): number[] {
  return arr.length >= 2 ? arr : [0, 0];
}

function computeDeltaPct(current: number, previous: number | null): {
  delta: number; positive: boolean;
} | null {
  if (previous === null || previous === 0) return null;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { delta: Math.abs(pct), positive: pct >= 0 };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AccentColor = "blue" | "emerald" | "rose" | "amber";
type Periodo     = "3M" | "6M" | "12M";

interface KPIData {
  label:      string;
  value:      number;
  delta:      number;
  hasDelta:   boolean;
  positive:   boolean;
  sub:        string;
  trend:      number[];
  icon:       React.ElementType;
  accentColor: AccentColor;
}

// ── KPI builder ───────────────────────────────────────────────────────────────

function buildKPIs(data: DashboardData): KPIData[] {
  const { summary, cashFlow } = data;

  const incomeArr  = cashFlow.map((m) => m.total_income);
  const expenseArr = cashFlow.map((m) => m.total_expense);
  const netArr     = cashFlow.map((m) => m.net_result);

  const prevMonth = cashFlow.length >= 2 ? cashFlow[cashFlow.length - 2] : null;

  const incDelta = computeDeltaPct(summary?.monthly_income  ?? 0, prevMonth?.total_income  ?? null);
  const expDelta = computeDeltaPct(summary?.monthly_expense ?? 0, prevMonth?.total_expense ?? null);
  const netDelta = computeDeltaPct(summary?.monthly_result  ?? 0, prevMonth?.net_result    ?? null);

  const totalAccounts = summary?.total_accounts ?? 0;

  return [
    {
      label:      "Saldo Total",
      value:      summary?.total_balance ?? 0,
      delta:      0,
      hasDelta:   false,
      positive:   (summary?.total_balance ?? 0) >= 0,
      sub:        `${totalAccounts} conta${totalAccounts !== 1 ? "s" : ""}`,
      trend:      safe2(netArr.length ? netArr : [0, 0]),
      icon:       Landmark,
      accentColor: "blue",
    },
    {
      label:      "Receita do Mes",
      value:      summary?.monthly_income ?? 0,
      delta:      incDelta?.delta ?? 0,
      hasDelta:   incDelta !== null,
      positive:   incDelta?.positive ?? true,
      sub:        "vs mes anterior",
      trend:      safe2(incomeArr),
      icon:       TrendingUp,
      accentColor: "emerald",
    },
    {
      label:      "Despesa do Mes",
      value:      summary?.monthly_expense ?? 0,
      delta:      expDelta?.delta ?? 0,
      hasDelta:   expDelta !== null,
      positive:   expDelta !== null ? !expDelta.positive : true,
      sub:        "vs mes anterior",
      trend:      safe2(expenseArr),
      icon:       TrendingDown,
      accentColor: "rose",
    },
    {
      label:      "Resultado do Mes",
      value:      summary?.monthly_result  ?? 0,
      delta:      netDelta?.delta ?? 0,
      hasDelta:   netDelta !== null,
      positive:   (summary?.monthly_result ?? 0) >= 0,
      sub:        `${summary?.monthly_transactions ?? 0} transacoes`,
      trend:      safe2(netArr),
      icon:       Wallet,
      accentColor: "amber",
    },
  ];
}

// ═══════════════════════════════════════════════════════════════
// MAIN CLIENT COMPONENT
// ═══════════════════════════════════════════════════════════════

export function DashboardClient({ data, error }: DashboardClientProps) {
  // Sem contas = show welcome state
  if (!data.summary && !error) {
    return <WelcomeDashboard />;
  }

  return (
    <div className="space-y-5 pb-10">
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          Erro ao carregar dados: {error}
        </div>
      )}

      <HeroSection />

      {/* KPI row — dados reais */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {buildKPIs(data).map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <ExpenseCategoryCard className="lg:col-span-3" data={data} />
        <FluxoMensalChartCard className="lg:col-span-6" data={data} />
        <FluxoCaixaCard       className="lg:col-span-3" data={data} />
      </div>

      {/* Mini stats */}
      <MiniStatsRow data={data} />

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DespesasCard data={data} />
        <MetasCard />
        <div className="flex flex-col gap-4">
          <CopilotoCard />
          <CartoesCard data={data} />
        </div>
      </div>
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
        Comece adicionando suas contas bancarias para visualizar seu patrimonio e fluxo de caixa.
      </p>
      <div className="mt-6 flex gap-3">
        <a
          href="/accounts"
          className={cn(
            "flex h-9 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold text-white",
            "bg-gradient-to-r from-blue-500 to-violet-600 transition-opacity hover:opacity-90"
          )}
        >
          <Plus className="h-4 w-4" />
          Adicionar conta
        </a>
        <a
          href="/transactions"
          className="flex h-9 items-center gap-2 rounded-xl border border-border px-5 text-[13px] font-medium text-foreground hover:bg-secondary"
        >
          Registrar transacao
        </a>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════

function HeroSection() {
  const now      = new Date();
  const hour     = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateStr  = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          {greeting},{" "}
          <span className="text-gradient-primary">Bernardo</span>{" "}
        </h1>
        <p className="mt-0.5 text-[14px] text-muted-foreground">
          Aqui esta o resumo da sua vida financeira.
        </p>
      </div>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <p className="text-[12px] text-muted-foreground capitalize">{dateStr}</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/60">
            Atualizado as {timeStr}
          </span>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-primary px-3 h-8",
              "text-[13px] font-semibold text-primary-foreground",
              "transition-all hover:opacity-90 active:scale-[0.98]"
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// KPI CARD + SPARKLINE
// ═══════════════════════════════════════════════════════════════

const ACCENT: Record<AccentColor, { bg: string; text: string }> = {
  blue:    { bg: "bg-blue-500/10",    text: "text-blue-500"    },
  emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  rose:    { bg: "bg-rose-500/10",    text: "text-rose-500"    },
  amber:   { bg: "bg-amber-500/10",   text: "text-amber-500"   },
};

function Sparkline({ data: pts, positive, uid }: { data: number[]; positive: boolean; uid: string }) {
  const W = 80, H = 36;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const points = pts.map((v, i) => [
    (i / (pts.length - 1)) * W,
    H - 4 - ((v - min) / range) * (H - 10),
  ] as [number, number]);

  const linePath = points.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = points[i - 1];
    return `${acc} C${(px + x) / 2},${py} ${(px + x) / 2},${y} ${x},${y}`;
  }, "");
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  const stroke   = positive ? "#10B981" : "#F87171";
  const gradId   = `spark-${uid}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KPICard({ label, value, delta, hasDelta, positive, sub, trend, icon: Icon, accentColor }: KPIData) {
  const colors = ACCENT[accentColor];
  const uid    = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border border-border bg-card p-5",
      "shadow-[var(--shadow-card)] transition-all duration-200",
      "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
    )}>
      <div className="mb-3 flex items-start justify-between">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", colors.bg)}>
          <Icon className={cn("h-4 w-4", colors.text)} />
        </div>
        <Sparkline data={trend} positive={positive} uid={uid} />
      </div>
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[22px] font-bold tracking-tight text-foreground tabular-nums">
        {formatCurrency(value)}
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        {hasDelta ? (
          <>
            <span className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
              positive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            )}>
              {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {positive ? "+" : "-"}{delta.toFixed(1).replace(".", ",")}%
            </span>
            <span className="text-[11px] text-muted-foreground">{sub}</span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">{sub}</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXPENSE CATEGORY CARD (esquerda — dados reais)
// ═══════════════════════════════════════════════════════════════

function ExpenseCategoryCard({ className, data }: { className?: string; data: DashboardData }) {
  const cats  = data.expenseByCategory;
  const total = cats.reduce((s, c) => s + c.total_amount, 0);

  const donutData = cats.map((c, i) => ({
    label: c.category_name,
    value: total > 0 ? Math.round((c.total_amount / total) * 100) : 0,
    color: c.category_color ?? ["#3B82F6","#10B981","#F59E0B","#8B5CF6","#EC4899","#6B7280"][i % 6],
  }));

  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]", className)}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Top Categorias</p>
          <p className="text-[11px] text-muted-foreground">{currentMonthLabel()}</p>
        </div>
        <a href="/transactions" className="text-[11px] font-medium text-primary hover:underline">
          Ver todas
        </a>
      </div>

      {cats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <PieChart className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-[12px] text-muted-foreground">Sem despesas registradas</p>
          <a href="/transactions" className="mt-2 text-[11px] text-primary hover:underline">
            Registrar transacao
          </a>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-4">
            <DonutChart
              data={donutData}
              size={120}
              strokeWidth={20}
              centerLabel="Total"
              centerValue={total >= 1000
                ? `R$${(total / 1000).toFixed(1)}k`
                : formatCurrency(total)}
            />
          </div>
          <div className="space-y-2">
            {cats.slice(0, 5).map((cat, i) => (
              <div key={cat.category_id ?? i} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: donutData[i]?.color }}
                />
                <span className="flex-1 text-[11px] text-muted-foreground truncate">
                  {cat.category_name}
                </span>
                <span className="text-[11px] font-semibold text-foreground tabular-nums">
                  {donutData[i]?.value}%
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
// FLUXO MENSAL CHART CARD (centro — dados reais)
// ═══════════════════════════════════════════════════════════════

const PERIODO_SLICES: Record<Periodo, number> = { "3M": 3, "6M": 6, "12M": 12 };

function FluxoMensalChartCard({ className, data }: { className?: string; data: DashboardData }) {
  const [periodo, setPeriodo] = React.useState<Periodo>("6M");
  const cashFlow = data.cashFlow;

  const slice  = cashFlow.slice(-PERIODO_SLICES[periodo]);
  const income = slice.map((m) => ({ label: monthLabel(m.month), value: m.total_income }));

  const currentIncome  = slice[slice.length - 1]?.total_income  ?? 0;
  const previousIncome = slice[slice.length - 2]?.total_income  ?? 0;
  const variacao = previousIncome > 0
    ? ((currentIncome - previousIncome) / previousIncome) * 100
    : 0;
  const isPos = variacao >= 0;

  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-[var(--shadow-card)]", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">Historico de Receitas</p>
          <p className="mt-0.5 text-[22px] font-bold tracking-tight text-foreground tabular-nums">
            {formatCurrency(currentIncome)}
          </p>
          {variacao !== 0 && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                isPos
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}>
                {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {isPos ? "+" : "-"}{Math.abs(variacao).toFixed(1).replace(".", ",")}%
              </span>
              <span className="text-[11px] text-muted-foreground">vs mes anterior</span>
            </div>
          )}
        </div>
        <div className="flex items-center rounded-lg bg-secondary p-0.5 shrink-0">
          {(["3M", "6M", "12M"] as Periodo[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                periodo === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 pb-4">
        {income.length >= 2 ? (
          <AreaChart
            data={income}
            height={168}
            color="#10B981"
            gradientId="receita-main"
            showGrid
            showLabels
            showDots={income.length <= 4}
            formatValue={(v) => `R$${(v / 1000).toFixed(1)}k`}
          />
        ) : (
          <div className="flex h-[168px] items-center justify-center">
            <p className="text-[12px] text-muted-foreground">
              Registre transacoes para visualizar o historico
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLUXO DE CAIXA CARD (direita — dados reais)
// ═══════════════════════════════════════════════════════════════

function FluxoCaixaCard({ className, data }: { className?: string; data: DashboardData }) {
  const summary  = data.summary;
  const cashFlow = data.cashFlow;

  const income   = summary?.monthly_income  ?? 0;
  const expense  = summary?.monthly_expense ?? 0;
  const surplus  = summary?.monthly_result  ?? 0;
  const taxaPoup = income > 0 ? (surplus / income) * 100 : 0;
  const despPct  = income > 0 ? Math.min(100, (expense / income) * 100) : 0;

  const saldoData = cashFlow.slice(-6).map((m: MonthlyCashFlow) => ({
    label: monthLabel(m.month),
    value: m.net_result,
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
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <BarChart3 className="h-7 w-7 text-muted-foreground/30 mb-2" />
          <p className="text-[12px] text-muted-foreground">Sem transacoes este mes</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Receitas</span>
                <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(income)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-full rounded-full bg-emerald-500" />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Despesas</span>
                <span className="text-[12px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                  - {formatCurrency(expense)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${despPct}%` }} />
              </div>
            </div>
          </div>

          <div className={cn(
            "mb-4 rounded-xl p-3.5",
            surplus >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"
          )}>
            <p className="text-[10px] font-medium text-muted-foreground">Saldo do mes</p>
            <p className={cn(
              "text-[20px] font-bold tabular-nums",
              surplus >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            )}>
              {formatCurrency(surplus)}
            </p>
            {income > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Taxa de poupanca: {taxaPoup.toFixed(1).replace(".", ",")}%
              </p>
            )}
          </div>

          {saldoData.length >= 2 && (
            <>
              <p className="mb-2 text-[10px] font-medium text-muted-foreground">Resultado mensal</p>
              <BarChart
                data={saldoData}
                height={72}
                showLabels
                showGrid={false}
                defaultColor="#10B981"
                formatValue={(v) => `R$${(v / 1000).toFixed(1)}k`}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MINI STATS ROW (parcialmente real)
// ═══════════════════════════════════════════════════════════════

function MiniStatsRow({ data }: { data: DashboardData }) {
  const summary = data.summary;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Contas — REAL */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-medium text-muted-foreground">Contas Ativas</p>
          <Building2 className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <p className="text-[26px] font-bold text-foreground leading-none">
          {summary?.total_accounts ?? 0}
        </p>
        <p className="mt-2 text-[12px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
          {formatCurrency(summary?.total_balance ?? 0)}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Saldo consolidado</p>
      </div>

      {/* Transacoes do mes — REAL */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-medium text-muted-foreground">Transacoes</p>
          <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <p className="text-[26px] font-bold text-foreground leading-none">
          {summary?.monthly_transactions ?? 0}
        </p>
        <p className="mt-2 text-[12px] font-semibold tabular-nums" style={{ color: (summary?.monthly_result ?? 0) >= 0 ? "#10B981" : "#F87171" }}>
          {formatCurrency(Math.abs(summary?.monthly_result ?? 0))}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">Resultado do mes</p>
      </div>

      {/* Cartoes — REAL */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-medium text-muted-foreground">Limite Cartoes</p>
          <CreditCard className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <p className="text-[20px] font-bold text-foreground tabular-nums leading-tight">
          {formatCurrency(summary?.total_credit_available ?? 0)}
        </p>
        {(summary?.total_credit_limit ?? 0) > 0 && (
          <>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  (summary?.credit_usage_percentage ?? 0) > 80 ? "bg-rose-500" :
                  (summary?.credit_usage_percentage ?? 0) > 50 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(100, summary?.credit_usage_percentage ?? 0)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {(summary?.credit_usage_percentage ?? 0).toFixed(0)}% utilizado de {formatCurrency(summary?.total_credit_limit ?? 0)}
            </p>
          </>
        )}
        {(summary?.total_credit_limit ?? 0) === 0 && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            <a href="/credit-cards" className="text-primary hover:underline">
              Adicionar cartao
            </a>
          </p>
        )}
      </div>

      {/* Copiloto IA mini */}
      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-blue-500/5 p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-[12px] font-semibold text-foreground">Copiloto IA</p>
        </div>
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Faca perguntas sobre suas financas
        </p>
        <button className="mt-3 w-full rounded-lg bg-violet-500/15 py-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-500/25">
          Perguntar agora
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DESPESAS POR CATEGORIA CARD (bottom left — dados reais)
// ═══════════════════════════════════════════════════════════════

function DespesasCard({ data }: { data: DashboardData }) {
  const cats  = data.expenseByCategory;
  const total = cats.reduce((s, c) => s + c.total_amount, 0);

  const PALETTE = ["#3B82F6","#10B981","#F59E0B","#EC4899","#8B5CF6","#6B7280"];

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between">
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
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <PieChart className="h-9 w-9 text-muted-foreground/25 mb-3" />
          <p className="text-[13px] font-medium text-foreground">Sem despesas este mes</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Registre suas despesas para ver a analise por categoria.
          </p>
          <a href="/transactions" className="mt-3 text-[12px] text-primary hover:underline">
            Registrar transacao
          </a>
        </div>
      ) : (
        <>
          <div className="flex justify-center mb-5">
            <DonutChart
              data={cats.map((c, i) => ({
                label: c.category_name,
                value: total > 0 ? Math.round((c.total_amount / total) * 100) : 0,
                color: c.category_color ?? PALETTE[i % PALETTE.length],
              }))}
              size={120}
              strokeWidth={20}
              centerLabel="Total"
              centerValue={total >= 1000
                ? `R$${(total / 1000).toFixed(1)}k`
                : `R$${total.toFixed(0)}`}
            />
          </div>
          <div className="space-y-2.5">
            {cats.map((cat, i) => {
              const pct = total > 0 ? Math.round((cat.total_amount / total) * 100) : 0;
              return (
                <div key={cat.category_id ?? i} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.category_color ?? PALETTE[i % PALETTE.length] }}
                  />
                  <span className="flex-1 text-[12px] text-muted-foreground truncate">
                    {cat.category_name}
                  </span>
                  <span className="text-[12px] font-semibold text-foreground tabular-nums">
                    {formatCurrency(cat.total_amount)}
                  </span>
                  <span className="w-8 text-right text-[10px] text-muted-foreground tabular-nums">
                    {pct}%
                  </span>
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
// METAS CARD (mock — TODO Sprint Metas)
// ═══════════════════════════════════════════════════════════════

function MetasCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Metas Financeiras</p>
          <p className="text-[11px] text-muted-foreground">{METAS.length} metas (exemplo)</p>
        </div>
        <button className={cn(
          "flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5",
          "text-[11px] font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        )}>
          <Plus className="h-3 w-3" />
          Nova meta
        </button>
      </div>
      <div className="space-y-5">
        {METAS.map((meta) => {
          const pct = Math.min(100, Math.round((meta.current / meta.target) * 100));
          return (
            <div key={meta.title}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium text-foreground truncate">{meta.title}</p>
                <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color: meta.color }}>
                  {pct}%
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {formatCurrency(meta.current)}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  de {formatCurrency(meta.target)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COPILOTO IA CARD
// ═══════════════════════════════════════════════════════════════

function CopilotoCard() {
  const [input, setInput] = React.useState("");

  return (
    <div className="rounded-xl border border-violet-500/20 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 shadow-md shadow-violet-500/20">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Analises com IA</p>
          <p className="text-[10px] text-muted-foreground">Pergunte sobre suas financas</p>
        </div>
      </div>
      <div className="mb-3 space-y-1.5">
        {AI_PROMPTS.map((q) => (
          <button
            key={q}
            onClick={() => setInput(q)}
            className={cn(
              "w-full rounded-lg border border-border px-3 py-2 text-left",
              "text-[11px] text-muted-foreground",
              "transition-colors hover:bg-secondary hover:text-foreground"
            )}
          >
            + {q}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
        <button className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
          "bg-primary text-primary-foreground transition-opacity hover:opacity-90"
        )}>
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARTOES CARD (dados reais)
// ═══════════════════════════════════════════════════════════════

function CartoesCard({ data }: { data: DashboardData }) {
  const summary = data.summary;
  const limit   = summary?.total_credit_limit     ?? 0;
  const used    = summary?.total_credit_used       ?? 0;
  const avail   = summary?.total_credit_available  ?? 0;
  const pct     = summary?.credit_usage_percentage ?? 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Cartoes de Credito</p>
          <p className="text-[11px] text-muted-foreground">
            {limit > 0 ? `Limite total: ${formatCurrency(limit)}` : "Nenhum cartao cadastrado"}
          </p>
        </div>
        <a href="/credit-cards" className="text-[11px] font-medium text-primary hover:underline">
          Gerenciar
        </a>
      </div>

      {limit === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <CreditCard className="h-7 w-7 text-muted-foreground/30 mb-2" />
          <a href="/credit-cards" className="text-[12px] text-primary hover:underline">
            Adicionar cartao
          </a>
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Utilizado</p>
              <p className="text-[15px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {formatCurrency(used)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Disponivel</p>
              <p className="text-[15px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(avail)}
              </p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                pct > 80 ? "bg-rose-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"
              )}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {pct.toFixed(1).replace(".", ",")}% do limite utilizado
          </p>
        </>
      )}
    </div>
  );
}
