import * as React from "react";
import { cn } from "@/lib/utils";

type LoadingVariant = "spinner" | "skeleton" | "dots" | "pulse";
type LoadingSize = "sm" | "md" | "lg";

export interface LoadingProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  /** Text shown below spinner or dots */
  text?: string;
  /** Number of skeleton rows (variant="skeleton" only) */
  rows?: number;
  className?: string;
}

const spinnerSize: Record<LoadingSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
};

/**
 * Loading — flexible loading states: spinner, skeleton, dots, or pulse.
 *
 * Usage:
 * ```tsx
 * <Loading variant="spinner" size="md" text="Carregando..." />
 * <Loading variant="skeleton" rows={3} />
 * <Loading variant="dots" />
 * ```
 */
export function Loading({
  variant = "spinner",
  size = "md",
  text,
  rows = 3,
  className,
}: LoadingProps) {
  if (variant === "skeleton") {
    return (
      <div className={cn("flex flex-col gap-3", className)} aria-busy="true" aria-label="Carregando">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            {i === 0 && (
              <div className="h-10 w-10 shrink-0 rounded-lg bg-secondary animate-pulse" />
            )}
            <div className="flex-1 space-y-2">
              <div
                className="h-3 rounded-md bg-secondary animate-pulse"
                style={{ width: `${60 + Math.random() * 30}%` }}
              />
              <div
                className="h-2.5 rounded-md bg-secondary animate-pulse"
                style={{ width: `${30 + Math.random() * 40}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div
        className={cn("rounded-xl bg-secondary animate-pulse", className)}
        aria-busy="true"
        aria-label="Carregando"
        style={{ minHeight: "6rem" }}
      />
    );
  }

  if (variant === "dots") {
    return (
      <div
        className={cn("flex flex-col items-center gap-3", className)}
        aria-busy="true"
        aria-label="Carregando"
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        {text && <p className="text-[12px] text-muted-foreground">{text}</p>}
      </div>
    );
  }

  // spinner (default)
  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      aria-busy="true"
      aria-label="Carregando"
    >
      <span
        className={cn(
          "rounded-full border-border border-t-primary animate-spin",
          spinnerSize[size]
        )}
      />
      {text && <p className="text-[12px] text-muted-foreground">{text}</p>}
    </div>
  );
}
