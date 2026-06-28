"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DataPoint {
  label: string;
  value: number;
}

export interface AreaChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  gradientId?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showDots?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}

function buildPath(points: [number, number][], smooth = true): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  if (!smooth || points.length < 2) {
    return `M${first[0]},${first[1]}` + rest.map(([x, y]) => `L${x},${y}`).join("");
  }
  return rest.reduce((acc, [cx, cy], i) => {
    const [px, py] = points[i];
    const mx = (px + cx) / 2;
    return `${acc} C${mx},${py} ${mx},${cy} ${cx},${cy}`;
  }, `M${first[0]},${first[1]}`);
}

/**
 * AreaChart — pure SVG area chart, no external dependencies.
 *
 * Usage:
 * ```tsx
 * <AreaChart
 *   data={[{ label: "Jan", value: 198000 }, { label: "Fev", value: 210000 }]}
 *   height={180}
 *   formatValue={(v) => formatCurrency(v)}
 * />
 * ```
 */
export function AreaChart({
  data,
  height = 180,
  color = "#3B82F6",
  gradientId,
  showGrid = true,
  showLabels = true,
  showDots = true,
  formatValue = (v) => v.toLocaleString("pt-BR"),
  className,
}: AreaChartProps) {
  const id = gradientId ?? React.useId().replace(/:/g, "");
  const padL = 8;
  const padR = 8;
  const padT = 20;
  const padB = showLabels ? 32 : 8;
  const W = 800;
  const H = height;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toX = (i: number) => padL + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => padT + (1 - (v - min) / range) * chartH;

  const points: [number, number][] = data.map((d, i) => [toX(i), toY(d.value)]);
  const linePath = buildPath(points);

  const lastX = points[points.length - 1][0];
  const firstX = points[0][0];
  const bottomY = padT + chartH;
  const areaPath = `${linePath} L${lastX},${bottomY} L${firstX},${bottomY} Z`;

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
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
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
                stroke="currentColor"
                strokeWidth="1"
                className="text-border"
                strokeDasharray="4 4"
              />
            );
          })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#grad-${id})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots &&
          points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
          ))}

        {/* X-axis labels */}
        {showLabels &&
          data.map((d, i) => {
            const x = toX(i);
            // Show fewer labels on dense data
            const step = Math.ceil(data.length / 8);
            if (data.length > 8 && i % step !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={i}
                x={x}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                className="text-muted-foreground"
                style={{ color: "var(--muted-foreground)" }}
              >
                {d.label}
              </text>
            );
          })}

        {/* First / last value labels */}
        <text
          x={points[points.length - 1][0]}
          y={points[points.length - 1][1] - 8}
          textAnchor="end"
          fontSize="10"
          fontWeight="600"
          fill={color}
        >
          {formatValue(data[data.length - 1].value)}
        </text>
      </svg>
    </div>
  );
}
