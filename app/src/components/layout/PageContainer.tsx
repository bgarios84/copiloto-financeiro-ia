import * as React from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  /** Max width constraint. Defaults to unconstrained (fills parent). */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

const maxWidthMap: Record<NonNullable<PageContainerProps["maxWidth"]>, string> = {
  sm:   "max-w-screen-sm",
  md:   "max-w-screen-md",
  lg:   "max-w-screen-lg",
  xl:   "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-none",
};

/**
 * PageContainer — standard page wrapper with optional title, subtitle, and actions slot.
 *
 * Usage:
 * ```tsx
 * <PageContainer title="Investimentos" subtitle="Visão geral do portfólio" actions={<Button>...</Button>}>
 *   ...
 * </PageContainer>
 * ```
 */
export function PageContainer({
  children,
  title,
  subtitle,
  actions,
  maxWidth = "xl",
  className,
}: PageContainerProps) {
  return (
    <div className={cn("w-full", maxWidthMap[maxWidth], className)}>
      {(title || subtitle || actions) && (
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title && (
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2 mt-2 sm:mt-0">
              {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
