"use client";
import Image from "next/image";

/**
 * HealthClient — Análise detalhada do Health Score
 *
 * Hierarquia:
 *   1. Header compacto (← Dashboard | score | data)
 *   2. Score Hero — gauge grande + grade + como calculamos
 *   3. 5 dimensões — cards com barra de progresso, estrelas, descrição
 *   4. Plano de Ação — weaknesses + insights com actions
 *   5. Painel direito (xl): breakdown raw pts + strengths + CTA FIRE
 */

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Activity, Shield, Wallet,
  BarChart3, TrendingUp, PiggyBank, CheckCircle2, AlertTriangle,
  Sparkles, ChevronDown, ChevronUp, Info, Flame, Star,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { HealthSnapshot } from "@/lib/financial-health";
import type { FinancialInsight } from "@/lib/financial-insights";

// ── Types ─────────────────────────────────────────────────────

interface Props {
  healthSnapshot:    HealthSnapshot | null;
  financialInsights: FinancialInsight[];
  error:             string | null;
}

interface Dimension {
  key:         string;
  label:       string;
  score:       number;
  stars:       number;
  description: string;
  iconKey:     "shield" | "wallet" | "bar" | "trending" | "piggy";
  color:       string;
  bg:          string;
  border:      string;
}

// ── Utils ─────────────────────────────────────────────────────

function scoreHex(s: number): string {
  if (s >= 80) return "#10b981";
  if (s >= 65) return "#3b82f6";
  if (s >= 50) return "#f59e0b";
  return "#ef4444";
}

