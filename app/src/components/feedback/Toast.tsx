"use client";

import * as React from "react";
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "info" | "success" | "warning" | "error";
type ToastPosition = "top-right" | "top-center" | "bottom-right";

const typeConfig: Record<ToastType, { icon: React.ElementType; iconColor: string; border: string }> = {
  info:    { icon: Info,         iconColor: "text-blue-500",    border: "border-blue-500/20" },
  success: { icon: CheckCircle2, iconColor: "text-emerald-500", border: "border-emerald-500/20" },
  warning: { icon: AlertTriangle,iconColor: "text-yellow-500",  border: "border-yellow-500/20" },
  error:   { icon: XCircle,      iconColor: "text-red-500",     border: "border-red-500/20" },
};

const positionClass: Record<ToastPosition, string> = {
  "top-right":  "top-4 right-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-right": "bottom-4 right-4",
};

export interface ToastItem {
  id: string;
  type?: ToastType;
  title?: string;
  description: string;
}

export interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  position?: ToastPosition;
}

/**
 * Toast — stack of toast notifications.
 * Manage toast state externally via `useToast` or a simple useState array.
 *
 * Usage:
 * ```tsx
 * const [toasts, setToasts] = useState<ToastItem[]>([]);
 * const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));
 * const add = (item: Omit<ToastItem, "id">) =>
 *   setToasts((t) => [...t, { ...item, id: crypto.randomUUID() }]);
 *
 * <Toast toasts={toasts} onDismiss={dismiss} position="bottom-right" />
 * <button onClick={() => add({ type: "success", description: "Salvo!" })}>Salvar</button>
 * ```
 */
export function Toast({ toasts, onDismiss, position = "bottom-right" }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notificações"
      className={cn("fixed z-50 flex flex-col gap-2 w-80", positionClass[position])}
    >
      {toasts.map((toast) => {
        const cfg = typeConfig[toast.type ?? "info"];
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-xl border border-border bg-card p-4",
              "shadow-[var(--shadow-lg)]",
              "animate-in slide-in-from-right-4 duration-200"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", cfg.iconColor)} />
            <div className="flex-1 min-w-0 pr-4">
              {toast.title && (
                <p className="text-[13px] font-semibold text-foreground">{toast.title}</p>
              )}
              <p className="text-[12px] text-muted-foreground">{toast.description}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="absolute right-3 top-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              aria-label="Fechar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * useToast — simple hook for managing toast state.
 *
 * Usage:
 * ```tsx
 * const { toasts, add, dismiss } = useToast();
 * <Toast toasts={toasts} onDismiss={dismiss} />
 * <button onClick={() => add({ type: "success", description: "Feito!" })}>...</button>
 * ```
 */
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const add = React.useCallback((item: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...item, id }]);
    return id;
  }, []);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, add, dismiss };
}
