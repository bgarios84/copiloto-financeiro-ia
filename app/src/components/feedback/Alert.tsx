import * as React from "react";
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertType = "info" | "success" | "warning" | "error";

const config: Record<AlertType, {
  icon: React.ElementType;
  bg: string;
  border: string;
  iconColor: string;
  titleColor: string;
}> = {
  info: {
    icon: Info,
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    iconColor: "text-blue-500",
    titleColor: "text-blue-700 dark:text-blue-400",
  },
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-500",
    titleColor: "text-emerald-700 dark:text-emerald-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
    iconColor: "text-yellow-500",
    titleColor: "text-yellow-700 dark:text-yellow-400",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    iconColor: "text-red-500",
    titleColor: "text-red-700 dark:text-red-400",
  },
};

export interface AlertProps {
  type?: AlertType;
  title?: string;
  description: string;
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Alert — inline contextual alert for feedback messages.
 *
 * Usage:
 * ```tsx
 * <Alert
 *   type="warning"
 *   title="Orçamento excedido"
 *   description="Você gastou 107% do orçamento de alimentação este mês."
 *   onDismiss={() => {}}
 * />
 * ```
 */
export function Alert({
  type = "info",
  title,
  description,
  onDismiss,
  action,
  className,
}: AlertProps) {
  const cfg = config[type];
  const Icon = cfg.icon;

  return (
    <div
      role="alert"
      className={cn(
        "relative flex gap-3 rounded-xl border p-4",
        cfg.bg,
        cfg.border,
        className
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.iconColor)} />

      <div className="flex-1 min-w-0 pr-6">
        {title && (
          <p className={cn("text-[13px] font-semibold mb-0.5", cfg.titleColor)}>{title}</p>
        )}
        <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className={cn("mt-2 text-[12px] font-medium underline-offset-2 hover:underline", cfg.titleColor)}
          >
            {action.label}
          </button>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          aria-label="Fechar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
