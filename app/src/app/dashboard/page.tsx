"use client";

import * as React from "react";
import {
  TrendingUp,
  Wallet,
  BarChart3,
  Coins,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  RefreshCw,
  Landmark,
  CreditCard,
  Building2,
  Sparkles,
  CheckCircle2,
  Send,
  Bot,
  Calendar,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn, formatCurrency } from "@/lib/utils";
import { AreaChart } from "@/components/charts/AreaChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

const HISTORICO_FULL = [
  { label: "Jul", value: 198000 },
  { label: "Ago", value: 205400 },
  { label: "Set", value: 212800 },
  { label: "Out", value: 208200 },
  { label: "Nov", value: 219600 },
  { label: "Dez", value: 226400 },
  { label: "Jan", value: 239000 },
  { label: "Fev", value: 243800 },
  { label: "Mar", value: 256200 },
  { label: "Abr", value: 264600 },
  { label: "Mai", value: 276100 },
  { label: "Jun", value: 287450 },
];

type Periodo = "1M" | "3M" | "6M" | "12M";
const PERIODO_SLICES: Record<Periodo, number> = { "1M": 2, "3M": 3, "6M": 6, "12M": 12 };

type AccentColor = "blue" | "emerald" | "rose" | "amber";

interface KPIData {
  label:        string;
  value:        number;
  delta:        number;
  positive:     boolean;
  sub:          string;
  trend:        number[];
  icon:         React.ElementType;
  accentColor:  AccentColor;
}

const KPI_CARDS: KPIData[] = [
  {
    label: "Patrimônio Líquido", value: 287450, delta: 2.75, positive: true,
    sub: "vs mês anterior",
    trend: [198, 205, 212, 208, 219, 226, 239, 243, 256, 264, 276, 287],
    icon: Landmark, accentColor: "blue",
  },
  {
    label: "Ativos", value: 312300, delta: 3.20, positive: true,
    sub: "total em custódia",
    trend: [270, 278, 285, 280, 290, 298, 305, 308, 316, 322, 330, 312],
    icon: TrendingUp, accentColor: "emerald",
  },
  {
    label: "Passivos", value: 24850, delta: 1.10, positive: false,
    sub: "dívidas e financiamentos",
    trend: [30, 29, 28, 27, 27, 26, 26, 25, 25, 25, 25, 24],
    icon: CreditCard, accentColor: "rose",
  },
  {
    label: "Renda Passiva", value: 1840, delta: 8.45, positive: true,
    sub: "recebida em Jun/26",
    trend: [800, 900, 950, 1000, 1100, 1200, 1350, 1400, 1500, 1600, 1700, 1840],
    icon: Coins, accentColor: "amber",
  },
];

const ALOCACAO_DATA = [
  { label: "Ações Brasil",  value: 31.2, color: "#3B82F6" },
  { label: "Ações EUA",     value: 24.8, color: "#10B981" },
  { label: "Fundos e ETFs", value: 16.7, color: "#F59E0B" },
  { label: "Renda Fixa",    value: 15.3, color: "#8B5CF6" },
  { label: "Criptomoedas",  value:  6.7, color: "#EC4899" },
  { label: "Outros",        value:  5.3, color: "#6B7280" },
];

const DESPESAS_CATS = [
  { label: "Moradia",     value: 1800, pct: 42, color: "#3B82F6" },
  { label: "Alimentação", value:  920, pct: 21, color: "#10B981" },
  { label: "Transporte",  value:  480, pct: 11, color: "#F59E0B" },
  { label: "Saúde",       value:  360, pct:  8, color: "#EC4899" },
  { label: "Lazer",       value:  420, pct: 10, color: "#8B5CF6" },
  { label: "Outros",      value:  300, pct:  7, color: "#6B7280" },
];

const METAS = [
  { title: "Independência Financeira", current: 287450, target: 500000, color: "#3B82F6" },
  { title: "Comprar imóvel",           current:  56000, target: 100000, color: "#10B981" },
  { title: "Viagem em família",        current:   8500, target:  15000, color: "#F59E0B" },
  { title: "Aposentadoria tranquila",  current: 126000, target: 300000, color: "#8B5CF6" },
];

