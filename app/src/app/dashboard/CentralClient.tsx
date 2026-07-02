"use client";

/**
 * CentralClient — Sprint 13.0
 * Nova página Central: home principal do NextFire.
 * Substitui DashboardClient como primeira tela.
 * Zero dados hardcoded — 100% dinâmico via engines.
 */

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, AlertCircle,
  CheckCircle2, Info, ChevronRight, Flame, Target, PiggyBank, Wallet,
  BarChart3, Activity, RefreshCw, Bell, Lightbulb, DollarSign,
  ArrowUpRight, ArrowDownRight, Zap, Shield,
  LogOut, User, Settings, CreditCard, ShieldCheck, HelpCircle, Link2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { logout } from "@/lib/auth/actions";
import type { DashboardData }    from "@/types/dashboard";
import type { RadarInsight }     from "@/lib/radar/types";
import type { HealthSnapshot }   from "@/lib/financial-health";
import type { FinancialInsight } from "@/lib/financial-insights";
import type { InternalAlert }    from "@/services/alerts";
import type { OnboardingStatus } from "@/services/onboarding";
import type { FinancialContext } from "@/lib/financial-context";

// ── Props ─────────────────────────────────────────────────────────────────────

interface UserProfile {
  email?:    string;
  fullName?: string;
  avatarUrl?: string;
  plan?:     string;
}

interface Props {
  user?:             UserProfile;
  data:              DashboardData;
  error:             string | null;
  radarInsights:     RadarInsight[];
  healthSnapshot:    HealthSnapshot | null;
  financialInsights: FinancialInsight[];
  onboarding:        OnboardingStatus | null;
  alerts:            InternalAlert[];
  financialContext:  FinancialContext | null;
}

// ── Formatters ────────────────────────────────────────────────────────────────

function getGreeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return formatCurrency(v);
}

function fmtMonth(m: string): string {
  const mo = parseInt(m.split("-")[1] ?? "1") - 1;
  return ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][mo] ?? m;
}

function scoreLabel(g: string): string {
  return { A: "Excelente", B: "Muito Bom", C: "Bom", D: "Regular", F: "Crítico" }[g] ?? "—";
}

