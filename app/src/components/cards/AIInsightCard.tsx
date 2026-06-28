import * as React from "react";
import { Lightbulb, AlertTriangle, TrendingUp, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type InsightType = "tip" | "warning" | "opportunity" | "alert";

const typeConfig: Record<InsightType, {
  icon: React.ElementType;
  label: string;
  bg: string;
  border: string;
  iconColor: string;
  labelColor: string;
}> = {
  tip: {
    icon: Lightbulb,
    label: "Dica",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    iconColor: "text-blue-500",
    labelColor: "text-blue-600 dark:text-blue-400",
  },
  opportunity: {
    icon: TrendingUp,
    label: "Oportunidade",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-500",
    labelColor: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    label: "Atenção",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
    iconColor: "text-yellow-500",
    labelColor: "text-yellow-600 dark:text-yellow-400",
  },
  alert: {
    icon: AlertCircle,
    label: "Alerta",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    iconColor: "text-red-500",
    labelColor: "text-red-600 dark:text-red-400",
  },
};

export interface AIInsightCardProps {
  title: string;
  description: string;
  type?: InsightType;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  className?: string;
}

/**
 * AIInsightCard — displays an AI-generated financial insight or tip.
 *
 * Usage:
 * ```tsx
 * <AIInsightCard
 *   type="opportunity"
 *   title="Diversifique seu portfólio"
 *   description="Você tem 80% em renda fixa. Considere alocar 20% em FIIs."
 *   action={{ label: "Ver sugestões", onClick: () => {} }}
 * />
 * ```
 */
export function AIInsightCard({
  title,
  description,
  type = "tip",
  action,
  onDismiss,
  className,
}: AIInsightCardProps) {
  const cfg = typeConfig[type];
  const Icon = cfg.icon;

  return (
    <div
      className={cn(
        "relative rounded-xl border p-4",
        cfg.bg,
        cfg.border,
        className
      )}
    >
      {/* Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={cn("mt-0.5 shrink-0", cfg.iconColor)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-semibold uppercase tracking-wide", cfg.labelColor)}>
              {cfg.label}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-foreground leading-snug">{title}</p>
          <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">{description}</p>

          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                "mt-2.5 text-[12px] font-medium underline-offset-2 hover:underline",
                cfg.labelColor
              )}
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
