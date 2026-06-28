import * as React from "react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export interface GoalCardProps {
  title: string;
  current: number;
  target: number;
  /** Display unit prefix, e.g. "R$" */
  unit?: "currency" | "percent" | string;
  icon?: React.ElementType;
  color?: string;
  deadline?: string;
  className?: string;
}

/**
 * GoalCard — displays progress toward a financial goal.
 *
 * Usage:
 * ```tsx
 * <GoalCard
 *   title="Reserva de Emergência"
 *   current={24000}
 *   target={40000}
 *   unit="currency"
 *   deadline="Dez 2026"
 *   icon={ShieldCheck}
 *   color="bg-emerald-500"
 * />
 * ```
 */
export function GoalCard({
  title,
  current,
  target,
  unit = "currency",
  icon: Icon,
  color = "bg-blue-500",
  deadline,
  className,
}: GoalCardProps) {
  const pct = Math.min(100, (current / target) * 100);

  const fmt = (v: number) => {
    if (unit === "currency") return formatCurrency(v);
    if (unit === "percent") return formatPercent(v);
    return `${unit}${v.toLocaleString("pt-BR")}`;
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        "shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {Icon && (
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            color,
            "text-white"
          )}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">{title}</p>
          {deadline && (
            <p className="text-[11px] text-muted-foreground">Meta: {deadline}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Values */}
      <div className="mt-2.5 flex items-end justify-between">
        <span className="text-[13px] font-semibold text-foreground">{fmt(current)}</span>
        <span className="text-[12px] text-muted-foreground">{formatPercent(pct)} de {fmt(target)}</span>
      </div>
    </div>
  );
}