function pctDiff(curr: number, prev: number): number | null {
  if (!prev || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

// ── Fire Avatar — identidade oficial ─────────────────────────────────────────

function FireAvatar({ showOnline = true }: { showOnline?: boolean }) {
  return (
    <div className="relative shrink-0">
      <Image
        src="/brand/fire-avatar2.png"
        alt="Fire"
        width={166}
        height={166}
        priority
        className="h-[166px] w-[166px] object-contain"
      />
      {showOnline && (
        <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
      )}
    </div>
  );
}

// ── SVG: Score Gauge (colorful arc) ──────────────────────────────────────────

function ScoreGauge({ score, sz = 140 }: { score: number; sz?: number }) {
  const cx = sz / 2, cy = sz * 0.56;
  const r  = sz * 0.37, sw = sz * 0.10;
  const sx = cx - r, sy = cy, ex = cx + r;

  const angle = Math.PI - (score / 100) * Math.PI;
  const px = cx + r * Math.cos(angle);
  const py = cy - r * Math.sin(angle);
  const gId = `sg${sz}`;

  return (
    <svg viewBox={`0 0 ${sz} ${cy + sw / 2 + 8}`} style={{ width: sz }} className="mx-auto">
      <defs>
        <linearGradient id={gId} x1={sx} y1="0" x2={ex} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ef4444" />
          <stop offset="45%"  stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {/* track */}
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${sy}`}
        fill="none" stroke={`url(#${gId})`} strokeWidth={sw} strokeLinecap="round" opacity="0.18" />
      {/* progress */}
      {score > 0 && (
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${px.toFixed(2)} ${py.toFixed(2)}`}
          fill="none" stroke={`url(#${gId})`} strokeWidth={sw} strokeLinecap="round" />
      )}
      {/* score */}
      <text x={cx} y={cy - 2} textAnchor="middle"
        fill="white" fontSize={sz * 0.24} fontWeight="700" fontFamily="Inter,system-ui,sans-serif">
        {score}
      </text>
    </svg>
  );
}

// ── SVG: Sparkline with gradient fill ────────────────────────────────────────

function Spark({ values, color = "#8b5cf6", h = 36 }: { values: number[]; color?: string; h?: number }) {
  if (values.length < 2) return <div style={{ height: h }} />;
  const mn = Math.min(...values), rng = Math.max(...values) - mn || 1;
  const W = 100;
  const pad = 4;
  const pts = values.map((v, i) =>
    `${((i / (values.length - 1)) * W).toFixed(1)},${(h - pad - ((v - mn) / rng) * (h - pad * 2)).toFixed(1)}`
  );
  const poly = pts.join(" ");
  const area = `M ${pts[0]} ${pts.map((p, i) => i ? `L ${p}` : "").join(" ")} L ${W} ${h} L 0 ${h} Z`;
  const gid  = `spk${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="w-full" style={{ height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <polyline points={poly} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── SVG: Donut Chart ──────────────────────────────────────────────────────────

interface DonutSlice { label: string; pct: number; value: number; color: string }

function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const cx = 80, cy = 80, r = 58, sw = 22;
  const circumference = 2 * Math.PI * r;
  let offset = circumference * 0.25; // start at 12 o'clock

  const arcs = slices.map(s => {
    const dashLen = (s.pct / 100) * circumference;
    const dash = { offset, dashLen };
    offset -= dashLen;
    return { ...s, ...dash };
  });

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px] mx-auto">
      {arcs.map((s, i) => (
        <circle key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={sw}
          strokeDasharray={`${s.dashLen.toFixed(2)} ${circumference.toFixed(2)}`}
          strokeDashoffset={s.offset.toFixed(2)}
          strokeLinecap="butt"
        />
      ))}
      {/* center text */}
      <text x={cx} y={cy - 6}  textAnchor="middle" fill="white"      fontSize="11" fontWeight="700" fontFamily="Inter,system-ui">{centerLabel}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#71717a"    fontSize="9"  fontFamily="Inter,system-ui">Total</text>
    </svg>
  );
}

// ── SVG: Line Chart (grande, com labels) ──────────────────────────────────────

function LineChart({ series, months }: { series: number[]; months: string[] }) {
  if (series.length < 2) return <div className="h-32 flex items-center justify-center text-zinc-700 text-xs">Sem dados</div>;

  const W = 500, H = 120, padL = 8, padR = 8, padT = 8, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const mn = Math.min(...series), mx = Math.max(...series);
  const rng = mx - mn || 1;

  const toX = (i: number) => padL + (i / (series.length - 1)) * plotW;
  const toY = (v: number) => padT + plotH - ((v - mn) / rng) * plotH * 0.88;

  const linePts  = series.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" L ");
  const linePath = `M ${linePts}`;
  const areaPath = `${linePath} L ${toX(series.length - 1)} ${padT + plotH} L ${padL} ${padT + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lcAreaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* subtle grid */}
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <line key={i}
          x1={padL} y1={padT + plotH * t}
          x2={W - padR} y2={padT + plotH * t}
          stroke="#27272a" strokeWidth="0.5"
        />
      ))}
      <path d={areaPath} fill="url(#lcAreaG)" />
      <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* x-axis labels */}
      {months.map((m, i) => (
        <text key={i}
          x={toX(i)} y={H - 4}
          textAnchor="middle" fill="#52525b" fontSize="9" fontFamily="Inter,system-ui">
          {m}
        </text>
      ))}
    </svg>
  );
}

// ── Builders ──────────────────────────────────────────────────────────────────

interface Priority {
  Icon:      React.ElementType;
  color:     string;
  bg:        string;
  title:     string;
  desc:      string;
  href:      string;
  linkLabel: string;
}

