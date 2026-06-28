import * as React from "react";
import { cn } from "@/lib/utils";

interface ContentGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  className?: string;
}

const colsMap: Record<NonNullable<ContentGridProps["cols"]>, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
};

const gapMap: Record<NonNullable<ContentGridProps["gap"]>, string> = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
};

/**
 * ContentGrid — responsive grid wrapper for card layouts.
 *
 * Usage:
 * ```tsx
 * <ContentGrid cols={4} gap="md">
 *   <MetricCard ... />
 *   <MetricCard ... />
 * </ContentGrid>
 * ```
 */
export function ContentGrid({
  children,
  cols = 3,
  gap = "md",
  className,
}: ContentGridProps) {
  return (
    <div className={cn("grid", colsMap[cols], gapMap[gap], className)}>
      {children}
    </div>
  );
}
