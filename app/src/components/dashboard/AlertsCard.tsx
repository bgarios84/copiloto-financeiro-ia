"use client";

/**
 * AlertsCard — Central de Alertas Internos
 * Sprint 11.5
 *
 * Exibe alertas operacionais gerados pelo alerts service.
 * Visual premium dark zinc, alinhado ao design system.
 */

import * as React from "react";
import Link       from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  BellRing,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InternalAlert, AlertSeverity } from "@/services/alerts";

// ── Severity styles ───────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<AlertSeverity, {
  border: string; bg: string; iconBg: string; iconText: string; icon: React.ElementType;
}> = {
  danger: {
    border:   "border-rose-500/20",
    bg:       "bg-rose-500/5",
    iconBg:   "bg-rose-500/15",
    iconText: "text-rose-400",
    icon:     AlertCircle,
  },
  warning: {
    border:   "border-amber-500/20",
    bg:       "bg-amber-500/5",
    iconBg:   "bg-amber-500/15",
    iconText: "text-amber-400",
    icon:     AlertTriangle,
  },
  info: {
    border:   "border-sky-500/20",
    bg:       "bg-sky-500/5",
    iconBg:   "bg-sky-500/15",
    iconText: "text-sky-400",
    icon:     Info,
  },
};

// ── Alert Item ────────────────────────────────────────────────────────────────

function AlertItem({ alert }: { alert: InternalAlert }) {
  const s    = SEVERITY_STYLES[alert.severity];
  const Icon = s.icon;

  return (
    <div className={cn(
      "flex gap-3 rounded-xl border p-3 transition-colors",
      s.border, s.bg,
    )}>
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5",
        s.iconBg,
      )}>
        <Icon className={cn("h-4 w-4", s.iconText)} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold leading-tight text-foreground">
          {alert.title}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
          {alert.description}
        </p>
        <Link
          href={alert.actionHref}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary/80 hover:text-primary transition-colors"
        >
          {alert.actionLabel}
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  alerts:    InternalAlert[];
  className?: string;
}

export function AlertsCard({ alerts, className }: Props) {
  const dangerCount  = alerts.filter(a => a.severity === "danger").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  const subtitle = alerts.length === 0
    ? "Nenhum alerta no momento"
    : `${alerts.length} ${alerts.length === 1 ? "alerta" : "alertas"} · ${dangerCount} crítico${dangerCount !== 1 ? "s" : ""} · ${warningCount} aviso${warningCount !== 1 ? "s" : ""}`;

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
      className,
    )}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl",
          dangerCount > 0 ? "bg-rose-500/10" : warningCount > 0 ? "bg-amber-500/10" : "bg-sky-500/10",
        )}>
          <BellRing className={cn(
            "h-4 w-4",
            dangerCount > 0 ? "text-rose-400" : warningCount > 0 ? "text-amber-400" : "text-sky-400",
          )} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Central de Alertas</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {dangerCount > 0 && (
          <span className="ml-auto rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
            {dangerCount} crítico{dangerCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Alerts list */}
      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/30 mb-2" />
          <p className="text-[12px] text-muted-foreground">
            Tudo em ordem! Nenhum alerta ativo.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            Continuaremos monitorando suas finanças.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map(alert => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
