"use client";

/**
 * FinancialHealthCard — Score de Saúde Financeira
 * Sprint 11.2
 *
 * Exibe o score geral, grade, nível FI, decomposição em 5 dimensões,
 * pontos fortes e pontos de atenção. Visual premium dark zinc.
 */

import * as React    from "react";
import {
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Zap,
  AlertTriangle,
  CheckCircle2,
  PiggyBank,
  Shield,
  BarChart3,
  Flame,
  Coins,
} from "lucide-react";
import { cn }        from "@/lib/utils";
import type { HealthSnapshot, ScoreGrade, FILevel } from "@/lib/financial-health";

// ── Labels & colors ───────────────────────────────────────────────────────────

const GRADE_CONFIG: Record<ScoreGrade, { label: string; color: string; bg: string; ring: string }> = {
  A: { label: "A",  color: "text-emerald-400", bg: "bg-emerald-500/15", ring: "ring-emerald-500/30" },
  B: { label: "B",  color: "text-sky-400",     bg: "bg-sky-500/15",     ring: "ring-sky-500/30"     },
  C: { label: "C",  color: "text-amber-400",   bg: "bg-amber-500/15",   ring: "ring-amber-500/30"   },
  D: { label: "D",  color: "text-orange-400",  bg: "bg-orange-500/15",  ring: "ring-orange-500/30"  },
  F: { label: "F",  color: "text-rose-400",    bg: "bg-rose-500/15",    ring: "ring-rose-500/30"    },
};

const FI_LEVEL_LABELS: Record<FILevel, string> = {
  iniciante:  "Iniciante",
  acumulando: "Acumulando",
  semi_fi:    "Semi-FI",
  fi:         "Independência Financeira",
  fire:       "FIRE",
};

const FI_LEVEL_COLORS: Record<FILevel, string> = {
  iniciante:  "text-zinc-400",
  acumulando: "text-sky-400",
  semi_fi:    "text-violet-400",
  fi:         "text-emerald-400",
  fire:       "text-amber-400",
};

const DIMENSION_CONFIG = [
  { key: "savingsRate",      label: "Taxa de Poupança",  max: 25, Icon: PiggyBank },
  { key: "emergencyReserve", label: "Reserva Emergência", max: 20, Icon: Shield },
  { key: "debtControl",      label: "Controle de Dívidas", max: 20, Icon: ShieldCheck },
  { key: "diversification",  label: "Diversificação",    max: 20, Icon: BarChart3 },
  { key: "passiveIncome",    label: "Renda Passiva",     max: 15, Icon: Coins },
] as const;

// ── Score arc SVG ─────────────────────────────────────────────────────────────

function ScoreArc({ score, grade }: { score: number; grade: ScoreGrade }) {
  const cfg  = GRADE_CONFIG[grade];
  // Arc de 220° centrado em baixo — começa aos 160° e termina aos 20° (CW)
  const R    = 52;
  const cx   = 64;
  const cy   = 70;
  const ARC  = 220; // graus totais
  const start= (180 - ARC / 2) * (Math.PI / 180); // radianos
  const end  = (180 + ARC / 2) * (Math.PI / 180);

  function polarToXY(angleDeg: number) {
    const a = angleDeg * (Math.PI / 180);
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  }

  const s  = polarToXY(160);
  const e  = polarToXY(20);
  const bg = `M ${s.x} ${s.y} A ${R} ${R} 0 1 1 ${e.x} ${e.y}`;

  // Progresso
  const filled  = Math.min(score / 100, 1);
  const arcDeg  = 160 + ARC * filled;
  const ep      = polarToXY(arcDeg > 360 ? arcDeg - 360 : arcDeg);
  const large   = ARC * filled > 180 ? 1 : 0;
  const progress = `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${ep.x} ${ep.y}`;

  // Gradiente id único
  const gid = "fh-arc-grad";

  return (
    <svg viewBox="0 0 128 90" className="w-full max-w-[140px]" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#6366f1" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      {/* Track */}
      <path d={bg} fill="none" stroke="#27272a" strokeWidth="9" strokeLinecap="round" />
      {/* Progress */}
      <path d={progress} fill="none" stroke={`url(#${gid})`} strokeWidth="9" strokeLinecap="round" />
      {/* Score text */}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-foreground" fontSize="22" fontWeight="700">
        {score}
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" className="fill-muted-foreground" fontSize="9">
        de 100
      </text>
    </svg>
  );
}

// ── Dimension bar ─────────────────────────────────────────────────────────────

function DimensionBar({
  label, pts, max, Icon,
}: { label: string; pts: number; max: number; Icon: React.ElementType }) {
  const pct   = max > 0 ? (pts / max) * 100 : 0;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-sky-500" : pct >= 25 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 items-center">
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
      </div>
      <span className="text-[11px] font-medium tabular-nums text-foreground">
        {pts}<span className="text-muted-foreground">/{max}</span>
      </span>
      <div className="col-span-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  snapshot: HealthSnapshot;
  className?: string;
}

export function FinancialHealthCard({ snapshot, className }: Props) {
  const { score } = snapshot;
  const cfg        = GRADE_CONFIG[score.grade];
  const fiLevel    = snapshot.fireProgress.fiLevel;
  const strengths  = score.strengths.slice(0, 3);
  const weaknesses = score.weaknesses.slice(0, 3);

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]",
      className,
    )}>

      {/* ── Header ── */}
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
          <Zap className="h-4 w-4 text-violet-400" />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Saúde Financeira</p>
          <p className="text-[11px] text-muted-foreground">Score calculado com seus dados reais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6">

        {/* ── Coluna esquerda: score arc + grade + nível ── */}
        <div className="flex flex-col items-center gap-3">
          <ScoreArc score={score.score} grade={score.grade} />

          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 ring-1",
            cfg.bg, cfg.ring,
          )}>
            <span className={cn("text-2xl font-black leading-none", cfg.color)}>
              {cfg.label}
            </span>
            <div className="h-4 w-px bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground">
              {score.score >= 80 ? "Excelente" : score.score >= 65 ? "Bom" : score.score >= 50 ? "Regular" : score.score >= 35 ? "Atenção" : "Crítico"}
            </span>
          </div>

          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Nível FI</p>
            <p className={cn("text-[12px] font-semibold", FI_LEVEL_COLORS[fiLevel])}>
              {FI_LEVEL_LABELS[fiLevel]}
            </p>
          </div>
        </div>

        {/* ── Coluna direita: dimensões + pontos fortes/atenção ── */}
        <div className="space-y-5 min-w-0">

          {/* Dimensões */}
          <div className="space-y-2.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Composição do Score
            </p>
            {DIMENSION_CONFIG.map(({ key, label, max, Icon }) => (
              <DimensionBar
                key={key}
                label={label}
                pts={score.breakdown[key]}
                max={max}
                Icon={Icon}
              />
            ))}
          </div>

          {/* Pontos fortes + atenção */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strengths.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 uppercase tracking-wide">
                    <TrendingUp className="h-3 w-3" /> Pontos Fortes
                  </p>
                  {strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground leading-snug">{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {weaknesses.length > 0 && (
                <div className="space-y-1.5">
                  <p className="flex items-center gap-1 text-[11px] font-medium text-amber-400 uppercase tracking-wide">
                    <TrendingDown className="h-3 w-3" /> Atenção
                  </p>
                  {weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                      <span className="text-[11px] text-muted-foreground leading-snug">{w}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
