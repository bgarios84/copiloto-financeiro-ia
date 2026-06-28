import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * EmptyState — placeholder UI for empty lists or zero-data states.
 *
 * Usage:
 * ```tsx
 * <EmptyState
 *   icon={ArrowLeftRight}
 *   title="Nenhuma transação encontrada"
 *   description="Adicione uma transação para começar a acompanhar suas finanças."
 *   action={{ label: "Nova transação", onClick: () => {} }}
 * />
 * ```
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border",
        "bg-secondary/30 px-6 py-12 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      <div>
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            "mt-1 h-8 rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground",
            "transition-colors hover:bg-primary/90"
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
