"use client";

/**
 * OnboardingChecklist — First Run Experience
 * Sprint 11.4
 *
 * Exibe o checklist de configuração inicial para novos usuários.
 * Aparece abaixo do HeroCard enquanto o onboarding não estiver completo.
 * Visual premium dark zinc.
 */

import * as React from "react";
import Link       from "next/link";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Wifi,
  Building2,
  ArrowLeftRight,
  TrendingUp,
  PiggyBank,
  Flame,
  Rocket,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStep, OnboardingStatus } from "@/services/onboarding";

// ── Step icons ────────────────────────────────────────────────────────────────

const STEP_ICONS: Record<string, React.ElementType> = {
  open_finance: Wifi,
  accounts:     Building2,
  transactions: ArrowLeftRight,
  investments:  TrendingUp,
  budget:       PiggyBank,
  fire:         Flame,
};

// ── Step Item ─────────────────────────────────────────────────────────────────

function StepItem({ step, index }: { step: OnboardingStep; index: number }) {
  const Icon = STEP_ICONS[step.id] ?? Circle;

  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border p-3 transition-all",
      step.completed
        ? "border-emerald-500/20 bg-emerald-500/5 opacity-70"
        : "border-border bg-zinc-900/60 hover:border-zinc-600",
    )}>
      {/* Number / Check */}
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5 text-[11px] font-bold",
        step.completed
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-zinc-800 text-zinc-400",
      )}>
        {step.completed
          ? <CheckCircle2 className="h-4 w-4" />
          : <span>{index + 1}</span>
        }
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn(
              "text-[12px] font-semibold leading-tight",
              step.completed ? "text-muted-foreground line-through" : "text-foreground",
            )}>
              {step.label}
            </p>
            {!step.completed && (
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                {step.description}
              </p>
            )}
          </div>

          {/* Action button */}
          <Link
            href={step.href}
            className={cn(
              "shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
              step.completed
                ? "text-muted-foreground hover:text-foreground"
                : "bg-primary/10 text-primary hover:bg-primary/20",
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="hidden sm:inline">{step.action}</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  status:    OnboardingStatus;
  className?: string;
}

export function OnboardingChecklist({ status, className }: Props) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed || status.isComplete) return null;

  const progressPct = status.totalCount > 0
    ? Math.round((status.completedCount / status.totalCount) * 100)
    : 0;

  const remaining = status.totalCount - status.completedCount;

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden",
      className,
    )}>
      {/* Header */}
      <div className="flex items-start gap-3 p-5 pb-4 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
          <Rocket className="h-4.5 w-4.5 text-violet-400 h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground">
              Configure seu Copiloto Financeiro
            </p>
            <button
              onClick={() => setDismissed(true)}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-zinc-800 transition-colors"
              aria-label="Fechar checklist"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {remaining === 0
              ? "Tudo configurado!"
              : `${remaining} ${remaining === 1 ? "etapa restante" : "etapas restantes"} para desbloquear todos os insights`
            }
          </p>

          {/* Progress bar */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
              {status.completedCount}/{status.totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {status.steps.map((step, i) => (
            <StepItem key={step.id} step={step} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
