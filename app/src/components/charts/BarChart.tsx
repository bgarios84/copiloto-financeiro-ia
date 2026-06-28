"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface BarDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  defaultColor?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  horizontal?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}

/**
 * BarChart — pure SVG bar chart, no external dependencies.
 *
 * Usage:
 * ```tsx
 * <BarChart
 *   data={[
 *     { label: "Alimentação", value: 2400, color: "#3B82F6" },
 *     { label: "Transporte",  value: 1200, color: "#10B981" },
 *   ]}
 *   height={200}
 *   showValues
 * />
 * ```
 */
export function BarChart({
  data,
  height = 200,
  defaultColor = "#3B82F6",
  showGrid = true,
  showLabels = true,
  showValues = false,
  horizontal = false,
  formatValue = (v) => v.toLocaleString("pt-BR"),
  className,
}: BarChartProps) {
  if (!data || data.length === 0) return null;

  const W = 800;
  const H = height;
  const padL = 8;
  const padR = 8;
  const padT = showValues ? 24 : 12;
  const padB = showLabels ? 32 : 8;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const barGap = 0.25;
  const barW = (chartW / data.length) * (1 - barGap);
  const barSpacing = chartW / data.length;
  const gridLines = 4;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={H}
        aria-hidden="true"
      >
        {/* Grid */}
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => {
            const y = padT + (i / gridLines) * chartH;
            return (
              <line
                key={i}
                x1={padL}
                y1={y}
                x2={W - padR}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.value / max) * chartH;
          const x = padL + i * barSpacing + (barSpacing - barW) / 2;
          const y = padT + chartH - barH;
          const color = d.color ?? defaultColor;

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="3"
                fill={color}
                fillOpacity="0.85"
              />
              {/* Value label on top */}
              {showValues && (
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="600"
                  fill={color}
                >
                  {formatValue(d.value)}
                </text>
              )}
              {/* X-axis label */}
              {showLabels && (
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--muted-foreground)"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
