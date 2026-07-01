"use client";

/**
 * DashboardClient — Sprint 12.1 UX Redesign
 *
 * Filosofia: FIRE é o produto. O dashboard existe para provar o que o FIRE diz.
 * Hierarquia:
 *   1. Saudação (header compacto)
 *   2. Hero do FIRE (seção, não card — domina os primeiros 700px)
 *   3. Ações sugeridas (cards grandes)
 *   4. Indicadores financeiros (subordinados, após o FIRE)
 *   5. Timeline
 *   6. Campo de conversa
 *
 * Inspiração: OpenAI · Apple · Linear · Arc · Perplexity
 */

import * as React from "react";
import Link from "next/link";
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  AlertCircle, Info, ChevronRight, Flame, Target, PiggyBank, Wallet,
  BarChart3, Activity, RefreshCw, Bell, Lightbulb, Home,
  ArrowUpRight, ArrowDownRight, Zap, Shield, BookOpen, FileText,
  DollarSign, Building2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { DashboardData } from "@/types/dashboard";
import type { RadarInsight }   from "@/lib/radar/types";
import type { HealthSnapshot } from "@/lib/financial-health";
import type { FinancialInsight } from "@/lib/financial-insights";
import type { InternalAlert }    from "@/services/alerts";
import type { OnboardingStatus } from "@/services/onboarding";

// ── Types ─────────────────────────────────────────────────────

interface Props {
  data:              DashboardData;
  error:             string | null;
  radarInsights:     RadarInsight[];
  healthSnapshot:    HealthSnapshot | null;
  financialInsights: FinancialInsight[];
  onboarding:        OnboardingStatus | null;
  alerts:            InternalAlert[];
}

// ── Utils ─────────────────────────────────────────────────────

function greet(): string {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return formatCurrency(v);
}

function scoreLabel(g: string): string {
  return { A: "Excelente", B: "Muito Bom", C: "Bom", D: "Regular", F: "Crítico" }[g] ?? "—";
}

