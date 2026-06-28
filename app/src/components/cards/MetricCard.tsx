import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

function Sparkline({ data, color = "currentColor", className }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });
  const pathD = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M${pt}`;
    const [px, py] = pts[i - 1].split(",").map(Number);
    const [cx, cy] = pt.split(",").map(Number);
    const mx = (px + cx) / 2;
    return `${acc} C${mx},${py} ${mx},${cy} ${cx},${cy}`;
  }, "");

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={cn("overflow-visible", className)}
      aria-hidden="true"
    >
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  /** Format number value as currency (BRL) */
  currency?: boolean;
  delta?: number;
  deltaLabel?: string;
  deltaType?: "positive" | "negative" | "neutral";
  icon?: React.ElementType;
  iconColor?: string;
  subtitle?: string;
  /** Mini sparkline data points */
  trend?: number[];
  className?: string;
}

/**
 * MetricCard — KPI card for displaying a key financial metric.
 *
 * Usage:
 * ```tsx
 * <MetricCard
 *   title="Patrimônio Total"
 *   value={287000}
 *   currency
 *   delta={4.2}
 *   deltaType="positive"
 *   icon={Landmark}
 *   iconColor="text-blue-500"
 *   trend={[198, 210, 225, 240, 260, 287]}
 * />
 * ```
 */
export function MetricCard({
  title,
  value,
  currency = false,
  delta,
  deltaLabel = "vs mês anterior",
  deltaType,
  icon: Icon,
  iconColor = "text-primary",
  subtitle,
  trend,
  className,
}: MetricCardProps) {
  const resolvedType =
    deltaType ??
    (delta === undefined ? "neutral" : delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral");

  const displayValue =
    typeof value === "number" && currency
      ? formatCurrency(value)
      : typeof value === "number"
      ? formatPercent(value)
      : value;

  const DeltaIcon =
    resolvedType === "positive"
      ? TrendingUp
      : resolvedType === "negative"
      ? TrendingDown
      : Minus;

  const trendColor =
    resolvedType === "positive"
      ? "#10B981"
      : resolvedType === "negative"
      ? "#F87171"
      : "#6B7280";

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border bg-card p-5",
        "shadow-[var(--shadow-card)] transition-shadow duration-200",
        "hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground truncate">{title}</p>
        </div>
        {Icon && (
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary",
            iconColor
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Value */}
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {displayValue}
      </p>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
      )}

      {/* Delta + sparkline */}
      <div className="mt-3 flex items-end justify-between gap-2">
        {delta !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-[12px] font-medium",
            resolvedType === "positive" ? "text-positive" :
            resolvedType === "negative" ? "text-negative" :
            "text-muted-foreground"
          )}>
            <DeltaIcon className="h-3 w-3" />
            <span>{resolvedType === "negative" ? "" : "+"}{formatPercent(Math.abs(delta))}</span>
            {deltaLabel && (
              <span className="font-normal text-muted-foreground">{deltaLabel}</span>
            )}
          </div>
        )}
        {trend && trend.length >= 2 && (
          <Sparkline data={trend} color={trendColor} className="shrink-0 opacity-70" />
        )}
      </div>
    </div>
  );
}