function buildPriorities(
  alerts:    InternalAlert[],
  insights:  FinancialInsight[],
  radar:     RadarInsight[],
): Priority[] {
  const result: Priority[] = [];

  // Danger alerts first
  for (const a of alerts.filter(x => x.severity === "danger").slice(0, 1)) {
    result.push({ Icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10",
      title: a.title, desc: a.description.split(".")[0] + ".", href: a.actionHref, linkLabel: a.actionLabel });
  }
  // Warning alerts
  for (const a of alerts.filter(x => x.severity === "warning").slice(0, 1)) {
    if (result.length >= 3) break;
    result.push({ Icon: AlertCircle, color: "text-amber-400", bg: "bg-amber-500/10",
      title: a.title, desc: a.description.split(".")[0] + ".", href: a.actionHref, linkLabel: a.actionLabel });
  }
  // Success insights (opportunities)
  for (const i of insights.filter(x => x.severity === "success").slice(0, 2)) {
    if (result.length >= 3) break;
    result.push({ Icon: Sparkles, color: "text-emerald-400", bg: "bg-emerald-500/10",
      title: i.title, desc: i.description.split(".")[0] + ".", href: "/investments", linkLabel: i.action ?? "Ver detalhes" });
  }
  // Radar info/warning
  for (const r of radar.filter(x => x.severity !== "info").slice(0, 2)) {
    if (result.length >= 3) break;
    result.push({
      Icon: r.severity === "danger" ? AlertTriangle : r.severity === "warning" ? AlertCircle : TrendingUp,
      color: r.severity === "danger" ? "text-rose-400" : r.severity === "warning" ? "text-amber-400" : "text-violet-400",
      bg:    r.severity === "danger" ? "bg-rose-500/10" : r.severity === "warning" ? "bg-amber-500/10" : "bg-violet-500/10",
      title: r.title, desc: r.description.split(".")[0] + ".", href: "/accounts", linkLabel: r.action,
    });
  }
  // Fallback generic
  if (result.length === 0) {
    result.push({ Icon: Target, color: "text-violet-400", bg: "bg-violet-500/10",
      title: "Configure sua meta FIRE", desc: "Defina seu patrimônio alvo para projetar independência financeira.",
      href: "/fire", linkLabel: "Ir para FIRE" });
  }
  return result.slice(0, 3);
}

interface PanoramaItem { Icon: React.ElementType; color: string; bg: string; label: string; desc: string }

function buildPanorama(
  hs:  HealthSnapshot | null,
  ctx: FinancialContext | null,
  data: DashboardData,
  insights: FinancialInsight[],
): PanoramaItem[] {
  const items: PanoramaItem[] = [];
  const score    = hs?.score.score  ?? 0;
  const grade    = hs?.score.grade  ?? "F";
  const trend    = ctx?.cashFlow.trend ?? "unknown";
  const savings  = ctx?.cashFlow.monthlySavings ?? 0;
  const topCat   = data.expenseByCategory[0];
  const totalExp = data.expenseByCategory.reduce((s, c) => s + c.total_amount, 0);
  const topPct   = topCat && totalExp > 0 ? (topCat.total_amount / totalExp) * 100 : 0;
  const invCtx   = ctx?.investments;

  items.push({
    Icon: Activity, color: score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400",
    bg:   score >= 70 ? "bg-emerald-500/10" : score >= 50 ? "bg-amber-500/10" : "bg-rose-500/10",
    label: "Situação financeira",
    desc:  `Sua saúde financeira está ${scoreLabel(grade).toLowerCase()} — score ${score}/100.`,
  });

  items.push({
    Icon: trend === "declining" ? TrendingDown : TrendingUp,
    color: trend === "declining" ? "text-rose-400" : "text-blue-400",
    bg:    trend === "declining" ? "bg-rose-500/10" : "bg-blue-500/10",
    label: "Fluxo de caixa",
    desc: savings > 0
      ? `Saldo positivo — poupando ${fmt(savings)} este mês.`
      : savings < 0
      ? `Saídas superam entradas em ${fmt(Math.abs(savings))}.`
      : "Fluxo de caixa neutro este mês.",
  });

  if (topCat) {
    items.push({
      Icon: BarChart3,
      color: topPct > 40 ? "text-amber-400" : "text-emerald-400",
      bg:    topPct > 40 ? "bg-amber-500/10" : "bg-emerald-500/10",
      label: "Gastos",
      desc: topPct > 40
        ? `${topCat.category_name} representa ${topPct.toFixed(0)}% dos gastos do mês.`
        : "Você está dentro do planejado no mês.",
    });
  }

  if (invCtx && invCtx.totalValue > 0) {
    items.push({
      Icon: BarChart3,
      color: "text-amber-400", bg: "bg-amber-500/10",
      label: "Investimentos",
      desc: invCtx.isConcentrated
        ? `Carteira concentrada em ${invCtx.topAssetClass ?? "uma classe"}. Considere diversificar.`
        : `Carteira diversificada — score ${invCtx.diversificationScore.toFixed(0)}/100.`,
    });
  }

  const succCount = insights.filter(i => i.severity === "success" || i.severity === "info").length;
  if (succCount > 0) {
    items.push({
      Icon: Lightbulb, color: "text-violet-400", bg: "bg-violet-500/10",
      label: "Oportunidades",
      desc: `${succCount === 1 ? "Há 1 oportunidade" : `Há ${succCount} oportunidades`} de melhoria identificadas.`,
    });
  }

  return items.slice(0, 5);
}