function scoreHex(s: number): string {
  if (s >= 80) return "#10b981";
  if (s >= 65) return "#3b82f6";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

function calcFireYear(nw: number, target: number, gPct: number | null): number | null {
  if (target <= 0 || nw <= 0 || !gPct || gPct <= 0) return null;
  if (nw >= target) return new Date().getFullYear();
  const m = Math.log(target / nw) / Math.log(1 + gPct / 100);
  if (!isFinite(m) || m <= 0 || m > 600) return null;
  return new Date().getFullYear() + Math.ceil(m / 12);
}

// ── Score Arc ──────────────────────────────────────────────────

function ScoreArc({ score, sz = 120 }: { score: number; sz?: number }) {
  const cx = sz / 2, cy = sz / 2, r = sz * 0.37;
  const color = scoreHex(score);
  const sx = cx - r, sy = cy, ex = cx + r, ey = cy;
  const a = (180 - (score / 100) * 180) * (Math.PI / 180);
  const px = cx + r * Math.cos(a), py = cy - r * Math.sin(a);
  const la = score > 50 ? 1 : 0;
  return (
    <svg viewBox={`0 0 ${sz} ${sz / 2 + 18}`} style={{ width: sz }} className="mx-auto">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke="#27272a" strokeWidth="10" strokeLinecap="round" />
      {score > 0 && (
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${la} 1 ${px.toFixed(2)} ${py.toFixed(2)}`} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize={sz * 0.24} fontWeight="700" fontFamily="Inter,system-ui">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#52525b" fontSize={sz * 0.1} fontFamily="Inter,system-ui">/ 100</text>
    </svg>
  );
}

// ── Spark ──────────────────────────────────────────────────────

function Spark({ values, color = "#8b5cf6" }: { values: number[]; color?: string }) {
  if (values.length < 2) return <div className="h-8 w-full" />;
  const mn = Math.min(...values), mx = Math.max(...values), rng = mx - mn || 1;
  const W = 80, H = 32, step = W / (values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - mn) / rng) * H).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── 1. Header ──────────────────────────────────────────────────

function Header({ dangerCount }: { dangerCount: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[22px] font-semibold text-zinc-50 leading-none tracking-tight">
          {greet()}, Bernardo 👋
        </p>
        <p className="text-[12px] text-zinc-600 mt-1.5 capitalize">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[11px] font-medium text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all">
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-500 hover:text-zinc-200 hover:border-zinc-700 transition-all">
          <Bell className="h-4 w-4" />
          {dangerCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              {dangerCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

// ── 2. FIRE Hero Section ───────────────────────────────────────

interface EventChipProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  positive?: boolean | null;
  iconColor: string;
  iconBg: string;
}

function EventChip({ icon: Icon, label, value, sub, positive, iconColor, iconBg }: EventChipProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4 min-w-[140px] flex-1">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5", iconBg)}>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide mb-0.5 leading-none">{label}</p>
        <p className="text-[15px] font-bold text-zinc-100 leading-tight">{value}</p>
        {sub && (
          <p className={cn("text-[10px] mt-0.5 leading-none",
            positive === true  ? "text-emerald-500" :
            positive === false ? "text-rose-500"    : "text-zinc-600"
          )}>{sub}</p>
        )}
      </div>
    </div>
  );
}

function buildMessage(
  growthBRL:    number,
  growthPct:    number | null,
  isPos:        boolean,
  fireYear:     number | null,
  dangerAlerts: InternalAlert[],
  succInsights: FinancialInsight[],
): string {
  const parts: string[] = [];

  if (growthPct !== null && Math.abs(growthPct) > 0.01) {
    parts.push(
      `Seu patrimônio ${isPos ? "cresceu" : "caiu"} ${formatCurrency(Math.abs(growthBRL))} este mês`
    );
  }

  if (dangerAlerts.length > 0) {
    const n = dangerAlerts.length;
    parts.push(`encontrei ${n === 1 ? "um alerta crítico" : `${n} alertas críticos`} que ${n === 1 ? "merece" : "merecem"} atenção imediata`);
  } else if (succInsights.length > 0) {
    parts.push("encontrei oportunidades para acelerar sua meta FIRE");
  }

  if (fireYear && parts.length < 3) {
    parts.push(`sua independência financeira está prevista para ${fireYear}`);
  }

  if (parts.length === 0) {
    return "Conecte suas contas e registre transações para que eu possa analisar sua vida financeira completa.";
  }

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (parts.length === 1) return cap(parts[0]) + ".";
  if (parts.length === 2) return cap(parts[0]) + " e " + parts[1] + ".";
  return cap(parts[0]) + ", " + parts.slice(1, -1).join(", ") + " e " + parts[parts.length - 1] + ".";
}

interface FireHeroProps {
  netWorth:     number;
  growthBRL:    number;
  growthPct:    number | null;
  passiveIncome:number;
  fireYear:     number | null;
  fireProgress: number;
  alerts:       InternalAlert[];
  insights:     FinancialInsight[];
  topAlertTitle:string | null;
  topCatName:   string | null;
  topCatPct:    number;
}

function FireHero({
  netWorth, growthBRL, growthPct, passiveIncome,
  fireYear, fireProgress, alerts, insights, topAlertTitle, topCatName, topCatPct,
}: FireHeroProps) {
  const isPos       = (growthPct ?? 0) >= 0;
  const dangerAlerts= alerts.filter(a => a.severity === "danger");
  const succInsights= insights.filter(i => i.severity === "success");
  const message     = buildMessage(growthBRL, growthPct, isPos, fireYear, dangerAlerts, succInsights);

  // 4 events
  const events: EventChipProps[] = [
    {
      icon:      isPos ? TrendingUp : TrendingDown,
      label:     "Patrimônio",
      value:     growthBRL > 0 ? fmt(growthBRL) : fmt(netWorth),
      sub:       growthPct !== null ? `${isPos ? "+" : ""}${growthPct.toFixed(2)}% vs mês anterior` : "patrimônio líquido",
      positive:  growthPct !== null ? isPos : null,
      iconColor: isPos ? "text-emerald-400" : "text-rose-400",
      iconBg:    isPos ? "bg-emerald-500/15" : "bg-rose-500/15",
    },
    {
      icon:      DollarSign,
      label:     "Dividendos",
      value:     passiveIncome > 0 ? fmt(passiveIncome) : "—",
      sub:       passiveIncome > 0 ? "renda passiva mensal" : "sem renda passiva",
      positive:  passiveIncome > 0 ? true : null,
      iconColor: "text-blue-400",
      iconBg:    "bg-blue-500/15",
    },
    {
      icon:      Flame,
      label:     "Meta FIRE",
      value:     fireYear ? `${fireYear}` : "—",
      sub:       `${fireProgress.toFixed(0)}% concluído`,
      positive:  fireProgress >= 50 ? true : null,
      iconColor: "text-amber-400",
      iconBg:    "bg-amber-500/15",
    },
    dangerAlerts.length > 0
      ? {
          icon:      AlertTriangle,
          label:     "Alerta",
          value:     dangerAlerts[0].title,
          sub:       dangerAlerts[0].description.split(".")[0] ?? "",
          positive:  false,
          iconColor: "text-rose-400",
          iconBg:    "bg-rose-500/15",
        }
      : topCatName
      ? {
          icon:      BarChart3,
          label:     "Maior gasto",
          value:     topCatName,
          sub:       `${topCatPct.toFixed(0)}% das despesas do mês`,
          positive:  topCatPct < 30 ? null : false,
          iconColor: "text-amber-400",
          iconBg:    "bg-amber-500/15",
        }
      : {
          icon:      CheckCircle2,
          label:     "Sem alertas",
          value:     "Tudo em dia",
          sub:       "nenhum alerta crítico",
          positive:  true,
          iconColor: "text-emerald-400",
          iconBg:    "bg-emerald-500/15",
        },
  ];

  return (
    <section className="rounded-3xl border border-zinc-800/30 bg-zinc-900/30 px-8 py-8 relative overflow-hidden">
      {/* Subtle top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-600/30 to-transparent" />

      {/* Main row */}
      <div className="flex items-start gap-7 mb-7">
        {/* FIRE avatar */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-xl shadow-violet-700/30">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-medium text-emerald-500/70">online</span>
          </div>
        </div>

        {/* Message block */}
        <div className="flex-1 min-w-0">
          <p className="text-[26px] font-bold text-zinc-50 leading-snug tracking-tight">
            {greet()}.
          </p>
          <p className="text-[26px] font-bold text-zinc-50 leading-snug tracking-tight mb-4">
            Analisei toda sua vida financeira.
          </p>
          <p className="text-[15px] text-zinc-400 leading-relaxed max-w-2xl">
            {message}
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0 flex flex-col items-end gap-3">
          <Link
            href="/fire"
            className="flex items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all shadow-lg shadow-violet-700/25 whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            Conversar com FIRE
          </Link>
          <p className="text-[10px] text-zinc-700 text-right max-w-[160px]">
            Seu consultor financeiro IA, disponível 24h
          </p>
        </div>
      </div>

      {/* 4 events */}
      <div className="flex gap-3">
        {events.map((ev, i) => (
          <EventChip key={i} {...ev} />
        ))}
      </div>
    </section>
  );
}

// ── 3. Ações sugeridas ─────────────────────────────────────────

const ACTIONS = [
  {
    icon:   BarChart3,
    label:  "Analisar investimentos",
    sub:    "Veja oportunidades na sua carteira",
    href:   "/investments",
    color:  "text-violet-400",
    bg:     "bg-violet-500/10",
    border: "hover:border-violet-500/30",
  },
  {
    icon:   Activity,
    label:  "Melhorar meu score",
    sub:    "Suba sua pontuação financeira",
    href:   "/dashboard",
    color:  "text-blue-400",
    bg:     "bg-blue-500/10",
    border: "hover:border-blue-500/30",
  },
  {
    icon:   Flame,
    label:  "Projetar minha FIRE",
    sub:    "Simule sua independência financeira",
    href:   "/fire",
    color:  "text-amber-400",
    bg:     "bg-amber-500/10",
    border: "hover:border-amber-500/30",
  },
  {
    icon:   Building2,
    label:  "Comprar imóvel",
    sub:    "Planeje e simule sua compra",
    href:   "/fire",
    color:  "text-emerald-400",
    bg:     "bg-emerald-500/10",
    border: "hover:border-emerald-500/30",
  },
  {
    icon:   Lightbulb,
    label:  "Encontrar oportunidades",
    sub:    "Descubra como crescer mais",
    href:   "/investments",
    color:  "text-rose-400",
    bg:     "bg-rose-500/10",
    border: "hover:border-rose-500/30",
  },
  {
    icon:   Sparkles,
    label:  "Perguntar ao FIRE",
    sub:    "Tire qualquer dúvida financeira",
    href:   "/fire",
    color:  "text-violet-400",
    bg:     "bg-violet-500/10",
    border: "hover:border-violet-500/30",
  },
];

function SuggestedActions() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[16px] font-semibold text-zinc-100 leading-none">O que você quer fazer?</p>
          <p className="text-[12px] text-zinc-600 mt-1">Escolha uma ação ou converse diretamente com o FIRE</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <Link
              key={a.label}
              href={a.href}
              className={cn(
                "group flex items-start gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-5",
                "hover:bg-zinc-900 transition-all",
                a.border
              )}
            >
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl mt-0.5", a.bg)}>
                <Icon className={cn("h-5 w-5", a.color)} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-zinc-100 leading-snug group-hover:text-white transition-colors">{a.label}</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{a.sub}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── 4. Indicadores financeiros ─────────────────────────────────

interface IndicatorsProps {
  netWorth:      number;
  growthPct:     number | null;
  score:         number;
  grade:         string;
  monthlyExpense:number;
  netSeries:     number[];
  expSeries:     number[];
}

function FinancialIndicators({ netWorth, growthPct, score, grade, monthlyExpense, netSeries, expSeries }: IndicatorsProps) {
  const sl    = scoreLabel(grade);
  const color = scoreHex(score);

  return (
    <div>
      <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">Resumo financeiro</p>
      <div className="grid grid-cols-3 gap-4">
        {/* Patrimônio */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-3.5 w-3.5 text-violet-400" />
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Patrimônio líquido</p>
          </div>
          <p className="text-[24px] font-bold text-violet-400 leading-none mb-2">{fmt(netWorth)}</p>
          {growthPct !== null && (
            <div className="flex items-center gap-1.5 mb-3">
              {growthPct >= 0
                ? <ArrowUpRight   className="h-3.5 w-3.5 text-emerald-500" />
                : <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
              }
              <span className={cn("text-[12px] font-semibold", growthPct >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {growthPct >= 0 ? "+" : ""}{growthPct.toFixed(2)}% este mês
              </span>
            </div>
          )}
          <Spark values={netSeries} color="#8b5cf6" />
          <Link href="/accounts" className="mt-3 flex items-center justify-center gap-1 w-full rounded-xl border border-zinc-800 py-2 text-[11px] text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-colors">
            Ver detalhes <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Health Score */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Health Score</p>
          </div>
          <ScoreArc score={score} sz={110} />
          <div className="text-center mt-1 mb-3">
            <p className="text-[13px] font-semibold" style={{ color }}>{sl}</p>
          </div>
          <Link href="/dashboard" className="flex items-center justify-center gap-1 w-full rounded-xl border border-zinc-800 py-2 text-[11px] text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-colors">
            Ver análise <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Gastos */}
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-3.5 w-3.5 text-rose-400" />
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Gastos do mês</p>
          </div>
          <p className="text-[24px] font-bold text-zinc-100 leading-none mb-4">{fmt(monthlyExpense)}</p>
          <Spark values={expSeries} color="#f43f5e" />
          <Link href="/transactions" className="mt-3 flex items-center justify-center gap-1 w-full rounded-xl border border-zinc-800 py-2 text-[11px] text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-colors">
            Ver detalhes <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── 5. Timeline ────────────────────────────────────────────────

interface TimelineEvent {
  id:       string;
  type:     "success" | "warning" | "danger" | "info";
  title:    string;
  sub:      string;
  time:     string;
}

const TL_STYLE = {
  success: { icon: CheckCircle2, ic: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  warning: { icon: AlertTriangle,ic: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20"    },
  danger:  { icon: AlertCircle,  ic: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20"      },
  info:    { icon: Info,         ic: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20"      },
};

function buildTimeline(
  alerts:   InternalAlert[],
  insights: FinancialInsight[],
  data:     DashboardData,
): TimelineEvent[] {
  const evs: TimelineEvent[] = [];

  for (const a of alerts.slice(0, 2)) {
    evs.push({ id: a.id, type: a.severity, title: a.title, sub: a.description.split(".")[0] ?? "", time: "Hoje" });
  }

  for (const i of insights.filter(x => x.severity === "success").slice(0, 2)) {
    evs.push({ id: i.id, type: "success", title: i.title, sub: i.metric ?? i.description.split(".")[0] ?? "", time: "Hoje" });
  }

  const last = data.cashFlow[data.cashFlow.length - 1];
  if (last && last.net_result > 0) {
    evs.push({ id: "surplus", type: "info", title: `Saldo disponível para investir: ${fmt(last.net_result)}`, sub: "resultado do mês", time: "Hoje" });
  }

  if (data.expenseByCategory.length > 0) {
    const top   = data.expenseByCategory[0];
    const total = data.expenseByCategory.reduce((s, c) => s + c.total_amount, 0);
    const pct   = total > 0 ? (top.total_amount / total) * 100 : 0;
    if (pct >= 25) {
      evs.push({ id: "topcat", type: pct >= 40 ? "warning" : "info", title: `Gasto em destaque: ${top.category_name}`, sub: `${pct.toFixed(0)}% das despesas do mês`, time: "Este mês" });
    }
  }

  return evs.slice(0, 5);
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  const [offset, setOffset] = React.useState(0);
  const visible = 3;
  const max = Math.max(0, events.length - visible);
  if (events.length === 0) return null;
  const shown = events.slice(offset, offset + visible);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[16px] font-semibold text-zinc-100">Linha do tempo</p>
        <div className="flex items-center gap-3">
          <Link href="/timeline" className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">Ver tudo</Link>
          <div className="flex gap-1">
            <button onClick={() => setOffset(Math.max(0, offset - 1))} disabled={offset === 0}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-800 text-zinc-600 hover:text-zinc-300 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            </button>
            <button onClick={() => setOffset(Math.min(max, offset + 1))} disabled={offset >= max}
              className="flex h-6 w-6 items-center justify-center rounded-lg border border-zinc-800 text-zinc-600 hover:text-zinc-300 disabled:opacity-30 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {shown.map(ev => {
          const s = TL_STYLE[ev.type];
          const Icon = s.icon;
          return (
            <div key={ev.id} className={cn("rounded-2xl border p-4 transition-all hover:opacity-80", s.bg)}>
              <div className="flex items-start gap-3 mb-2">
                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", s.ic)} />
                <span className="text-[10px] text-zinc-600 mt-0.5">{ev.time}</span>
              </div>
              <p className="text-[12px] font-semibold text-zinc-200 leading-snug mb-1">{ev.title}</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">{ev.sub}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 6. Chat bar ────────────────────────────────────────────────

function ChatBar() {
  return (
    <Link
      href="/fire"
      className="group flex items-center gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 px-5 py-4 hover:border-violet-800/40 hover:bg-zinc-900/60 transition-all"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600/20 group-hover:bg-violet-600/30 transition-colors">
        <Sparkles className="h-4 w-4 text-violet-400" />
      </div>
      <span className="flex-1 text-[13px] text-zinc-600 group-hover:text-zinc-500 transition-colors">
        Pergunte qualquer coisa ao FIRE sobre sua vida financeira…
      </span>
      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 group-hover:bg-violet-500 transition-colors">
        <ArrowUpRight className="h-3.5 w-3.5 text-white" />
      </div>
    </Link>
  );
}

// ── Right: Health Score ────────────────────────────────────────

function RPHealth({ score, grade }: { score: number; grade: string }) {
  const sl    = scoreLabel(grade);
  const color = scoreHex(score);
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-zinc-100">Health Score</p>
        <Link href="/dashboard" className="text-[10px] text-zinc-500 hover:text-zinc-300">análise →</Link>
      </div>
      <ScoreArc score={score} sz={130} />
      <div className="text-center mt-1 mb-4">
        <p className="text-[14px] font-bold" style={{ color }}>{sl}</p>
        <p className="text-[11px] text-zinc-600 mt-0.5">{score >= 70 ? "Você está entre os melhores" : "Há espaço para melhorar"}</p>
      </div>
      <Link href="/dashboard" className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-zinc-800 py-2.5 text-[12px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors">
        Ver análise completa <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ── Right: Próximas ações ──────────────────────────────────────

const NEXT_ACTS = [
  { icon: PiggyBank,  c: "text-emerald-400", bg: "bg-emerald-500/10", label: "Economizar mais",     sub: "Identifique gastos a cortar", href: "/budgets"     },
  { icon: TrendingUp, c: "text-blue-400",    bg: "bg-blue-500/10",    label: "Investir melhor",     sub: "Otimize retorno da carteira", href: "/investments" },
  { icon: Target,     c: "text-amber-400",   bg: "bg-amber-500/10",   label: "Revisar objetivos",   sub: "Atualize suas metas FIRE",    href: "/fire"        },
  { icon: Shield,     c: "text-violet-400",  bg: "bg-violet-500/10",  label: "Reserva emergência",  sub: "Meta: 6 meses de despesas",   href: "/accounts"    },
];

function RPNextActions() {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-semibold text-zinc-100">Próximas ações</p>
        <Zap className="h-3.5 w-3.5 text-amber-400" />
      </div>
      <div className="space-y-0.5">
        {NEXT_ACTS.map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.label} href={a.href}
              className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-zinc-800/60 transition-colors">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", a.bg)}>
                <Icon className={cn("h-3.5 w-3.5", a.c)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zinc-200">{a.label}</p>
                <p className="text-[10px] text-zinc-600">{a.sub}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Right: Dica da IA ──────────────────────────────────────────

function RPAITip({ fireProgress, fireYear }: { fireProgress: number; fireYear: number | null }) {
  const tip = fireProgress > 0
    ? `Você já conquistou ${fireProgress.toFixed(0)}% do caminho para a independência financeira${fireYear ? ` (previsão: ${fireYear})` : ""}. Com aportes mensais consistentes é possível antecipar esse prazo significativamente.`
    : "Defina sua meta FIRE e comece a investir regularmente para receber projeções personalizadas da sua independência financeira.";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-950/80 to-zinc-900 border border-violet-800/25 p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/4 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <p className="text-[12px] font-semibold text-violet-200">Dica do FIRE</p>
          <span className="ml-auto rounded-full bg-violet-500/25 px-2 py-0.5 text-[9px] font-bold text-violet-300 uppercase tracking-wide">IA</span>
        </div>
        <p className="text-[12px] text-violet-300/75 leading-relaxed mb-4">{tip}</p>
        <Link href="/fire" className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-violet-700/50 hover:bg-violet-700/80 py-2.5 text-[12px] font-semibold text-violet-100 transition-colors">
          Ver simulação <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Right: Atalhos ─────────────────────────────────────────────

const SHORTCUTS = [
  { icon: FileText,  label: "Relatórios",  href: "/investments",      c: "text-rose-400",    bg: "bg-rose-500/15"    },
  { icon: TrendingUp,label: "Projeções",   href: "/fire",        c: "text-blue-400",    bg: "bg-blue-500/15"    },
  { icon: BarChart3, label: "Market Data", href: "/admin/market-data", c: "text-amber-400",   bg: "bg-amber-500/15"   },
  { icon: BookOpen,  label: "Aprender",    href: "/timeline",          c: "text-emerald-400", bg: "bg-emerald-500/15" },
];

function RPShortcuts() {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] font-semibold text-zinc-100">Atalhos</p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {SHORTCUTS.map(s => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="flex flex-col items-center gap-2 group">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:scale-105", s.bg)}>
                <Icon className={cn("h-4 w-4", s.c)} />
              </div>
              <span className="text-[9px] text-zinc-600 group-hover:text-zinc-400 text-center transition-colors">{s.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────

export function DashboardClient({
  data, error, healthSnapshot, financialInsights, alerts,
}: Props) {
  // Derived metrics
  const netWorth        = healthSnapshot?.wealth.netWorth           ?? 0;
  const growthPct       = healthSnapshot?.wealth.monthlyGrowthPct   ?? null;
  const score           = healthSnapshot?.score.score               ?? 0;
  const grade           = healthSnapshot?.score.grade               ?? "F";
  const passiveIncome   = healthSnapshot?.passiveIncome.monthlyPassiveIncome ?? 0;
  const fireProgressPct = healthSnapshot?.fireProgress.progressPct  ?? 0;
  const fireTarget      = healthSnapshot?.fireProgress.fireTarget    ?? 0;
  const monthlyExpense  = data.summary?.monthly_expense             ?? 0;

  const isPos     = (growthPct ?? 0) >= 0;
  const growthBRL = growthPct !== null ? Math.abs(netWorth * growthPct / 100) : 0;
  const fYear     = calcFireYear(netWorth, fireTarget, growthPct);

  const netSeries  = data.cashFlow.slice(-8).map(m => m.net_result);
  const expSeries  = data.cashFlow.slice(-8).map(m => m.total_expense);

  const dangerCount = alerts.filter(a => a.severity === "danger").length;

  const topCat    = data.expenseByCategory[0] ?? null;
  const totalExp  = data.expenseByCategory.reduce((s, c) => s + c.total_amount, 0);
  const topCatPct = totalExp > 0 && topCat ? (topCat.total_amount / totalExp) * 100 : 0;

  const timelineEvents = buildTimeline(alerts, financialInsights, data);

  return (
    <div className="flex gap-6 xl:gap-8 min-h-0">
      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-7 pb-8">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[12px] text-rose-400">
            {error}
          </div>
        )}

        {/* 1. Header */}
        <Header dangerCount={dangerCount} />

        {/* 2. FIRE Hero */}
        <FireHero
          netWorth={netWorth}
          growthBRL={growthBRL}
          growthPct={growthPct}
          passiveIncome={passiveIncome}
          fireYear={fYear}
          fireProgress={fireProgressPct}
          alerts={alerts}
          insights={financialInsights}
          topAlertTitle={alerts[0]?.title ?? null}
          topCatName={topCat?.category_name ?? null}
          topCatPct={topCatPct}
        />

        {/* 3. Ações sugeridas */}
        <SuggestedActions />

        {/* 4. Indicadores — somente após o FIRE */}
        <FinancialIndicators
          netWorth={netWorth}
          growthPct={growthPct}
          score={score}
          grade={grade}
          monthlyExpense={monthlyExpense}
          netSeries={netSeries}
          expSeries={expSeries}
        />

        {/* 5. Timeline */}
        {timelineEvents.length > 0 && <Timeline events={timelineEvents} />}

        {/* 6. Chat bar */}
        <ChatBar />
      </div>

      {/* ── Right column (xl only) ── */}
      <div className="w-[280px] shrink-0 hidden xl:flex flex-col gap-4 pb-8">
        <RPHealth score={score} grade={grade} />
        <RPNextActions />
        <RPAITip fireProgress={fireProgressPct} fireYear={fYear} />
        <RPShortcuts />
      </div>
    </div>
  );
}
