import * as React from "react";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ConnectionStatus = "connected" | "disconnected" | "syncing" | "error";

const statusConfig: Record<ConnectionStatus, {
  icon: React.ElementType;
  label: string;
  color: string;
}> = {
  connected: {
    icon: CheckCircle2,
    label: "Conectado",
    color: "text-positive",
  },
  disconnected: {
    icon: XCircle,
    label: "Desconectado",
    color: "text-muted-foreground",
  },
  syncing: {
    icon: Loader2,
    label: "Sincronizando...",
    color: "text-blue-500",
  },
  error: {
    icon: AlertCircle,
    label: "Erro de conexão",
    color: "text-negative",
  },
};

export interface ConnectionCardProps {
  name: string;
  type: string;
  status: ConnectionStatus;
  lastSync?: string;
  accountCount?: number;
  logoInitials?: string;
  onReconnect?: () => void;
  onSync?: () => void;
  className?: string;
}

/**
 * ConnectionCard — displays a bank/broker connection status.
 *
 * Usage:
 * ```tsx
 * <ConnectionCard
 *   name="Nubank"
 *   type="Banco Digital"
 *   status="connected"
 *   lastSync="há 5 min"
 *   accountCount={2}
 * />
 * ```
 */
export function ConnectionCard({
  name,
  type,
  status,
  lastSync,
  accountCount,
  logoInitials,
  onReconnect,
  onSync,
  className,
}: ConnectionCardProps) {
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5",
        "shadow-[var(--shadow-card)]",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-[11px] font-bold text-foreground uppercase tracking-wide">
        {(logoInitials ?? name.slice(0, 2)).toUpperCase()}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{name}</p>
        <p className="text-[11px] text-muted-foreground">
          {type}
          {accountCount !== undefined && ` · ${accountCount} conta${accountCount !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Status */}
      <div className="flex shrink-0 items-center gap-2">
        <div className={cn("flex items-center gap-1 text-[11px] font-medium", cfg.color)}>
          <StatusIcon
            className={cn("h-3.5 w-3.5", status === "syncing" && "animate-spin")}
          />
          <span className="hidden sm:inline">{cfg.label}</span>
        </div>

        {/* Actions */}
        {status === "disconnected" || status === "error" ? (
          onReconnect && (
            <button
              onClick={onReconnect}
              className="rounded-md bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-border transition-colors"
            >
              Reconectar
            </button>
          )
        ) : status === "connected" ? (
          onSync && (
            <button
              onClick={onSync}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              aria-label="Sincronizar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )
        ) : null}
      </div>

      {/* Last sync */}
      {lastSync && status === "connected" && (
        <p className="hidden lg:block shrink-0 text-[11px] text-muted-foreground/60">
          {lastSync}
        </p>
      )}
    </div>
  );
}
