"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DonutDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface DonutChartProps {
  data: DonutDataPoint[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1",
];

/**
 * DonutChart — pure SVG donut / pie chart, no external dependencies.
 *
 * Usage:
 * ```tsx
 * <DonutChart
 *   data={[
 *     { label: "Renda Fixa", value: 45, color: "#3B82F6" },
 *     { label: "Ações",      value: 30, color: "#10B981" },
 *     { label: "FIIs",       value: 25, color: "#F59E0B" },
 *   ]}
 *   centerLabel="Total"
 *   centerValue="R$ 287k"
 *   showLegend
 * />
 * ```
 */
export function DonutChart({
  data,
  size = 160,
  strokeWidth = 28,
  centerLabel,
  centerValue,
  showLegend = false,
  className,
}: DonutChartProps) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  // Build segments
  let cumulative = 0;
  const segments = data.map((d, i) => {
    const pct = d.value / total;
    const offset = cumulative;
    cumulative += pct;
    return {
      ...d,
      pct,
      offset,
      color: d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
    };
  });

  return (
    <div className={cn("flex items-center gap-6", className)}>
      {/* Chart */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--secondary)"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth - 2}
              strokeDasharray={`${seg.pct * circumference} ${circumference}`}
              strokeDashoffset={-seg.offset * circumference}
              strokeLinecap="round"
            />
          ))}
        </svg>

        {/* Center text */}
        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <p className="text-[13px] font-semibold text-foreground leading-none">{centerValue}</p>
            )}
            {centerLabel && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{centerLabel}</p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex flex-col gap-2 min-w-0">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[12px] text-muted-foreground truncate">{seg.label}</span>
              <span className="ml-auto pl-3 text-[12px] font-medium text-foreground tabular-nums">
                {(seg.pct * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
