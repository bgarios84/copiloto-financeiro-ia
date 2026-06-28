"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type DataPoint } from "./AreaChart";

export interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showLabels?: boolean;
  showDots?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}

function buildPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  if (points.length < 2) return `M${first[0]},${first[1]}`;
  return rest.reduce((acc, [cx, cy], i) => {
    const [px, py] = points[i];
    const mx = (px + cx) / 2;
    return `${acc} C${mx},${py} ${mx},${cy} ${cx},${cy}`;
  }, `M${first[0]},${first[1]}`);
}

/**
 * LineChart — pure SVG line chart without fill, no external dependencies.
 *
 * Usage:
 * ```tsx
 * <LineChart
 *   data={[{ label: "Jan", value: 198000 }, ...]}
 *   height={160}
 *   color="#10B981"
 * />
 * ```
 */
export function LineChart({
  data,
  height = 160,
  color = "#3B82F6",
  showGrid = true,
  showLabels = true,
  showDots = false,
  formatValue = (v) => v.toLocaleString("pt-BR"),
  className,
}: LineChartProps) {
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
        {showGrid &&
          Array.from({ length: gridLines + 1 }).map((_, i) => (
            <line
              key={i}
              x1={padL}
              y1={padT + (i / gridLines) * chartH}
              x2={W - padR}
              y2={padT + (i / gridLines) * chartH}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
              strokeDasharray="4 4"
            />
          ))}

        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showDots &&
          points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="white" strokeWidth="1.5" />
          ))}

        {showLabels &&
          data.map((d, i) => {
            const step = Math.ceil(data.length / 8);
            if (data.length > 8 && i % step !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={i}
                x={toX(i)}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted-foreground)"
              >
                {d.label}
              </text>
            );
          })}

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
