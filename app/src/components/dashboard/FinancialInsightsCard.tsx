"use client";

/**
 * FinancialInsightsCard — Insights Financeiros Determinísticos
 * Sprint 11.3
 *
 * Exibe lista de insights gerados pelo Financial Insights Engine.
 * Visual premium dark zinc, alinhado com RadarCard existente.
 */

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  Shield,
  PieChart,
  Coins,
  CreditCard,
  BarChart3,
  Flame,
  Lightbulb,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinancialInsight, InsightSeverity } from "@/lib/financial-insights";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  AlertTriangle,
  Shield,
  PieChart,
  Coins,
  CreditCard,
  BarChart3,
  Flame,
  Lightbulb,
  Info,
};

// ── Severity styles ───────────────────────────────────────────────────────────

const SEVERITY_STYLES: Record<InsightSeverity, {
  border: string; bg: string; iconBg: string; iconText: string; badge: string;
}> = {
  success: {
    border:   "border-emerald-500/20",
    bg:       "bg-emerald-500/5",
    iconBg:   "bg-emerald-500/15",
    iconText: "text-emerald-400",
    badge:    "bg-emerald-500/15 text-emerald-400",
  },
  info: {
    border:   "border-sky-500/20",
    bg:       "bg-sky-500/5",
    iconBg:   "bg-sky-500/15",
    iconText: "text-sky-400",
    badge:    "bg-sky-500/15 text-sky-400",
  },
  warning: {
    border:   "border-amber-500/20",
    bg:       "bg-amber-500/5",
    iconBg:   "bg-amber-500/15",
    iconText: "text-amber-400",
    badge:    "bg-amber-500/15 text-amber-400",
  },
  danger: {
    border:   "border-rose-500/20",
    bg:       "bg-rose-500/5",
    iconBg:   "bg-rose-500/15",
    iconText: "text-rose-400",
    badge:    "bg-rose-500/15 text-rose-400",
  },
};

// ── Insight Item ──────────────────────────────────────────────────────────────

function InsightItem({ insight }: { insight: FinancialInsight }) {
  const s    = SEVERITY_STYLES[insight.severity];
  const Icon = ICON_MAP[insight.icon] ?? Info;

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
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] font-semibold leading-tight text-foreground">
            {insight.title}
          </p>
          {insight.metric && (
            <span className={cn(
              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              s.badge,
            )}>
              {insight.metric}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
          {insight.description}
        </p>
        {insight.action && (
          <p className="mt-1 text-[10px] font-medium text-primary/80 leading-snug">
            → {insight.action}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  insights:  FinancialInsight[];
  className?: string;
}

export function FinancialInsightsCard({ insights, className }: Props) {
  const dangerCount  = insights.filter(i => i.severity === "danger").length;
  const warningCount = insights.filter(i => i.severity === "warning").length;
  const successCount = insights.filter(i => i.severity === "success").length;

  const subtitle = insights.length === 0
    ? "Nenhum insight disponível"
    : `${insights.length} ${insights.length === 1 ? "insight" : "insights"} · ${dangerCount} crítico${dangerCount !== 1 ? "s" : ""} · ${warningCount} alerta${warningCount !== 1 ? "s" : ""}`;

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
      className,
    )}>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10">
          <Lightbulb className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Insights Financeiros</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {successCount > 0 && (
          <span className="ml-auto rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            {successCount} positivo{successCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Insights */}
      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Lightbulb className="h-8 w-8 text-muted-foreground/20 mb-2" />
          <p className="text-[12px] text-muted-foreground">
            Dados insuficientes para gerar insights.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/70">
            Registre contas, transações e investimentos para ativar o motor.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {insights.map(insight => (
            <InsightItem key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
