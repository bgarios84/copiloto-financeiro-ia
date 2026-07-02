"use client";

/**
 * CategorySpendingPanel — v3.1
 * Fixes: icon map (string → LucideIcon), UTF-8 text, clean layout.
 * Logic unchanged.
 */

import * as React from "react";
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Flame,
  AlertCircle,
  BarChart2,
  Home,
  GraduationCap,
  Utensils,
  MoreHorizontal,
  ShoppingCart,
  Car,
  Heart,
  Briefcase,
  Zap,
  Film,
  Music,
  Plane,
  Dumbbell,
  Baby,
  PiggyBank,
  Building2,
  Wrench,
  Smartphone,
  BookOpen,
  Gift,
  Shirt,
  Globe,
  Tag,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { Transaction }   from "@/types/transaction";
import type { CategorySpend } from "@/lib/transaction-analytics";

// ── Icon map: DB string → Lucide component ────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  "home":            Home,
  "graduation-cap":  GraduationCap,
  "utensils":        Utensils,
  "more-horizontal": MoreHorizontal,
  "shopping-cart":   ShoppingCart,
  "car":             Car,
  "heart":           Heart,
  "briefcase":       Briefcase,
  "zap":             Zap,
  "film":            Film,
  "music":           Music,
  "plane":           Plane,
  "dumbbell":        Dumbbell,
  "baby":            Baby,
  "piggy-bank":      PiggyBank,
  "building-2":      Building2,
  "building2":       Building2,
  "wrench":          Wrench,
  "smartphone":      Smartphone,
  "book-open":       BookOpen,
  "gift":            Gift,
  "shirt":           Shirt,
  "globe":           Globe,
  "tag":             Tag,
  "trending-up":     TrendingUp,
};

// ── Geometry helpers ──────────────────────────────────────────────────────────