// ── Plan Badge ───────────────────────────────────────────────────────────────

function PlanBadge({ plan = "FIRE PREMIUM" }: { plan?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-violet-700/40 bg-violet-950/60 px-3 py-1.5 backdrop-blur-sm">
      <Image
        src="/brand/nextfire-icon.png"
        alt=""
        width={14}
        height={14}
        className="h-[14px] w-[14px] object-contain shrink-0"
      />
      <span className="text-[11px] font-semibold text-violet-100 tracking-wide uppercase whitespace-nowrap">
        {plan}
      </span>
    </div>
  );
}

// ── Profile Menu ──────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  { label: "Meu Perfil",    href: "/profile",       Icon: User        },
  { label: "Configurações", href: "/settings",      Icon: Settings    },
  { label: "Assinatura",    href: "/subscription",  Icon: CreditCard  },
  { label: "Segurança",     href: "/security",      Icon: ShieldCheck },
  { label: "Open Finance",  href: "/open-finance",  Icon: Link2       },
  { label: "Ajuda",         href: "/help",          Icon: HelpCircle  },
] as const;

function ProfileMenu({ user }: { user?: UserProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = React.useMemo(() => {
    const name = user?.fullName ?? user?.email ?? "U";
    return name.split(/\s+|@/).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("");
  }, [user]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700/60 bg-zinc-800/80 hover:border-violet-600/60 hover:bg-zinc-700/80 transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-violet-600/40"
        aria-label="Perfil"
      >
        {user?.avatarUrl ? (
          <Image src={user.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 object-cover" />
        ) : (
          <span className="text-[13px] font-bold text-zinc-200">{initials}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* User info */}
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-[13px] font-semibold text-zinc-100 truncate">
              {user?.fullName ?? "Usuário"}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">{user?.email ?? ""}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            {MENU_ITEMS.map(({ label, href, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100 transition-colors"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                {label}
              </Link>
            ))}
          </div>

          {/* Logout */}
          <div className="border-t border-zinc-800 py-1">
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 1. Page Header ────────────────────────────────────────────────────────────

function PageHeader({
  dangerCount,
  user,
}: {
  dangerCount: number;
  user?: UserProfile;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[28px] font-bold text-white leading-none tracking-tight">Central</h1>
        <p className="text-[12px] text-zinc-500 mt-1.5">
          Seu panorama financeiro completo, com inteligência do Fire.
        </p>
      </div>
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors">
            <Bell className="h-4 w-4" />
          </button>
          {dangerCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
              {dangerCount}
            </span>
          )}
        </div>
        {/* Plan badge */}
        <PlanBadge plan={user?.plan} />
        {/* Profile */}
        <ProfileMenu user={user} />
      </div>
    </div>
  );
}

// ── 2. Hero Card ──────────────────────────────────────────────────────────────

function HeroCard({ message }: { message: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-800/20 mb-6"
      style={{ background: "linear-gradient(135deg, #1a0e3a 0%, #0f0a1e 60%, #0d0d14 100%)" }}>
      {/* top accent */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
      {/* subtle radial glow */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)" }} />

      <div className="relative flex items-center gap-8 px-8 py-8">
        {/* mensagem — lado esquerdo */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p suppressHydrationWarning className="text-[24px] font-bold text-zinc-50 leading-snug tracking-tight">
            {getGreeting()}, Bernardo! ☀️
          </p>
          <p className="text-[13px] text-zinc-500 mt-1">Aqui está o que mais importa hoje.</p>
          <p className="text-[13px] text-zinc-300 leading-relaxed mt-3">{message}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-zinc-600">Atualizado agora há pouco</span>
          </div>
        </div>

        {/* coluna direita: avatar + botão empilhados */}
        <div className="shrink-0 flex flex-col items-center gap-3">
          <FireAvatar />
          <Link
            href="/fire"
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all whitespace-nowrap w-full"
          >
            Pergunte ao Fire
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── 3. Prioridades de hoje ────────────────────────────────────────────────────

function PrioritiesSection({ priorities }: { priorities: Priority[] }) {
  if (priorities.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-4">
      {priorities.map((p, i) => {
        const Icon = p.Icon;
        return (
          <div key={i} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-5 flex flex-col gap-3 min-h-[190px]">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", p.bg)}>
              <Icon className={cn("h-4 w-4", p.color)} />
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-zinc-100 mb-1">{p.title}</p>
              <p className="text-[11px] text-zinc-500 leading-relaxed">{p.desc}</p>
            </div>
            <Link href={p.href} className={cn("text-[11px] font-medium flex items-center gap-1 transition-colors hover:opacity-70", p.color)}>
              {p.linkLabel} <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Resumo Financeiro ──────────────────────────────────────────────────────

interface KPIChip {
  label: string; value: string; delta: string | null; positive: boolean | null;
}

function ResumoFinanceiro({
  kpis, nwSeries, months,
}: { kpis: KPIChip[]; nwSeries: number[]; months: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-semibold text-zinc-100">Resumo financeiro</p>
        <span className="text-[11px] text-zinc-600 border border-zinc-800 rounded-lg px-2 py-1">Visão geral</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {kpis.map((k, i) => (
          <div key={i}>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-[18px] font-bold text-zinc-100 leading-none">{k.value}</p>
            {k.delta && (
              <p className={cn("text-[10px] mt-1 flex items-center gap-0.5",
                k.positive === true ? "text-emerald-500" : k.positive === false ? "text-rose-500" : "text-zinc-600")}>
                {k.positive === true ? <ArrowUpRight className="h-3 w-3" /> : k.positive === false ? <ArrowDownRight className="h-3 w-3" /> : null}
                {k.delta}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Chart label */}
      <p className="text-[11px] text-zinc-500 mb-2">Patrimônio Líquido</p>
      <LineChart series={nwSeries} months={months} />
    </div>
  );
}

// ── 5. Allocation + Health Score row ─────────────────────────────────────────

function AllocationCard({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const ALLOC_COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#14b8a6"];
  const colored = slices.map((s, i) => ({ ...s, color: ALLOC_COLORS[i % ALLOC_COLORS.length] }));

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex-1">
      <p className="text-[13px] font-semibold text-zinc-100 mb-4">Alocação do patrimônio</p>
      <div className="flex items-center gap-4">
        <DonutChart slices={colored} centerLabel={fmt(total)} />
        <div className="flex flex-col gap-2 flex-1">
          {colored.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-[11px] text-zinc-400 flex-1 truncate">{s.label}</span>
              <span className="text-[11px] font-semibold text-zinc-300">{s.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
      <Link href="/wealth" className="mt-4 flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-300 transition-colors">
        Ver análise completa <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

function HealthScoreCard({
  score, grade, sparkValues,
}: { score: number; grade: string; sparkValues: number[] }) {
  const sl = scoreLabel(grade);
  const colors: Record<string, string> = { A: "#10b981", B: "#10b981", C: "#f59e0b", D: "#f59e0b", F: "#ef4444" };
  const c = colors[grade] ?? "#71717a";
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex-1">
      <p className="text-[13px] font-semibold text-zinc-100 mb-2">Evolução do Health Score</p>
      <ScoreGauge score={score} sz={130} />
      <div className="text-center mb-3">
        <p className="text-[13px] font-bold" style={{ color: c }}>{sl}</p>
      </div>
      <Spark values={sparkValues} color="#8b5cf6" h={40} />
      <Link href="/health" className="mt-4 flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-300 transition-colors">
        Ver detalhes <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── 6. Insights do Fire ───────────────────────────────────────────────────────

const INSIGHT_ICONS: Record<string, React.ElementType> = {
  TrendingUp, TrendingDown, AlertTriangle, AlertCircle, CheckCircle2,
  Info, Lightbulb, PiggyBank, Shield, BarChart3, Activity, Flame, Target, Zap,
};

function InsightsSection({ insights }: { insights: FinancialInsight[] }) {
  if (insights.length === 0) return null;
  const shown = insights.slice(0, 4);
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-semibold text-zinc-100">Insights do Fire</p>
        <Link href="/health" className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
          Ver todos →
        </Link>
      </div>
      <div className="space-y-3">
        {shown.map(insight => {
          const Icon = INSIGHT_ICONS[insight.icon] ?? Sparkles;
          const cs: Record<string, string> = {
            success: "text-emerald-400", info: "text-blue-400",
            warning: "text-amber-400",  danger: "text-rose-400",
          };
          const bs: Record<string, string> = {
            success: "bg-emerald-500/10", info: "bg-blue-500/10",
            warning: "bg-amber-500/10",  danger: "bg-rose-500/10",
          };
          return (
            <div key={insight.id} className="flex items-start gap-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5", bs[insight.severity])}>
                <Icon className={cn("h-3.5 w-3.5", cs[insight.severity])} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-zinc-200">{insight.title}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{insight.description}</p>
              </div>
              {insight.metric && (
                <span className="shrink-0 text-[11px] font-semibold text-zinc-400 bg-zinc-800 rounded-lg px-2 py-1">
                  {insight.metric}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Right Panel: Panorama do dia ──────────────────────────────────────────────

function PanoramaCard({ items }: { items: PanoramaItem[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 flex flex-col">
      <p className="text-[13px] font-semibold text-zinc-100 mb-3">Panorama do dia</p>
      <div className="space-y-0.5">
        {items.map((item, i) => {
          const Icon = item.Icon;
          return (
            <div key={i} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-zinc-800/40 transition-colors">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl mt-0.5", item.bg)}>
                <Icon className={cn("h-3.5 w-3.5", item.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-zinc-200">{item.label}</p>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <Link href="/health" className="mt-3 flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-400 transition-colors">
        Ver panorama completo <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Right Panel: Alertas ──────────────────────────────────────────────────────

function AlertasCard({ alerts }: { alerts: InternalAlert[] }) {
  if (alerts.length === 0) return null;
  const shown = alerts.slice(0, 3);
  const ic: Record<string, string> = { danger: "text-rose-400", warning: "text-amber-400", info: "text-blue-400" };
  const bg: Record<string, string> = { danger: "bg-rose-500/10", warning: "bg-amber-500/10", info: "bg-blue-500/10" };

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-3.5 w-3.5 text-rose-400" />
        <p className="text-[13px] font-semibold text-zinc-100">Alertas importantes</p>
      </div>
      <div className="space-y-2">
        {shown.map(a => (
          <Link key={a.id} href={a.actionHref}
            className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-zinc-800/40 transition-colors group">
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg mt-0.5", bg[a.severity])}>
              <AlertCircle className={cn("h-3.5 w-3.5", ic[a.severity])} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-zinc-200">{a.title}</p>
              <p className="text-[10px] text-zinc-600 leading-snug">{a.description.split(".")[0]}.</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 shrink-0 mt-0.5 transition-colors" />
          </Link>
        ))}
      </div>
      <Link href="/accounts" className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
        Ver todos os alertas <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Right Panel: Oportunidades ────────────────────────────────────────────────

function OportunidadesCard({ insights }: { insights: FinancialInsight[] }) {
  const opps = insights.filter(i => i.metric && (i.severity === "success" || i.severity === "info")).slice(0, 3);
  if (opps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-3.5 w-3.5 text-amber-400" />
        <p className="text-[13px] font-semibold text-zinc-100">Oportunidades</p>
      </div>
      <div className="space-y-1">
        {opps.map(o => (
          <div key={o.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
            <span className="text-[12px] text-zinc-300 flex-1 pr-2">{o.title}</span>
            <span className="text-[11px] font-semibold text-emerald-400 shrink-0">{o.metric}</span>
          </div>
        ))}
      </div>
      <Link href="/investments" className="mt-3 flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">
        Ver todas as oportunidades <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ── Right Panel: Quote ────────────────────────────────────────────────────────

function QuoteCard() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-950/80 to-zinc-900 border border-violet-800/20 p-5 flex items-center gap-4">
      <Image
          src="/brand/fire-avatar2.png"
          alt=""
          width={52}
          height={52}
          className="h-[52px] w-[52px] shrink-0 object-contain"
        />
      <div>
        <p className="text-[13px] font-semibold text-violet-100 leading-snug">
          "Disciplina hoje,<br />liberdade amanhã."
        </p>
        <p className="text-[11px] text-violet-400 mt-1">— Fire</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CentralClient({
  data, error, healthSnapshot, financialInsights, alerts,
  radarInsights, financialContext, user,
}: Props) {
  // ── Derived values ──
  const netWorth      = healthSnapshot?.wealth.netWorth          ?? 0;
  const growthPct     = healthSnapshot?.wealth.monthlyGrowthPct  ?? null;
  const score         = healthSnapshot?.score.score              ?? 0;
  const grade         = healthSnapshot?.score.grade              ?? "F";
  const totalInvested = healthSnapshot?.portfolio.totalInvested  ?? 0;
  const monthlyIncome  = financialContext?.cashFlow.monthlyIncome  ?? data.summary?.monthly_income  ?? 0;
  const monthlyExpense = financialContext?.cashFlow.monthlyExpense ?? data.summary?.monthly_expense ?? 0;
  const dangerCount    = alerts.filter(a => a.severity === "danger").length;

  // ── Cash flow month-over-month deltas ──
  const cf       = data.cashFlow;
  const lastCF   = cf[cf.length - 1];
  const prevCF   = cf[cf.length - 2];
  const incDelta = lastCF && prevCF ? pctDiff(lastCF.total_income,  prevCF.total_income)  : null;
  const expDelta = lastCF && prevCF ? pctDiff(lastCF.total_expense, prevCF.total_expense) : null;
  const curMonth = lastCF ? `(${fmtMonth(lastCF.month)})` : "";

  // ── KPIs ──
  const kpis: KPIChip[] = [
    {
      label: "Patrimônio Líquido",
      value: fmt(netWorth),
      delta: growthPct !== null ? `${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(2)}% vs mês anterior` : null,
      positive: growthPct !== null ? growthPct >= 0 : null,
    },
    {
      label: `Receitas ${curMonth}`,
      value: fmt(monthlyIncome),
      delta: incDelta !== null ? `${incDelta >= 0 ? "+" : ""}${incDelta.toFixed(2)}% vs mês anterior` : null,
      positive: incDelta !== null ? incDelta >= 0 : null,
    },
    {
      label: `Despesas ${curMonth}`,
      value: fmt(monthlyExpense),
      delta: expDelta !== null ? `${expDelta >= 0 ? "+" : ""}${expDelta.toFixed(2)}% vs mês anterior` : null,
      positive: expDelta !== null ? expDelta < 0 : null, // negative expense delta = good
    },
    {
      label: "Investimentos",
      value: fmt(totalInvested),
      delta: null,
      positive: null,
    },
  ];

  // ── Net Worth history (backwards from current) ──
  const nwHistory = (() => {
    let nw = netWorth;
    const hist: number[] = [];
    for (let i = cf.length - 1; i >= 0; i--) {
      hist.unshift(nw);
      nw -= cf[i].net_result;
    }
    return hist.length > 0 ? hist : [netWorth];
  })();
  const nwMonths = cf.map(m => fmtMonth(m.month));

  // ── Portfolio allocation ──
  const manualAssets = data.patrimonio.manualAssets;
  const realEstate   = manualAssets.filter(a => a.asset_type === "real_estate").reduce((s, a) => s + a.current_value, 0);
  const otherManual  = manualAssets.filter(a => a.asset_type !== "real_estate" && a.asset_type !== "cash").reduce((s, a) => s + a.current_value, 0);
  const liquidCash   = data.summary?.total_balance ?? financialContext?.summary.liquidCash ?? 0;
  const totalPatr    = totalInvested + realEstate + otherManual + liquidCash;
  const allocSlices: DonutSlice[] = totalPatr > 0 ? [
    { label: "Investimentos",   value: totalInvested, pct: (totalInvested / totalPatr) * 100, color: "#8b5cf6" },
    { label: "Imóveis",         value: realEstate,    pct: (realEstate    / totalPatr) * 100, color: "#10b981" },
    { label: "Contas e Caixas", value: liquidCash,    pct: (liquidCash    / totalPatr) * 100, color: "#3b82f6" },
    { label: "Outros",          value: otherManual,   pct: (otherManual   / totalPatr) * 100, color: "#f59e0b" },
  ].filter(s => s.value > 0) : [];

  // ── Builders ──
  const priorities  = buildPriorities(alerts, financialInsights, radarInsights);
  const panoramaItems = buildPanorama(healthSnapshot, financialContext, data, financialInsights);
  const sparkValues   = cf.slice(-8).map(m => m.net_result);

  // ── Hero message ──
  const heroMsg = financialContext?.textual.paragraphPT
    ? financialContext.textual.paragraphPT.split(". ").slice(0, 2).join(". ") + "."
    : "Continue acompanhando para receber análises detalhadas da sua vida financeira.";

  return (
    <div className="flex flex-col min-h-0 pb-8">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[12px] text-rose-400 mb-4">
          {error}
        </div>
      )}

      {/* Page header */}
      <PageHeader dangerCount={dangerCount} user={user} />

      {/* Hero */}
      <HeroCard message={heroMsg} />

      {/* ── Título acima do grid ── */}
      <p className="text-[15px] font-semibold text-zinc-100 mb-3">Prioridades de hoje</p>

      {/* ── Layout principal: coluna esq (cards → resumo → gráficos → insights)
               coluna dir (panorama → alertas → oportunidades → quote) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">

        {/* ── Coluna Esquerda ── */}
        <div className="flex flex-col gap-4">
          {/* Cards de Prioridades — topo alinha com o topo do PanoramaCard */}
          <PrioritiesSection priorities={priorities} />

          {/* Resumo Financeiro — segue o fluxo da coluna esquerda */}
          <ResumoFinanceiro kpis={kpis} nwSeries={nwHistory} months={nwMonths} />

          {/* Allocation + Health Score */}
          <div className="flex gap-4">
            {allocSlices.length > 0 && (
              <AllocationCard slices={allocSlices} total={totalPatr} />
            )}
            <HealthScoreCard score={score} grade={grade} sparkValues={sparkValues} />
          </div>

          {/* Insights */}
          <InsightsSection insights={financialInsights} />
        </div>

        {/* ── Coluna Direita ── */}
        <div className="flex flex-col gap-4">
          <PanoramaCard items={panoramaItems} />
          <AlertasCard alerts={alerts} />
          <OportunidadesCard insights={financialInsights} />
          <QuoteCard />
        </div>
      </div>
    </div>
  );
}
