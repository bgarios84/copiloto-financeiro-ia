import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency, formatPercent } from "@/lib/utils";

export interface InvestmentCardProps {
  name: string;
  ticker?: string;
  type: string;
  value: number;
  returnPct: number;
  allocation?: number;
  className?: string;
}

/**
 * InvestmentCard — displays a single investment position.
 *
 * Usage:
 * ```tsx
 * <InvestmentCard
 *   name="Tesouro Selic 2029"
 *   type="Renda Fixa"
 *   value={45000}
 *   returnPct={12.3}
 *   allocation={32}
 * />
 * ```
 */
export function InvestmentCard({
  name,
  ticker,
  type,
  value,
  returnPct,
  allocation,
  className,
}: InvestmentCardProps) {
  const isPositive = returnPct >= 0;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5",
        "shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
    >
      {/* Type badge / avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
        {(ticker ?? type.slice(0, 2)).toUpperCase()}
      </div>

      {/* Name + type */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">{type}{ticker ? ` · ${ticker}` : ""}</p>
      </div>

      {/* Return */}
      <div className="text-right shrink-0">
        <p className="text-[13px] font-semibold text-foreground">{formatCurrency(value)}</p>
        <div className={cn(
          "flex items-center justify-end gap-0.5 text-[11px] font-medium",
          isPositive ? "text-positive" : "text-negative"
        )}>
          {isPositive
            ? <TrendingUp className="h-3 w-3" />
            : <TrendingDown className="h-3 w-3" />
          }
          <span>{isPositive ? "+" : ""}{formatPercent(returnPct)}</span>
        </div>
      </div>

      {/* Allocation bar */}
      {allocation !== undefined && (
        <div className="shrink-0 w-14 text-right">
          <p className="text-[10px] text-muted-foreground mb-1">{formatPercent(allocation)}</p>
          <div className="h-1 w-full rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${Math.min(100, allocation)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