function pct2xy(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlice(
  cx: number, cy: number,
  outer: number, inner: number,
  start: number, end: number,
) {
  const o1 = pct2xy(cx, cy, outer, start);
  const o2 = pct2xy(cx, cy, outer, end);
  const i2 = pct2xy(cx, cy, inner, end);
  const i1 = pct2xy(cx, cy, inner, start);
  const la = end - start > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(2)} ${o1.y.toFixed(2)}`,
    `A ${outer} ${outer} 0 ${la} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)}`,
    `L ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}`,
    `A ${inner} ${inner} 0 ${la} 0 ${i1.x.toFixed(2)} ${i1.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p   = pts[i - 1];
    const c   = pts[i];
    const cpx = ((p.x + c.x) / 2).toFixed(1);
    d += ` C ${cpx} ${p.y.toFixed(1)} ${cpx} ${c.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
  }
  return d;
}

// ── Donut chart ───────────────────────────────────────────────────────────────

function DonutChart({ categories }: { categories: CategorySpend[] }) {
  const SIZE = 200, CX = 100, CY = 100, OUTER = 88, INNER = 58;

  const slices = React.useMemo(() => {
    const out: { path: string; color: string; pct: number; midAngle: number }[] = [];
    let angle = 0;
    for (const cat of categories) {
      const sweep = (cat.pctOfTotal / 100) * 360;
      out.push({
        path:     donutSlice(CX, CY, OUTER, INNER, angle, angle + sweep - 0.8),
        color:    cat.categoryColor ?? "#6B7280",
        pct:      cat.pctOfTotal,
        midAngle: angle + sweep / 2,
      });
      angle += sweep;
    }
    return out;
  }, [categories]);

  const total = categories.reduce((s, c) => s + c.total, 0);

  const totalDelta = React.useMemo(() => {
    let curr = 0, prev = 0;
    for (const c of categories) {
      const h = c.history;
      curr += h[h.length - 1]?.amount ?? 0;
      prev += h[h.length - 2]?.amount ?? 0;
    }
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  }, [categories]);

  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} />
        ))}
        {slices.map((s, i) => {
          if (s.pct < 7) return null;
          const mid = pct2xy(CX, CY, (OUTER + INNER) / 2, s.midAngle);
          return (
            <text
              key={`lbl-${i}`}
              x={mid.x}
              y={mid.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="9"
              fontWeight="700"
            >
              {s.pct.toFixed(1)}%
            </text>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] leading-tight text-muted-foreground">Total de despesas</p>
        <p className="mt-0.5 text-[14px] font-black leading-tight text-foreground">
          {formatCurrency(total)}
        </p>
        {totalDelta !== null && (
          <p className={cn(
            "mt-0.5 text-[9px] font-semibold",
            totalDelta > 0 ? "text-rose-500" : "text-emerald-500",
          )}>
            {totalDelta > 0 ? "↑" : "↓"}{" "}
            {Math.abs(totalDelta).toFixed(0)}% vs mês ant.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Card sparkline ─────────────────────────────────────────────────────────────

function CardSparkline({
  data,
  color,
}: {
  data:  { month: string; amount: number }[];
  color: string;
}) {
  const uid    = React.useId();
  const gradId = `sg${uid.replace(/:/g, "")}`;
  const W = 200, H = 72, padX = 6, padY = 8;

  const pts = React.useMemo(() => {
    if (data.length < 2) return [];
    const max = Math.max(...data.map((d) => d.amount), 1);
    return data.map((d, i) => ({
      x: padX + (i / (data.length - 1)) * (W - padX * 2),
      y: padY + (1 - d.amount / max) * (H - padY * 2),
    }));
  }, [data]);

  if (pts.length < 2) return <div style={{ height: H }} />;

  const line    = smoothPath(pts);
  const lastPt  = pts[pts.length - 1]!;
  const firstPt = pts[0]!;
  const area    = `${line} L ${lastPt.x.toFixed(1)} ${H} L ${firstPt.x.toFixed(1)} ${H} Z`;

  return (
    <svg
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill={color} />
      <circle cx={lastPt.x} cy={lastPt.y} r="6"   fill={color} fillOpacity="0.2" />
    </svg>
  );
}

// ── Table sparkline ────────────────────────────────────────────────────────────

function TableSparkline({
  data,
  color,
}: {
  data:  { month: string; amount: number }[];
  color: string;
}) {
  const W = 80, H = 32, padX = 4, padY = 4;

  const pts = React.useMemo(() => {
    if (data.length < 2) return [];
    const max = Math.max(...data.map((d) => d.amount), 1);
    return data.map((d, i) => ({
      x: padX + (i / (data.length - 1)) * (W - padX * 2),
      y: padY + (1 - d.amount / max) * (H - padY * 2),
    }));
  }, [data]);

  if (pts.length < 2) return <div style={{ width: W, height: H }} />;

  const line   = smoothPath(pts);
  const lastPt = pts[pts.length - 1]!;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={color} />
    </svg>
  );
}

// ── Category icon ──────────────────────────────────────────────────────────────

function CategoryIcon({
  cat,
  size = "md",
}: {
  cat:   CategorySpend;
  size?: "sm" | "md" | "lg";
}) {
  const bg     = cat.categoryColor ?? "#6B7280";
  const letter = cat.categoryName.charAt(0).toUpperCase();

  // Resolve icon string → Lucide component
  const LucideIcon = cat.categoryIcon ? (ICON_MAP[cat.categoryIcon] ?? null) : null;

  const containerCls =
    size === "lg" ? "h-12 w-12" :
    size === "md" ? "h-9  w-9"  :
                    "h-7  w-7";
  const iconPx  = size === "lg" ? 20 : size === "md" ? 16 : 13;
  const textCls = size === "lg" ? "text-[17px]" : size === "md" ? "text-[13px]" : "text-[11px]";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm",
        containerCls,
      )}
      style={{ backgroundColor: bg }}
    >
      {LucideIcon ? (
        <LucideIcon size={iconPx} strokeWidth={2} />
      ) : (
        <span className={textCls}>{letter}</span>
      )}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CategorySpend["status"] }) {
  if (status === "above")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
        <TrendingUp className="h-3 w-3" /> Acima da média
      </span>
    );
  if (status === "below")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <TrendingDown className="h-3 w-3" /> Abaixo da média
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" /> Normal
    </span>
  );
}

// ── Category card ──────────────────────────────────────────────────────────────

function CategoryCard({
  cat,
  isOpen,
  onClick,
}: {
  cat:     CategorySpend;
  isOpen:  boolean;
  onClick: () => void;
}) {
  const color         = cat.categoryColor ?? "#6B7280";
  const isUncategorized = cat.categoryId === null;
  const deltaColor    =
    cat.vsLastMonth === null ? "" :
    cat.vsLastMonth > 0 ? "text-rose-500" : "text-emerald-500";

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-52 shrink-0 flex-col gap-2 rounded-2xl border bg-card p-4 text-left",
        "transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:translate-y-0",
        isOpen
          ? "border-primary/40 ring-2 ring-primary/20 shadow-md"
          : isUncategorized
          ? "border-amber-500/30"
          : "border-border",
      )}
    >
      {/* Icon + chevron */}
      <div className="flex items-start justify-between">
        <CategoryIcon cat={cat} size="lg" />
        <ChevronRight
          className={cn(
            "h-4 w-4 text-muted-foreground/40 transition-transform",
            isOpen && "rotate-90 text-primary/60",
          )}
        />
      </div>

      {/* Status */}
      <div className="self-start">
        {isUncategorized ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            <AlertCircle className="h-3 w-3" /> Pendente
          </span>
        ) : (
          <StatusBadge status={cat.status} />
        )}
      </div>

      {/* Name */}
      <p className="text-[14px] font-bold leading-snug text-foreground">{cat.categoryName}</p>

      {/* Amount */}
      <p className="text-[20px] font-black tabular-nums leading-none text-foreground">
        {formatCurrency(cat.total)}
      </p>

      {/* % + delta row */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] text-muted-foreground">
          {cat.pctOfTotal.toFixed(1)}% das despesas
        </span>
        {cat.vsLastMonth !== null && (
          <span className={cn("text-[11px] font-semibold tabular-nums", deltaColor)}>
            {cat.vsLastMonth > 0 ? "↑" : "↓"}{" "}
            {Math.abs(cat.vsLastMonth).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="-mx-1 mt-1 min-h-[64px]">
        <CardSparkline data={cat.history} color={color} />
      </div>

      {/* Tx count */}
      <div className="flex justify-center">
        <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-muted-foreground">
          {cat.txCount} {cat.txCount === 1 ? "transação" : "transações"}
        </span>
      </div>
    </button>
  );
}

// ── Donut card ─────────────────────────────────────────────────────────────────

function DonutCard({ categories }: { categories: CategorySpend[] }) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-border bg-card p-5">
      <DonutChart categories={categories} />

      <div className="mt-4 flex flex-col gap-2.5">
        {categories.map((cat) => (
          <div
            key={cat.categoryId ?? "__null__"}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: cat.categoryColor ?? "#6B7280" }}
              />
              <span className="truncate text-[12px] text-foreground">{cat.categoryName}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-[12px] font-semibold tabular-nums text-foreground">
                {formatCurrency(cat.total)}
              </span>
              <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
                {cat.pctOfTotal.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-secondary">
        <BarChart2 className="h-3.5 w-3.5" />
        Ver relatório completo
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── All categories table ───────────────────────────────────────────────────────

function AllCategoriesTable({
  categories,
  openKey,
  onToggle,
}: {
  categories: CategorySpend[];
  openKey:    string | undefined;
  onToggle:   (key: string) => void;
}) {
  const maxTotal = categories[0]?.total ?? 1;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-[14px] font-bold text-foreground">Todas as categorias</h3>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[680px] grid-cols-[1fr_150px_70px_104px_84px_120px] gap-3 border-b border-border/50 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Categoria</span>
          <span>Gasto no período</span>
          <span className="text-right">% do total</span>
          <span className="text-right">vs mês anterior</span>
          <span className="text-center">Tendência</span>
          <span className="text-right">Ações</span>
        </div>

        {categories.map((cat) => {
          const key     = cat.categoryId ?? "__null__";
          const color   = cat.categoryColor ?? "#6B7280";
          const barW    = (cat.total / maxTotal) * 100;
          const isUncat = cat.categoryId === null;
          const deltaColor =
            cat.vsLastMonth === null ? "text-muted-foreground" :
            cat.vsLastMonth > 0     ? "text-rose-500" : "text-emerald-500";

          return (
            <div
              key={key}
              className={cn(
                "grid min-w-[680px] grid-cols-[1fr_150px_70px_104px_84px_120px] gap-3",
                "border-b border-border/30 px-5 py-3 last:border-0",
                "items-center transition-colors hover:bg-secondary/30",
                openKey === key && "bg-primary/5",
              )}
            >
              {/* Categoria */}
              <div className="flex min-w-0 items-center gap-3">
                <CategoryIcon cat={cat} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {cat.categoryName}
                  </p>
                  {isUncat && (
                    <p className="text-[10px] text-amber-500">Sem categoria</p>
                  )}
                </div>
              </div>

              {/* Gasto + barra */}
              <div>
                <p className="text-[13px] font-bold tabular-nums text-foreground">
                  {formatCurrency(cat.total)}
                </p>
                <div className="mt-1 h-1 w-full rounded-full bg-secondary">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${barW}%`, backgroundColor: color }}
                  />
                </div>
              </div>

              {/* % */}
              <p className="text-right text-[13px] tabular-nums text-foreground">
                {cat.pctOfTotal.toFixed(1)}%
              </p>

              {/* vs mês anterior */}
              <div className="text-right">
                {cat.vsLastMonth !== null ? (
                  <p className={cn("text-[13px] font-semibold tabular-nums", deltaColor)}>
                    {cat.vsLastMonth > 0 ? "↑" : "↓"}{" "}
                    {Math.abs(cat.vsLastMonth).toFixed(0)}%
                  </p>
                ) : (
                  <span className="text-[12px] text-muted-foreground">—</span>
                )}
              </div>

              {/* Tendência */}
              <div className="flex justify-center">
                <TableSparkline data={cat.history} color={color} />
              </div>

              {/* Ações */}
              <div className="flex justify-end">
                <button
                  onClick={() => onToggle(key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors",
                    openKey === key
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
                  )}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  Ver histórico
                  <ChevronRight className={cn("h-3 w-3 transition-transform", openKey === key && "rotate-90")} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── FIRE tip bar ───────────────────────────────────────────────────────────────

