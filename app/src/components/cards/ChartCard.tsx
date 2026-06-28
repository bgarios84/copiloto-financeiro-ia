import * as React from "react";
import { cn } from "@/lib/utils";

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Extra classes for the card wrapper */
  className?: string;
  /** Extra classes for the chart content area */
  contentClassName?: string;
}

/**
 * ChartCard — container card for embedding chart components.
 *
 * Usage:
 * ```tsx
 * <ChartCard title="Evolução Patrimonial" subtitle="Últimos 12 meses" actions={<Select .../>}>
 *   <AreaChart data={...} />
 * </ChartCard>
 * ```
 */
export function ChartCard({
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName,
}: ChartCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground leading-snug">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Chart content */}
      <div className={cn("p-5", contentClassName)}>{children}</div>
    </div>
  );
}