const CONEXOES = [
  { name: "Itaú",      type: "Conta Corrente",    initials: "IT", bg: "#F97316" },
  { name: "Bradesco",  type: "Conta Corrente",    initials: "BR", bg: "#DC2626" },
  { name: "Nubank",    type: "Conta Digital",     initials: "NU", bg: "#8B5CF6" },
  { name: "Santander", type: "Cartão de Crédito", initials: "SA", bg: "#EF4444" },
];

const AI_PROMPTS = [
  "Quanto gastei com restaurantes este mês?",
  "Qual foi minha maior despesa no cartão?",
  "Como meu patrimônio cresceu nos últimos 12 meses?",
  "Estou gastando mais do que recebo?",
];

const FLUXO_MESES = [
  { label: "Jan", receitas: 11000, despesas: 4200 },
  { label: "Fev", receitas: 11200, despesas: 4100 },
  { label: "Mar", receitas: 12000, despesas: 4600 },
  { label: "Abr", receitas: 11800, despesas: 4400 },
  { label: "Mai", receitas: 12200, despesas: 4150 },
  { label: "Jun", receitas: 12500, despesas: 4280 },
];

// ═══════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════

function Dashboard() {
  return (
    <div className="space-y-5 pb-10">
      <HeroSection />

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <KPICard key={card.label} {...card} />
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <AllocacaoCard className="lg:col-span-3" />
        <PatrimonioChartCard className="lg:col-span-6" />
        <FluxoCaixaCard className="lg:col-span-3" />
      </div>

      {/* Mini stats row */}
      <MiniStatsRow />

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DespesasCard />
        <MetasCard />
        <div className="flex flex-col gap-4">
          <CopilotoCard />
          <ConexoesCard />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════

function HeroSection() {
  const now     = new Date();
  const hour    = now.getHours();
  const greeting =
    hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateStr = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">
          {greeting},{" "}
          <span className="text-gradient-primary">Bernardo</span>
          {" "}👋
        </h1>
        <p className="mt-0.5 text-[14px] text-muted-foreground">
          Aqui está o resumo da sua vida financeira.
        </p>
      </div>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <p className="text-[12px] text-muted-foreground capitalize">{dateStr}</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/60">
            Atualizado às {timeStr}
          </span>
          <button
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-primary px-3 h-8",
              "text-[13px] font-semibold text-primary-foreground",
              "transition-all hover:opacity-90 active:scale-[0.98]"
            )}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronizar contas
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

function Sparkline({
  data,
  positive,
  uid,
}: {
  data: number[];
  positive: boolean;
  uid: string;
}) {
  const W = 80, H = 36;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - 4 - ((v - min) / range) * (H - 10),
  ] as [number, number]);

  const linePath = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
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
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function KPICard({
  label, value, delta, positive, sub, trend, icon: Icon, accentColor,
}: KPIData) {
  const colors = ACCENT[accentColor];
  const uid    = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card p-5",
        "shadow-[var(--shadow-card)] transition-all duration-200",
        "hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
      )}
    >
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
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
            positive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}
        >
          {positive
            ? <ArrowUpRight className="h-3 w-3" />
            : <ArrowDownRight className="h-3 w-3" />}
          {positive ? "+" : "−"}{delta.toFixed(2).replace(".", ",")}%
        </span>
        <span className="text-[11px] text-muted-foreground">{sub}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ALOCAÇÃO CARD
// ═══════════════════════════════════════════════════════════════

function AllocacaoCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Alocação do Patrimônio</p>
          <p className="text-[11px] text-muted-foreground">R$ 287k total</p>
        </div>
        <button className="text-[11px] font-medium text-primary hover:underline">
          Ver detalhes →
        </button>
      </div>

      {/* Donut centrado */}
      <div className="flex justify-center mb-5">
        <DonutChart
          data={ALOCACAO_DATA}
          size={128}
          strokeWidth={22}
          centerLabel="Total"
          centerValue="R$ 287k"
        />
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {ALOCACAO_DATA.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="flex-1 text-[11px] text-muted-foreground truncate">{item.label}</span>
            <span className="text-[11px] font-semibold text-foreground tabular-nums">
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PATRIMÔNIO CHART CARD
// ═══════════════════════════════════════════════════════════════

function PatrimonioChartCard({ className }: { className?: string }) {
  const [periodo, setPeriodo] = React.useState<Periodo>("6M");

  const dados = React.useMemo(
    () => HISTORICO_FULL.slice(-PERIODO_SLICES[periodo]),
    [periodo]
  );

  const inicio   = dados[0].value;
  const fim      = dados[dados.length - 1].value;
  const variacao = ((fim - inicio) / inicio) * 100;
  const isPos    = variacao >= 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-[var(--shadow-card)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">
            Evolução do Patrimônio
          </p>
          <p className="mt-0.5 text-[22px] font-bold tracking-tight text-foreground tabular-nums">
            {formatCurrency(fim)}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5",
                "text-[11px] font-semibold",
                isPos
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              )}
            >
              {isPos
                ? <ArrowUpRight className="h-3 w-3" />
                : <ArrowDownRight className="h-3 w-3" />}
              {isPos ? "+" : "−"}{Math.abs(variacao).toFixed(2).replace(".", ",")}%
            </span>
            <span className="text-[11px] text-muted-foreground">no período</span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex items-center rounded-lg bg-secondary p-0.5 shrink-0">
          {(["1M", "3M", "6M", "12M"] as Periodo[]).map((p) => (
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

      {/* Chart */}
      <div className="px-2 pb-4">
        <AreaChart
          data={dados}
          height={168}
          color="#3B82F6"
          gradientId="patrimonio-main"
          showGrid
          showLabels
          showDots={dados.length <= 4}
          formatValue={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLUXO DE CAIXA CARD
// ═══════════════════════════════════════════════════════════════

function FluxoCaixaCard({ className }: { className?: string }) {
  const atual      = FLUXO_MESES[FLUXO_MESES.length - 1];
  const surplus    = atual.receitas - atual.despesas;
  const taxaPoup   = (surplus / atual.receitas) * 100;
  const despPct    = (atual.despesas / atual.receitas) * 100;

  const saldoData  = FLUXO_MESES.map((m) => ({
    label: m.label,
    value: m.receitas - m.despesas,
    color: "#10B981",
  }));

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">Fluxo de Caixa</p>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Jun/26
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Receitas</span>
            <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {formatCurrency(atual.receitas)}
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
              − {formatCurrency(atual.despesas)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-rose-500"
              style={{ width: `${despPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Surplus */}
      <div className="mb-4 rounded-xl bg-emerald-500/10 p-3.5">
        <p className="text-[10px] font-medium text-muted-foreground">Saldo do mês</p>
        <p className="text-[20px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {formatCurrency(surplus)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          Taxa de poupança: {taxaPoup.toFixed(1).replace(".", ",")}%
        </p>
      </div>

      {/* Mini bar chart — superávit por mês */}
      <p className="mb-2 text-[10px] font-medium text-muted-foreground">
        Superávit mensal
      </p>
      <BarChart
        data={saldoData}
        height={72}
        showLabels
        showGrid={false}
        defaultColor="#10B981"
        formatValue={(v) => `R$${(v / 1000).toFixed(1)}k`}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MINI STATS ROW
// ═══════════════════════════════════════════════════════════════

function MiniStatsRow() {
  const ifPct = Math.round((287450 / 500000) * 100);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Contas conectadas */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-medium text-muted-foreground">Contas Conectadas</p>
          <Building2 className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <p className="text-[26px] font-bold text-foreground leading-none">4</p>
        <div className="mt-2.5 flex -space-x-1.5">
          {CONEXOES.map((c) => (
            <div
              key={c.name}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold text-white ring-2 ring-card"
              style={{ backgroundColor: c.bg }}
            >
              {c.initials}
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">Open Finance ativo</p>
      </div>

      {/* Investimentos */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-medium text-muted-foreground">Investimentos</p>
          <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
        </div>
        <p className="text-[20px] font-bold text-foreground tabular-nums leading-tight">
          {formatCurrency(224600)}
        </p>
        <div className="mt-2 flex items-center gap-1">
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            +2,91%
          </span>
          <span className="text-[11px] text-muted-foreground">a.m.</span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">Carteira diversificada</p>
      </div>

      {/* Meta IF */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-medium text-muted-foreground">
            Independência Financeira
          </p>
          <Target className="h-4 w-4 text-violet-500" />
        </div>
        <p className="text-[26px] font-bold text-foreground leading-none">{ifPct}%</p>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 transition-all"
            style={{ width: `${ifPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Meta: {formatCurrency(500000)}
        </p>
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
          Faça perguntas sobre suas finanças
        </p>
        <button className="mt-3 w-full rounded-lg bg-violet-500/15 py-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400 transition-colors hover:bg-violet-500/25">
          Perguntar agora
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DESPESAS CARD
// ═══════════════════════════════════════════════════════════════

function DespesasCard() {
  const total   = DESPESAS_CATS.reduce((s, c) => s + c.value, 0);
  const orcamento = 5000;
  const pctOrc  = Math.round((total / orcamento) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Despesas por Categoria</p>
          <p className="text-[11px] text-muted-foreground">Junho 2026</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            pctOrc > 85
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          )}
        >
          {pctOrc}% do orçamento
        </span>
      </div>

      <div className="flex justify-center mb-5">
        <DonutChart
          data={DESPESAS_CATS.map((c) => ({ label: c.label, value: c.pct, color: c.color }))}
          size={120}
          strokeWidth={20}
          centerLabel="Total"
          centerValue={`R$${(total / 1000).toFixed(1)}k`}
        />
      </div>

      <div className="space-y-2.5">
        {DESPESAS_CATS.map((cat) => (
          <div key={cat.label} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="flex-1 text-[12px] text-muted-foreground truncate">
              {cat.label}
            </span>
            <span className="text-[12px] font-semibold text-foreground tabular-nums">
              {formatCurrency(cat.value)}
            </span>
            <span className="w-8 text-right text-[10px] text-muted-foreground tabular-nums">
              {cat.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// METAS CARD
// ═══════════════════════════════════════════════════════════════

function MetasCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Metas Financeiras</p>
          <p className="text-[11px] text-muted-foreground">{METAS.length} metas ativas</p>
        </div>
        <button
          className={cn(
            "flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5",
            "text-[11px] font-semibold text-primary-foreground",
            "transition-opacity hover:opacity-90"
          )}
        >
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
                <p className="text-[12px] font-medium text-foreground truncate">
                  {meta.title}
                </p>
                <span
                  className="shrink-0 text-[11px] font-bold tabular-nums"
                  style={{ color: meta.color }}
                >
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
          <p className="text-[13px] font-semibold text-foreground">Análises com IA</p>
          <p className="text-[10px] text-muted-foreground">
            Pergunte qualquer coisa sobre suas finanças
          </p>
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
            ✦ {q}
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
        <button
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            "bg-primary text-primary-foreground transition-opacity hover:opacity-90"
          )}
        >
          <Send className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONEXÕES CARD
// ═══════════════════════════════════════════════════════════════

function ConexoesCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-foreground">Conexões</p>
          <p className="text-[11px] text-muted-foreground">4 contas conectadas</p>
        </div>
        <button className="text-[11px] font-medium text-primary transition-colors hover:underline">
          + Conectar conta
        </button>
      </div>

      <div className="space-y-1">
        {CONEXOES.map((conn) => (
          <div
            key={conn.name}
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/60"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
              style={{ backgroundColor: conn.bg }}
            >
              {conn.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-foreground">{conn.name}</p>
              <p className="text-[10px] text-muted-foreground">{conn.type}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1 text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Conectado</span>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-3 w-full text-center text-[11px] text-primary transition-colors hover:underline">
        Ver todas as conexões
      </button>
    </div>
  );
}
