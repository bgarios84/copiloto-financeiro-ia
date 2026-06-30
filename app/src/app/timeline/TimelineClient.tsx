"use client";

/**
 * TimelineClient — Timeline Financeira e Patrimonial
 * Sprint 8.3
 *
 * Feed com filtros por período e categoria.
 * Desktop: linha central com cards alternados.
 * Mobile:  cards empilhados com trilho esquerdo.
 */

import * as React from "react";
import {
  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Coins, RefreshCw, AlertTriangle, Package, Landmark, Home, Car, Wallet,
  PiggyBank, CreditCard, Building2, Bitcoin, Banknote, Gift, GitFork,
  GitMerge, Minus, Activity, Filter, Calendar, ChevronDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { TimelineEvent, TimelineSummary, TimelineCategory, TimePeriod } from "@/lib/timeline/types";
import {
  TIMELINE_CATEGORY_LABELS, TIMELINE_CATEGORY_COLORS,
  TIME_PERIOD_LABELS,
} from "@/lib/timeline/types";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Coins, RefreshCw, AlertTriangle, Package, Landmark, Home, Car, Wallet,
  PiggyBank, CreditCard, Building2, Bitcoin, Banknote, Gift, GitFork,
  GitMerge, Minus, Activity,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function subDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(period: TimePeriod, customFrom: string, customTo: string) {
  const today = new Date();
  switch (period) {
    case "today":  return { from: isoDate(today), to: isoDate(today) };
    case "7d":     return { from: isoDate(subDays(today, 6)), to: isoDate(today) };
    case "30d":    return { from: isoDate(subDays(today, 29)), to: isoDate(today) };
    case "90d":    return { from: isoDate(subDays(today, 89)), to: isoDate(today) };
    case "custom": return { from: customFrom || isoDate(subDays(today, 29)), to: customTo || isoDate(today) };
  }
}

function fmtDateHeader(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const todayIso = isoDate(today);
  const yesterdayIso = isoDate(subDays(today, 1));
  if (iso === todayIso)     return "Hoje";
  if (iso === yesterdayIso) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  events:  TimelineEvent[];
  summary: TimelineSummary;
  error:   string | null;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TimelineClient({ events, summary, error }: Props) {
  const [period, setPeriod]       = React.useState<TimePeriod>("30d");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo]     = React.useState("");
  const [category, setCategory]   = React.useState<TimelineCategory | "all">("all");

  const { from, to } = getDateRange(period, customFrom, customTo);

  const filtered = React.useMemo(() => {
    return events.filter(e => {
      if (e.date < from || e.date > to) return false;
      if (category !== "all" && e.category !== category) return false;
      return true;
    });
  }, [events, from, to, category]);

  // Agrupar por data
  const grouped = React.useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    for (const e of filtered) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const CATEGORIES: Array<TimelineCategory | "all"> = [
    "all", "finance", "investment", "dividend", "budget", "asset", "market", "system",
  ];
  const PERIODS: TimePeriod[] = ["today", "7d", "30d", "90d", "custom"];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-bold text-foreground">Timeline Financeira</h1>
        <p className="text-[13px] text-muted-foreground">Histórico consolidado de todas as suas movimentações</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
        </div>
      )}

      {/* Summary */}
      <SummaryCards summary={summary} />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Period pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition-all",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}>
              {TIME_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Category select */}
        <div className="relative inline-flex items-center">
          <select
            value={category}
            onChange={e => setCategory(e.target.value as typeof category)}
            className="appearance-none rounded-xl border border-border bg-card pl-3 pr-7 py-1.5 text-[12px] font-medium text-foreground shadow-sm cursor-pointer focus:outline-none">
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c === "all" ? "Todas as categorias" : TIMELINE_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>

      {/* Custom date range */}
      {period === "custom" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-foreground focus:outline-none" />
          </div>
          <span className="text-[11px] text-muted-foreground">até</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-[12px] text-foreground focus:outline-none" />
        </div>
      )}

      {/* Count */}
      <p className="text-[11px] text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "evento" : "eventos"} encontrados
      </p>

      {/* Feed */}
      {filtered.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="relative">
          {/* Desktop central line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-border/60 -translate-x-px" />

          <div className="space-y-0">
            {grouped.map(([date, dayEvents]) => (
              <DateGroup
                key={date}
                date={date}
                events={dayEvents}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: TimelineSummary }) {
  const cards = [
    { label: "Entradas (30d)",   value: summary.totalIncome,    color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Saídas (30d)",     value: summary.totalExpense,   color: "text-rose-600 dark:text-rose-400",       bg: "bg-rose-500/10"    },
    { label: "Dividendos (30d)", value: summary.totalDividends, color: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-500/10"   },
    { label: "Compras (30d)",    value: summary.totalBuys,      color: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/10", sub: `${summary.buyCount} operações` },
    { label: "Vendas (30d)",     value: summary.totalSells,     color: "text-violet-600 dark:text-violet-400",   bg: "bg-violet-500/10", sub: `${summary.sellCount} operações` },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)]">
          <p className="text-[11px] text-muted-foreground">{c.label}</p>
          <p className={cn("mt-0.5 text-[16px] font-bold tabular-nums", c.color)}>
            {formatCurrency(c.value)}
          </p>
          {c.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Date Group ────────────────────────────────────────────────────────────────

function DateGroup({ date, events }: { date: string; events: TimelineEvent[] }) {
  return (
    <div className="mb-8">
      {/* Date header */}
      <div className="relative mb-4 flex items-center">
        {/* Mobile rail dot */}
        <div className="lg:hidden mr-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary border border-border">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        {/* Desktop: centered label */}
        <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 z-10 rounded-full border border-border bg-background px-4 py-1 shadow-sm">
          <span className="text-[11px] font-semibold text-foreground capitalize">{fmtDateHeader(date)}</span>
        </div>
        {/* Mobile label */}
        <span className="lg:hidden text-[12px] font-semibold text-foreground capitalize">{fmtDateHeader(date)}</span>
        {/* Mobile line */}
        <div className="lg:hidden ml-3 flex-1 h-px bg-border/50" />
      </div>

      {/* Events — desktop alternating, mobile stacked */}
      <div className="space-y-3">
        {events.map((evt, idx) => (
          <div key={evt.id} className={cn(
            "relative flex gap-4",
            // Desktop: alternating
            "lg:items-start",
            idx % 2 === 0 ? "lg:flex-row-reverse" : "lg:flex-row",
          )}>
            {/* Desktop: half-width spacer on one side */}
            <div className="hidden lg:block lg:w-[calc(50%-24px)]" />

            {/* Desktop: center dot */}
            <div className="hidden lg:flex lg:w-12 lg:shrink-0 lg:items-start lg:justify-center lg:pt-3">
              <div className="h-3 w-3 rounded-full border-2 border-background ring-2 shrink-0"
                style={{ backgroundColor: evt.color }} />
            </div>

            {/* Mobile: left rail dot */}
            <div className="lg:hidden mr-1 flex flex-col items-center">
              <div className="h-3 w-3 rounded-full border-2 border-background mt-3 shrink-0"
                style={{ backgroundColor: evt.color }} />
              <div className="mt-1 flex-1 w-px bg-border/40" />
            </div>

            {/* Card */}
            <div className="flex-1 lg:w-[calc(50%-24px)] lg:flex-none">
              <EventCard event={evt} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event: e }: { event: TimelineEvent }) {
  const Icon = ICON_MAP[e.icon] ?? Activity;
  return (
    <div className="group rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5"
          style={{ backgroundColor: e.color + "18" }}>
          <Icon className="h-4 w-4" style={{ color: e.color }} />
        </div>
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[12px] font-semibold text-foreground leading-snug">{e.title}</p>
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: e.color + "18", color: e.color }}>
              {TIMELINE_CATEGORY_LABELS[e.category]}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{e.description}</p>
        </div>
      </div>
    </div>
  );
}

// ── Empty Feed ────────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        <Calendar className="h-7 w-7 text-muted-foreground/50" />
      </div>
      <p className="text-[14px] font-medium text-foreground">Nenhum evento encontrado</p>
      <p className="mt-1 text-[12px] text-muted-foreground max-w-xs">
        Tente ajustar o período ou a categoria para ver mais eventos.
      </p>
    </div>
  );
}