function scoreTailwind(s: number): { color: string; bg: string; border: string } {
  if (s >= 80) return { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (s >= 65) return { color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    };
  if (s >= 50) return { color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   };
  return            { color: "text-rose-400",   bg: "bg-rose-500/10",    border: "border-rose-500/20"    };
}

function scoreLabel(g: string): string {
  return { A: "Excelente", B: "Muito Bom", C: "Bom", D: "Regular", F: "Crítico" }[g] ?? "—";
}

function toStars(score: number): number {
  if (score >= 88) return 5;
  if (score >= 70) return 4;
  if (score >= 50) return 3;
  if (score >= 30) return 2;
  return 1;
}

function fmt(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return formatCurrency(v);
}

function computeDimensions(snap: HealthSnapshot): Dimension[] {
  const b   = snap.score.breakdown;
  const er  = snap.emergencyReserve;
  const pf  = snap.portfolio;
  const sav = snap.savings;
  const cf  = snap.cashFlow;
  const w   = snap.wealth;

  // 1. Reserva de emergência — progress direto 0-100
  const reservaScore = Math.min(100, Math.round(er.progress));

  // 2. Diversificação — diversificationScore 0-100 do engine
  const diversScore = Math.round(pf.diversificationScore);

  // 3. Liquidez — quantos meses de liquidez imediata vs meta de 2 meses
  const liquidScore = Math.min(100, Math.round((er.monthsCovered / 2) * 100));

  // 4. Proteção patrimonial — debtControl raw (0-20) → 0-100
  const protecaoScore = Math.round((b.debtControl / 20) * 100);

  // 5. Fluxo de caixa — savingsRate raw (0-25) → 0-100
  const fluxoScore = Math.round((b.savingsRate / 25) * 100);

  const dims: Array<Omit<Dimension, "color" | "bg" | "border">> = [
    {
      key:   "reserva",
      label: "Reserva de emergência",
      score: reservaScore,
      stars: toStars(reservaScore),
      iconKey: "shield",
      description:
        er.monthsCovered >= er.targetMonths
          ? `Sua reserva cobre ${er.monthsCovered.toFixed(0)} meses. Meta atingida.`
          : `Sua reserva cobre ${er.monthsCovered.toFixed(1)} de ${er.targetMonths} meses necessários.`,
    },
    {
      key:   "diversificacao",
      label: "Diversificação",
      score: diversScore,
      stars: toStars(diversScore),
      iconKey: "bar",
      description:
        pf.isConcentrated
          ? `Sua carteira está concentrada (${pf.topConcentration.toFixed(0)}% em uma classe). Considere diversificar.`
          : `Boa distribuição entre classes de ativos (HHI: ${pf.herfindahlIndex.toFixed(2)}).`,
    },
    {
      key:   "liquidez",
      label: "Liquidez",
      score: liquidScore,
      stars: toStars(liquidScore),
      iconKey: "wallet",
      description:
        er.monthsCovered >= 2
          ? `Você tem ${er.monthsCovered.toFixed(1)} meses de despesas em ativos líquidos. Excelente.`
          : `Menos de 2 meses em ativos líquidos (${er.monthsCovered.toFixed(1)} meses). Aumente a liquidez.`,
    },
    {
      key:   "protecao",
      label: "Proteção patrimonial",
      score: protecaoScore,
      stars: toStars(protecaoScore),
      iconKey: "trending",
      description:
        w.totalLiabilities <= w.totalAssets * 0.05
          ? `Endividamento controlado (${((w.totalLiabilities / Math.max(1, w.totalAssets)) * 100).toFixed(1)}% do patrimônio).`
          : `Endividamento em ${((w.totalLiabilities / Math.max(1, w.totalAssets)) * 100).toFixed(1)}% do patrimônio. Priorize quitar dívidas.`,
    },
    {
      key:   "fluxo",
      label: "Fluxo de caixa",
      score: fluxoScore,
      stars: toStars(fluxoScore),
      iconKey: "piggy",
      description:
        sav.savingsRate >= 20
          ? `Taxa de poupança de ${sav.savingsRate.toFixed(0)}%. Fluxo saudável — ${cf.trend === "improving" ? "tendência de melhora" : "estável"}.`
          : sav.savingsRate >= 10
          ? `Taxa de poupança de ${sav.savingsRate.toFixed(0)}%. Há espaço para melhorar o fluxo.`
          : `Taxa de poupança de ${sav.savingsRate.toFixed(0)}%. Reduza despesas para equilibrar.`,
    },
  ];

  return dims.map(d => ({
    ...d,
    ...scoreTailwind(d.score),
  }));
}

// ── Score Arc ──────────────────────────────────────────────────

function ScoreArc({ score, sz = 160 }: { score: number; sz?: number }) {
  const cx = sz / 2, cy = sz / 2, r = sz * 0.37;
  const color = scoreHex(score);
  const sx = cx - r, sy = cy, ex = cx + r, ey = cy;
  const a  = (180 - (score / 100) * 180) * (Math.PI / 180);
  const px = cx + r * Math.cos(a), py = cy - r * Math.sin(a);
  return (
    <svg viewBox={`0 0 ${sz} ${sz / 2 + 24}`} style={{ width: sz }} className="mx-auto">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
        fill="none" stroke="#27272a" strokeWidth="12" strokeLinecap="round" />
      {score > 0 && (
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${px.toFixed(2)} ${py.toFixed(2)}`}
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 6}  textAnchor="middle" fill="white"
        fontSize={sz * 0.28} fontWeight="800" fontFamily="Inter,system-ui">{score}</text>
      <text x={cx} y={cy + 16} textAnchor="middle" fill="#52525b"
        fontSize={sz * 0.09}  fontFamily="Inter,system-ui">/ 100</text>
    </svg>
  );
}

// ── Mini Arc (right panel) ─────────────────────────────────────

function MiniArc({ score, sz = 56 }: { score: number; sz?: number }) {
  const cx = sz / 2, cy = sz / 2, r = sz * 0.37;
  const color = scoreHex(score);
  const sx = cx - r, sy = cy, ex = cx + r, ey = cy;
  const a  = (180 - (score / 100) * 180) * (Math.PI / 180);
  const px = cx + r * Math.cos(a), py = cy - r * Math.sin(a);
  return (
    <svg viewBox={`0 0 ${sz} ${sz / 2 + 8}`} style={{ width: sz }}>
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`}
        fill="none" stroke="#27272a" strokeWidth="5" strokeLinecap="round" />
      {score > 0 && (
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${px.toFixed(2)} ${py.toFixed(2)}`}
          fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 2} textAnchor="middle" fill="white"
        fontSize={sz * 0.28} fontWeight="700" fontFamily="Inter,system-ui">{score}</text>
    </svg>
  );
}

// ── Stars ──────────────────────────────────────────────────────

function Stars({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("h-3.5 w-3.5", i < count ? color : "text-zinc-800")}
          fill={i < count ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

// ── Progress Bar ───────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-800/80 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700", color.replace("text-", "bg-"))}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── Dimension Icon ─────────────────────────────────────────────

const ICON_MAP = {
  shield:  Shield,
  wallet:  Wallet,
  bar:     BarChart3,
  trending:TrendingUp,
  piggy:   PiggyBank,
};

// ── 1. Header ──────────────────────────────────────────────────

function PageHeader({ score, grade }: { score: number; grade: string }) {
  const color  = scoreHex(score);
  const label  = scoreLabel(grade);
  return (
    <div className="flex items-center justify-between">
      <Link href="/dashboard"
        className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors group">
        <ChevronLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Dashboard
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5">
          <Activity className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-[12px] font-semibold" style={{ color }}>{label}</span>
          <span className="text-[11px] text-zinc-600">· {score}/100</span>
        </div>
        <Link href="/fire"
          className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-[12px] font-semibold text-white transition-all">
          <Image
            src="/brand/nextfire-icon.png"
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain shrink-0"
          />
          Melhorar com FIRE
        </Link>
      </div>
    </div>
  );
}

// ── 2. Score Hero ──────────────────────────────────────────────

function ScoreHero({ score, grade, computedAt }: { score: number; grade: string; computedAt: string }) {
  const [open, setOpen] = React.useState(false);
  const color  = scoreHex(score);
  const label  = scoreLabel(grade);
  const date   = new Date(computedAt).toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="rounded-3xl border border-zinc-800/30 bg-zinc-900/30 px-8 py-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-600/30 to-transparent" />

      <div className="flex items-start gap-10">
        {/* Arc */}
        <div className="shrink-0">
          <ScoreArc score={score} sz={180} />
          <p className="text-center text-[13px] font-bold mt-1" style={{ color }}>{label}</p>
          <p className="text-center text-[10px] text-zinc-700 mt-0.5">Calculado em {date}</p>
        </div>

        {/* Summary */}
        <div className="flex-1 min-w-0 pt-2">
          <p className="text-[22px] font-bold text-zinc-50 leading-snug mb-2">
            Sua saúde financeira
          </p>
          <p className="text-[14px] text-zinc-400 leading-relaxed mb-6 max-w-lg">
            {score >= 80
              ? "Você está entre os melhores. Mantenha a consistência e siga o plano do FIRE para chegar mais cedo à independência financeira."
              : score >= 65
              ? "Boa situação financeira, com pontos específicos para melhorar. Siga o plano abaixo para subir para a faixa A."
              : score >= 50
              ? "Situação equilibrada, mas com riscos que merecem atenção. Foque nas dimensões com menor pontuação."
              : "Atenção: existem riscos financeiros que precisam de ação imediata. Consulte o FIRE para um plano personalizado."}
          </p>

          {/* How we calculate */}
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Como calculamos seu score
          </button>

          {open && (
            <div className="mt-3 rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4 text-[12px] text-zinc-400 leading-relaxed space-y-1.5 max-w-lg">
              <p><span className="text-zinc-300 font-semibold">Taxa de poupança</span> — até 25 pts. Quanto você poupa do que ganha.</p>
              <p><span className="text-zinc-300 font-semibold">Reserva de emergência</span> — até 20 pts. Meses de despesa cobertos.</p>
              <p><span className="text-zinc-300 font-semibold">Controle de dívidas</span> — até 20 pts. Passivos vs patrimônio.</p>
              <p><span className="text-zinc-300 font-semibold">Diversificação</span> — até 20 pts. Concentração da carteira.</p>
              <p><span className="text-zinc-300 font-semibold">Renda passiva</span> — até 15 pts. Cobertura das despesas por dividendos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 3. Dimensões ───────────────────────────────────────────────

function DimensionCard({ dim }: { dim: Dimension }) {
  const Icon = ICON_MAP[dim.iconKey];
  return (
    <div className={cn("rounded-2xl border bg-zinc-900/70 p-5 transition-all hover:bg-zinc-900", dim.border)}>
      <div className="flex items-start gap-4">
        {/* Icon + mini arc */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", dim.bg)}>
            <Icon className={cn("h-4.5 w-4.5", dim.color)} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[13px] font-semibold text-zinc-100">{dim.label}</p>
            <div className="flex items-center gap-3">
              <Stars count={dim.stars} color={dim.color} />
              <span className={cn("text-[18px] font-bold tabular-nums", dim.color)}>{dim.score}</span>
            </div>
          </div>

          <ProgressBar value={dim.score} color={dim.color} />

          <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">{dim.description}</p>
        </div>
      </div>
    </div>
  );
}

// ── 4. Plano de Ação ───────────────────────────────────────────

function ActionPlan({
  weaknesses,
  insights,
}: {
  weaknesses: string[];
  insights:   FinancialInsight[];
}) {
  // Combina weaknesses + insights com action field (sem duplicatas por id/texto)
  const insightActions = insights
    .filter(i => i.action && (i.severity === "warning" || i.severity === "danger" || i.severity === "info"))
    .slice(0, 3)
    .map(i => i.action!);

  const allActions = [
    ...weaknesses.slice(0, 3),
    ...insightActions,
  ].slice(0, 6);

  if (allActions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/40 p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15">
          <Flame className="h-4 w-4 text-violet-400" />
        </div>
        <p className="text-[15px] font-semibold text-zinc-100">Plano de ação</p>
        <span className="ml-auto text-[10px] font-semibold text-violet-400 uppercase tracking-widest bg-violet-500/10 rounded-full px-2 py-0.5">
          FIRE
        </span>
      </div>

      <div className="space-y-3 mb-6">
        {allActions.map((action, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 mt-0.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            </div>
            <p className="text-[13px] text-zinc-300 leading-relaxed">{action}</p>
          </div>
        ))}
      </div>

      <Link
        href="/fire"
        className="flex items-center justify-center gap-2 w-full rounded-2xl bg-violet-600 hover:bg-violet-500 py-3 text-[13px] font-semibold text-white transition-all shadow-lg shadow-violet-700/20"
      >
        <Image
          src="/brand/nextfire-icon.png"
          alt=""
          width={18}
          height={18}
          className="h-[18px] w-[18px] object-contain shrink-0"
        />
        Gerar plano personalizado com FIRE
      </Link>
    </div>
  );
}

// ── Right: Score Breakdown ─────────────────────────────────────

function RPBreakdown({ snap }: { snap: HealthSnapshot }) {
  const b = snap.score.breakdown;
  const items = [
    { label: "Taxa de poupança",     pts: b.savingsRate,      max: 25 },
    { label: "Reserva emergência",   pts: b.emergencyReserve, max: 20 },
    { label: "Controle de dívidas",  pts: b.debtControl,      max: 20 },
    { label: "Diversificação",       pts: b.diversification,  max: 20 },
    { label: "Renda passiva",        pts: b.passiveIncome,    max: 15 },
  ];

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/80 p-5">
      <p className="text-[13px] font-semibold text-zinc-100 mb-4">Pontuação detalhada</p>
      <div className="space-y-3">
        {items.map(item => {
          const pct = (item.pts / item.max) * 100;
          const col = scoreHex(pct);
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-zinc-400">{item.label}</span>
                <span className="text-[11px] font-semibold text-zinc-200 tabular-nums">
                  {item.pts.toFixed(0)}<span className="text-zinc-600">/{item.max}</span>
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: col }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] text-zinc-600">Total</span>
        <span className="text-[14px] font-bold text-zinc-100">{snap.score.score}<span className="text-zinc-600 text-[11px]">/100</span></span>
      </div>
    </div>
  );
}

function RPStrengths({ strengths, weaknesses }: { strengths: string[]; weaknesses: string[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/80 p-5 space-y-4">
      {strengths.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest mb-2">Pontos fortes</p>
          <div className="space-y-1.5">
            {strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-snug">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {weaknesses.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest mb-2">Atenção</p>
          <div className="space-y-1.5">
            {weaknesses.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-zinc-400 leading-snug">{w}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RPFireCTA() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-950/80 to-zinc-900 border border-violet-800/25 p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/4 to-transparent pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <p className="text-[12px] font-semibold text-violet-200">Consultor FIRE</p>
        </div>
        <p className="text-[12px] text-violet-300/75 leading-relaxed mb-4">
          Peça ao FIRE um plano personalizado para subir sua pontuação e antecipar sua independência financeira.
        </p>
        <Link href="/fire"
          className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-violet-700/50 hover:bg-violet-700/80 py-2.5 text-[12px] font-semibold text-violet-100 transition-colors">
          <Image
            src="/brand/nextfire-icon.png"
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] object-contain shrink-0"
          />
          Iniciar conversa <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
        <Activity className="h-8 w-8 text-zinc-700" />
      </div>
      <div className="text-center">
        <p className="text-[16px] font-semibold text-zinc-300 mb-2">Dados insuficientes</p>
        <p className="text-[13px] text-zinc-600 max-w-xs">
          Conecte suas contas e registre transações para ver sua análise de saúde financeira.
        </p>
      </div>
      <Link href="/accounts"
        className="flex items-center gap-2 rounded-2xl bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-[13px] font-semibold text-white transition-all">
        Conectar contas
      </Link>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────

export function HealthClient({ healthSnapshot, financialInsights, error }: Props) {
  if (!healthSnapshot) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[12px] text-rose-400">
            {error}
          </div>
        )}
        <EmptyState />
      </div>
    );
  }

  const snap       = healthSnapshot;
  const score      = snap.score.score;
  const grade      = snap.score.grade;
  const dimensions = computeDimensions(snap);

  return (
    <div className="flex gap-6 xl:gap-8 min-h-0">
      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-6 pb-8">
        {error && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-[12px] text-rose-400">
            {error}
          </div>
        )}

        {/* 1. Header */}
        <PageHeader score={score} grade={grade} />

        {/* 2. Score Hero */}
        <ScoreHero score={score} grade={grade} computedAt={snap.computedAt} />

        {/* 3. Dimensões */}
        <div>
          <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">
            Análise por dimensão
          </p>
          <div className="flex flex-col gap-3">
            {dimensions.map(dim => (
              <DimensionCard key={dim.key} dim={dim} />
            ))}
          </div>
        </div>

        {/* 4. Plano de ação */}
        <ActionPlan
          weaknesses={snap.score.weaknesses}
          insights={financialInsights}
        />
      </div>

      {/* ── Right column (xl only) ── */}
      <div className="w-[280px] shrink-0 hidden xl:flex flex-col gap-4 pb-8">
        <RPBreakdown snap={snap} />
        <RPStrengths strengths={snap.score.strengths} weaknesses={snap.score.weaknesses} />
        <RPFireCTA />
      </div>
    </div>
  );
}