function FireTipBar({ categories }: { categories: CategorySpend[] }) {
  const top = React.useMemo(
    () =>
      [...categories]
        .filter((c) => c.status === "above" && c.vsSixMonthAvg !== null)
        .sort((a, b) => (b.vsSixMonthAvg ?? 0) - (a.vsSixMonthAvg ?? 0))[0] ?? null,
    [categories],
  );

  if (!top) return null;
  const pct = Math.abs(top.vsSixMonthAvg ?? 0).toFixed(0);

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
          <Flame className="h-4 w-4 text-amber-500" />
        </div>
        <p className="text-[12px] text-foreground">
          <span className="font-semibold text-amber-500">Dica FIRE: </span>
          Sua maior oportunidade de economia está em{" "}
          <span className="font-semibold">{top.categoryName}</span>, onde você gastou{" "}
          <span className="font-semibold text-rose-500">{pct}%</span>{" "}
          acima da média dos últimos 6 meses.
        </p>
      </div>
      <button className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20">
        Ver insights completos
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Monthly bar chart ──────────────────────────────────────────────────────────

const MONTH_LABELS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function MonthlyBarChart({ history }: { history: { month: string; amount: number }[] }) {
  if (history.length === 0) return null;
  const max = Math.max(...history.map((h) => h.amount), 1);
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Histórico mensal
      </p>
      <div className="flex items-end gap-1.5" style={{ height: 64 }}>
        {history.map((h) => {
          const pct  = (h.amount / max) * 100;
          const mNum = parseInt(h.month.slice(5), 10);
          const lbl  = MONTH_LABELS[mNum - 1] ?? h.month.slice(5);
          return (
            <div key={h.month} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-col justify-end" style={{ height: 48 }}>
                <div
                  title={formatCurrency(h.amount)}
                  className={cn(
                    "w-full rounded-t transition-colors",
                    h.amount > 0 ? "bg-blue-500/30 hover:bg-blue-500/50" : "bg-secondary/40",
                  )}
                  style={{ height: `${Math.max(pct, 3)}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{lbl}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Drill-down panel ───────────────────────────────────────────────────────────

function DrilldownPanel({
  cat,
  periodTransactions,
  onClose,
}: {
  cat:                CategorySpend;
  periodTransactions: Transaction[];
  onClose:            () => void;
}) {
  const catTxs = React.useMemo(
    () =>
      periodTransactions
        .filter(
          (tx) =>
            tx.type === "expense" &&
            tx.status !== "cancelled" &&
            (tx.category_id ?? "__null__") === (cat.categoryId ?? "__null__"),
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [periodTransactions, cat.categoryId],
  );

  const fireInsight = React.useMemo(() => {
    if (cat.vsSixMonthAvg === null)
      return `${cat.categoryName}: ${cat.txCount} transação${cat.txCount !== 1 ? "ões" : ""} no período — sem histórico suficiente.`;
    const pct = Math.abs(cat.vsSixMonthAvg).toFixed(0);
    if (cat.vsSixMonthAvg >= 15)
      return `Você está gastando ${pct}% acima da média dos últimos 6 meses em ${cat.categoryName}. Avalie se esse gasto é recorrente ou pontual.`;
    if (cat.vsSixMonthAvg <= -15)
      return `Você reduziu ${pct}% os gastos em ${cat.categoryName} vs a média de 6 meses. Excelente — direcione o excedente para investimentos FIRE.`;
    return `Gastos em ${cat.categoryName} estão dentro da variação normal (${cat.vsSixMonthAvg > 0 ? "+" : ""}${cat.vsSixMonthAvg.toFixed(0)}% vs média de 6 meses).`;
  }, [cat]);

  const insightCls =
    cat.status === "above"
      ? "border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300"
      : cat.status === "below"
      ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : "border-blue-500/20 bg-blue-500/5 text-blue-700 dark:text-blue-300";

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CategoryIcon cat={cat} size="md" />
          <div>
            <h3 className="text-[15px] font-bold text-foreground">{cat.categoryName}</h3>
            <p className="text-[12px] text-muted-foreground">
              {formatCurrency(cat.total)} · {cat.txCount} tx · {cat.pctOfTotal.toFixed(1)}% das despesas
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className={cn("mb-4 flex items-start gap-2 rounded-xl border px-4 py-3", insightCls)}>
        <Flame className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-[12px] leading-relaxed">
          <span className="font-semibold">FIRE: </span>
          {fireInsight}
        </p>
      </div>

      <div className="mb-4">
        <MonthlyBarChart history={cat.history} />
      </div>

      <div>
        <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Transações no período ({catTxs.length})
        </p>
        {catTxs.length === 0 ? (
          <p className="py-2 text-[12px] text-muted-foreground">
            Nenhuma transação no período.
          </p>
        ) : (
          <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
            {catTxs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-foreground">
                    {tx.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    {tx.account ? ` · ${tx.account.name}` : ""}
                  </p>
                </div>
                <p className="ml-3 shrink-0 text-[13px] font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  {formatCurrency(tx.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function CategorySpendingPanel({
  categories,
  periodTransactions,
}: {
  categories:         CategorySpend[];
  periodTransactions: Transaction[];
}) {
  const [openKey, setOpenKey] = React.useState<string | undefined>(undefined);

  const toggle = React.useCallback(
    (key: string) => setOpenKey((prev) => (prev === key ? undefined : key)),
    [],
  );

  const openCat =
    openKey !== undefined
      ? categories.find((c) => (c.categoryId ?? "__null__") === openKey)
      : undefined;

  if (categories.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card py-10">
        <p className="text-[13px] text-muted-foreground">
          Nenhuma despesa no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-foreground">Gastos por categoria</h2>
          <p className="text-[12px] text-muted-foreground">Despesas do período selecionado</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-[12px] font-semibold text-foreground transition-colors hover:bg-secondary">
          Ver todas as categorias
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Donut + category cards */}
      <div className="flex gap-4 overflow-x-auto pb-1">
        <DonutCard categories={categories} />
        <div className="flex gap-3">
          {categories.map((cat) => {
            const key = cat.categoryId ?? "__null__";
            return (
              <CategoryCard
                key={key}
                cat={cat}
                isOpen={openKey === key}
                onClick={() => toggle(key)}
              />
            );
          })}
        </div>
      </div>

      {/* Drill-down */}
      {openCat && (
        <DrilldownPanel
          cat={openCat}
          periodTransactions={periodTransactions}
          onClose={() => setOpenKey(undefined)}
        />
      )}

      {/* Table */}
      <AllCategoriesTable categories={categories} openKey={openKey} onToggle={toggle} />

      {/* FIRE tip */}
      <FireTipBar categories={categories} />
    </div>
  );
}
