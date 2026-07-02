"use client";

/**
 * FireClient — FIRE Planner Premium
 * Sprint 8.5
 *
 * Layout: painel esquerdo (simulador/sliders) + painel direito (tabs).
 * Tabs: Dashboard | Cenários | Gráficos | Indicadores
 * Toda matemática via calcFire / calcScenarios / calcIndicators (lib/fire/).
 * Cenários salvos em localStorage.
 */

import * as React from "react";
import Link from "next/link";
import {
  Flame, Target, TrendingUp, Clock, Wallet, BarChart3,
  ChevronRight, ChevronLeft, Info, Trash2, BookmarkPlus, CheckCircle2,
  XCircle, Trophy, Zap, PiggyBank, LineChart,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type {
  FireData, FireInput, FireScenario, FireIndicators, SavedScenario,
} from "@/lib/fire/types";
import { FI_LEVEL_LABELS, FI_LEVEL_COLORS } from "@/lib/fire/types";
import { calcFire, calcScenarios, calcIndicators } from "@/lib/fire/calculator";

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props { data: FireData | null; error: string | null; }

// ── Helpers ───────────────────────────────────────────────────────────────────

type ActiveTab = "dashboard" | "cenarios" | "graficos" | "indicadores";

const SAVED_KEY  = "fire_scenarios_v1";
const ACTIVE_KEY = "fire_active_scene_v1";

function loadSaved(): SavedScenario[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]") as SavedScenario[]; }
  catch { return []; }
}
function persistSaved(list: SavedScenario[]): void {
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
}
function loadActiveId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}
function persistActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

function fmtYears(y: number): string {
  if (!isFinite(y)) return "∞";
  if (y < 1) return "< 1 ano";
  return `${y.toFixed(1)} anos`;
}
function fmtAge(a: number): string { return isFinite(a) ? `${a.toFixed(0)} anos` : "—"; }
function pct(v: number, d = 1): string { return `${v.toFixed(d)}%`; }

// ── SVG Components ────────────────────────────────────────────────────────────

function FIRing({ score, level, size = 120 }: { score: number; level: string; size?: number }) {
  const r  = 46; const cx = 60; const cy = 60;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color = score >= 100 ? "#F97316" : score >= 75 ? "#10B981" : score >= 50 ? "#3B82F6" : score >= 25 ? "#F59E0B" : "#6B7280";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.7s ease" }} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="currentColor" fontSize={20} fontWeight={800}>
          {score.toFixed(0)}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="currentColor" fontSize={9} fillOpacity={0.6}>
          FI Score
        </text>
      </svg>
      <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{level}</span>
    </div>
  );
}

interface MultiLineChartProps {
  series:      { color: string; label: string; data: number[] }[];
  labels:      string[];
  targetLine?: number;
  targetLabel?: string;
  formatY?:    (v: number) => string;
  height?:     number;
}

function MultiLineChart({ series, labels, targetLine, targetLabel, formatY = formatCurrency, height = 180 }: MultiLineChartProps) {
  const padL = 8; const padR = 14; const padT = 14; const padB = 28;
  const W = 560; const H = height;
  const innerW = W - padL - padR; const innerH = H - padT - padB;
  const allVals = series.flatMap(s => s.data);
  if (targetLine !== undefined) allVals.push(targetLine);
  const minV = 0; const maxV = Math.max(...allVals, 1);
  const n = labels.length;
  const xOf = (i: number) => padL + (i / Math.max(n - 1, 1)) * innerW;
  const yOf = (v: number) => padT + innerH - (v / maxV) * innerH;
  const buildPath = (data: number[]) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(" ");
  const step = Math.ceil(n / 6);
  const tickIdx = Array.from({ length: n }, (_, i) => i).filter(i => i % step === 0 || i === n - 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * (1 - f)} y2={padT + innerH * (1 - f)}
          stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
      ))}
      {targetLine !== undefined && (() => {
        const ty = yOf(targetLine);
        return (
          <g>
            <line x1={padL} x2={W - padR} y1={ty} y2={ty}
              stroke="#EF4444" strokeWidth={1.5} strokeDasharray="6 3" strokeOpacity={0.65} />
            {targetLabel && (
              <text x={W - padR - 4} y={ty - 4} textAnchor="end" fill="#EF4444" fontSize={8} fontWeight={600}>
                {targetLabel}
              </text>
            )}
          </g>
        );
      })()}
      {series.map(s => (
        <path key={s.label} d={buildPath(s.data)} fill="none" stroke={s.color}
          strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {tickIdx.map(i => (
        <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle"
          fill="currentColor" fillOpacity={0.4} fontSize={8}>{labels[i]}</text>
      ))}
    </svg>
  );
}

function StackedAreaChart({ projection, height = 180 }: { projection: { contributions: number; interestGain: number }[]; height: number }) {
  const padL = 8; const padR = 14; const padT = 14; const padB = 28;
  const W = 560; const H = height;
  const innerW = W - padL - padR; const innerH = H - padT - padB;
  const maxV = Math.max(...projection.map(p => p.contributions + p.interestGain), 1);
  const n = projection.length;
  const xOf = (i: number) => padL + (i / Math.max(n - 1, 1)) * innerW;
  const yOf = (v: number) => padT + innerH - (v / maxV) * innerH;
  const topPath = projection.map((p, i) =>
    `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.contributions + p.interestGain).toFixed(1)}`
  ).join(" ");
  const midPath = projection.map((p, i) =>
    `${i === 0 ? "M" : "L"}${xOf(i).toFixed(1)},${yOf(p.contributions).toFixed(1)}`
  ).join(" ");
  const baseLine = `L${xOf(n - 1).toFixed(1)},${yOf(0).toFixed(1)} L${xOf(0).toFixed(1)},${yOf(0).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="sc-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.08} />
        </linearGradient>
        <linearGradient id="sc-amber" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.15} />
        </linearGradient>
      </defs>
      {/* Interest gain area (on top) */}
      <path d={`${topPath} ${midPath.replace("M", "L").split("L").reverse().join("L").replace("L", "L") + " Z"}`}
        fill="url(#sc-blue)" />
      {/* Contributions area (bottom) */}
      <path d={`${midPath} ${baseLine}`} fill="url(#sc-amber)" />
      {/* Lines */}
      <path d={topPath} fill="none" stroke="#3B82F6" strokeWidth={2} strokeLinejoin="round" />
      <path d={midPath} fill="none" stroke="#F59E0B" strokeWidth={1.5} strokeLinejoin="round" strokeDasharray="4 2" />
    </svg>
  );
}

function ChartLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 mb-2">
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-1.5">
          <span className="h-2 w-5 rounded-full block" style={{ backgroundColor: it.color }} />
          <span className="text-[10px] text-muted-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Slider ────────────────────────────────────────────────────────────────────

function Slider({ label, value, min, max, step, format, onChange, hint }: {
  label: string; value: number; min: number; max: number; step: number;
  format: (v: number) => string; onChange: (v: number) => void; hint?: string;
}) {
  const pctFill = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="text-[12px] font-bold tabular-nums text-blue-400">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer accent-blue-500"
        style={{ background: `linear-gradient(to right, #3B82F6 ${pctFill}%, var(--color-border) 0%)` }} />
      {hint && <p className="text-[9px] text-muted-foreground/70 leading-tight">{hint}</p>}
    </div>
  );
}

// ── ScenarioCard ──────────────────────────────────────────────────────────────

function ScenarioCard({ s, active, onClick }: { s: FireScenario; active: boolean; onClick: () => void }) {
  const r = s.result;
  return (
    <button onClick={onClick} className={cn(
      "w-full rounded-xl border p-4 text-left transition-all",
      active ? "border-[2px] shadow-md" : "border-border bg-card hover:bg-card/80"
    )} style={active ? { borderColor: s.color, backgroundColor: s.color + "0D" } : undefined}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
        <span className="text-[13px] font-semibold text-foreground">{s.label}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Retorno real: {pct((1 + s.input.annualReturn) / (1 + s.input.annualInflation) - 1, 2)} aa
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["FIRE Target", formatCurrency(r.fireTarget)],
          ["Tempo", fmtYears(r.yearsToFire)],
          ["Idade FIRE", fmtAge(r.fireAge)],
          ["Aporte", formatCurrency(s.input.monthlyContribution + s.input.annualExtra / 12) + "/mês"],
        ].map(([l, v]) => (
          <div key={l}>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{l}</p>
            <p className="text-[12px] font-bold text-foreground tabular-nums mt-0.5">{v}</p>
          </div>
        ))}
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function FireClient({ data, error }: Props) {
  const defaults = React.useMemo((): FireInput => ({
    currentPatrimonio:   data?.currentPatrimonio   ?? 0,
    monthlyIncome:       data?.monthlyIncome       ?? 0,
    monthlyExpense:      data?.monthlyExpense       ?? 5_000,
    monthlyDividends:    data?.monthlyDividends     ?? 0,
    monthlyContribution: data?.defaultContribution  ?? 1_000,
    annualExtra:         0,
    annualReturn:        0.08,
    annualInflation:     0.04,
    safeWithdrawalRate:  0.04,
    currentAge:          35,
    targetAge:           55,
    targetMonthlyIncome: data?.monthlyExpense ?? 5_000,
  }), [data]);

  // ── Simulator state ──────────────────────────────────────────────────────
  const [contribution,  setContribution]  = React.useState(defaults.monthlyContribution);
  const [annualExtra,   setAnnualExtra]   = React.useState(defaults.annualExtra);
  const [annualReturn,  setAnnualReturn]  = React.useState(defaults.annualReturn);
  const [inflation,     setInflation]     = React.useState(defaults.annualInflation);
  const [swr,           setSwr]           = React.useState(defaults.safeWithdrawalRate);
  const [currentAge,    setCurrentAge]    = React.useState(defaults.currentAge);
  const [targetAge,     setTargetAge]     = React.useState(defaults.targetAge);
  const [targetIncome,  setTargetIncome]  = React.useState(defaults.targetMonthlyIncome);
  const [activeTab,     setActiveTab]     = React.useState<ActiveTab>("dashboard");
  const [activeScenKey, setActiveScenKey] = React.useState<string>("base");
  const [savedScenarios, setSavedScenarios] = React.useState<SavedScenario[]>([]);
  const [saveSuccess,  setSaveSuccess]  = React.useState(false);
  const [loadSuccess,  setLoadSuccess]  = React.useState<string | null>(null);
  const [activeScenId, setActiveScenId] = React.useState<string | null>(null);

  // Load saved scenarios + restore active scenario on mount
  React.useEffect(() => {
    const saved = loadSaved();
    setSavedScenarios(saved);
    const aid = loadActiveId();
    if (aid) {
      const active = saved.find(s => s.id === aid);
      if (active) {
        setContribution(active.input.monthlyContribution);
        setAnnualExtra(active.input.annualExtra);
        setAnnualReturn(active.input.annualReturn);
        setInflation(active.input.annualInflation);
        setSwr(active.input.safeWithdrawalRate);
        setCurrentAge(active.input.currentAge);
        setTargetAge(active.input.targetAge);
        setTargetIncome(active.input.targetMonthlyIncome);
        setActiveScenId(aid);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────────────
  const baseInput = React.useMemo((): FireInput => ({
    ...defaults,
    monthlyContribution: contribution,
    annualExtra,
    annualReturn,
    annualInflation: inflation,
    safeWithdrawalRate: swr,
    currentAge,
    targetAge,
    targetMonthlyIncome: targetIncome,
  }), [defaults, contribution, annualExtra, annualReturn, inflation, swr, currentAge, targetAge, targetIncome]);

  const baseResult  = React.useMemo(() => calcFire(baseInput), [baseInput]);
  const scenarios   = React.useMemo(() => calcScenarios(baseInput), [baseInput]);
  const indicators  = React.useMemo(
    () => calcIndicators(baseInput, baseResult, scenarios, data?.totalDebt ?? 0),
    [baseInput, baseResult, scenarios, data],
  );

  const realReturn = ((1 + annualReturn) / (1 + inflation) - 1) * 100;

  // ── Save scenario ────────────────────────────────────────────────────────
  function handleSave() {
    const name = `Cenário ${new Date().toLocaleDateString("pt-BR")} ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const ns: SavedScenario = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      input: baseInput,
      result: baseResult,
    };
    const next = [ns, ...savedScenarios].slice(0, 10);
    setSavedScenarios(next);
    persistSaved(next);
    // Define como cenário ativo
    setActiveScenId(ns.id);
    persistActiveId(ns.id);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  }
  // ── Load saved scenario ───────────────────────────────────────────────────
  function handleLoadSaved(s: SavedScenario) {
    setContribution(s.input.monthlyContribution);
    setAnnualExtra(s.input.annualExtra);
    setAnnualReturn(s.input.annualReturn);
    setInflation(s.input.annualInflation);
    setSwr(s.input.safeWithdrawalRate);
    setCurrentAge(s.input.currentAge);
    setTargetAge(s.input.targetAge);
    setTargetIncome(s.input.targetMonthlyIncome);
    setActiveScenId(s.id);
    persistActiveId(s.id);
    setLoadSuccess(s.id);
    setTimeout(() => setLoadSuccess(null), 2000);
  }
  function handleDeleteSaved(id: string) {
    const next = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(next);
    persistSaved(next);
  }

  const TABS: { key: ActiveTab; label: string }[] = [
    { key: "dashboard",   label: "Dashboard"   },
    { key: "cenarios",    label: "Cenários"    },
    { key: "graficos",    label: "Gráficos"    },
    { key: "indicadores", label: "Indicadores" },
  ];

  // Chart projection data — use base scenario
  const proj     = baseResult.projectionData;
  const projLabels = proj.map(p => `${p.age.toFixed(0)}`);

  const patrimonioSeries = scenarios.map(s => ({
    color: s.color, label: s.label,
    data:  s.result.projectionData.map(p => p.patrimonio),
  }));
  const incomeSeries = scenarios.map(s => ({
    color: s.color, label: s.label,
    data:  s.result.projectionData.map(p => p.passiveIncome),
  }));
  const divSeries = [{
    color: "#F59E0B", label: "Dividendos",
    data:  proj.map(p => p.dividends),
  }];

  const fiColor = FI_LEVEL_COLORS[indicators.fiLevel];
  const fiLabel = FI_LEVEL_LABELS[indicators.fiLevel];
  // Cor da barra de progresso: thresholds de percentual (0-25 red, 25-50 amber, 50-75 green, 75+ violet)
  const progressColor =
    baseResult.firePercentage >= 75 ? "#8b5cf6" :
    baseResult.firePercentage >= 50 ? "#10b981" :
    baseResult.firePercentage >= 25 ? "#f59e0b" :
    "#ef4444";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <Link
          href="/dashboard"
          className="flex w-fit items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
            <Flame className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-foreground leading-tight">FIRE Planner Premium</h1>
            <p className="text-[11px] text-muted-foreground">Financial Independence, Retire Early</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-[12px] text-destructive shrink-0">
          {error}
        </div>
      )}

      {/* Split layout */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">

        {/* LEFT — Simulator panel */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0">
          <div className="lg:sticky lg:top-4 rounded-xl border border-border bg-card shadow-[var(--shadow-card)] p-4 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-semibold text-foreground">Simulador</span>
              {activeScenId && (() => {
                const a = savedScenarios.find(s => s.id === activeScenId);
                return a ? (
                  <span className="ml-auto text-[9px] text-violet-400 truncate max-w-[120px]" title={a.name}>● {a.name}</span>
                ) : null;
              })()}
            </div>

            <Slider label="Aporte Mensal" value={contribution} min={0} max={30_000} step={100}
              format={formatCurrency} onChange={setContribution}
              hint="Valor investido todo mês" />

            <Slider label="Aporte Anual Extra" value={annualExtra} min={0} max={120_000} step={500}
              format={formatCurrency} onChange={setAnnualExtra}
              hint="13º salário, bônus, IR" />

            <Slider label="Rendimento Nominal" value={annualReturn} min={0.02} max={0.20} step={0.005}
              format={v => pct(v * 100)} onChange={setAnnualReturn}
              hint="Taxa antes da inflação" />

            <Slider label="Inflação Esperada" value={inflation} min={0.01} max={0.12} step={0.005}
              format={v => pct(v * 100)} onChange={setInflation} />

            {/* Rendimento real (computed display) */}
            <div className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Rendimento Real (calculado)</p>
              <p className={cn("text-[14px] font-bold tabular-nums mt-0.5",
                realReturn >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {pct(realReturn, 2)} aa
              </p>
            </div>

            <Slider label="Taxa de Retirada (SWR)" value={swr} min={0.02} max={0.08} step={0.005}
              format={v => pct(v * 100)} onChange={setSwr}
              hint="4% = regra padrão FIRE" />

            <Slider label="Idade Atual" value={currentAge} min={18} max={65} step={1}
              format={v => `${v} anos`} onChange={setCurrentAge} />

            <Slider label="Idade Alvo" value={targetAge} min={currentAge + 1} max={80} step={1}
              format={v => `${v} anos`} onChange={setTargetAge}
              hint="Quando quer atingir FIRE" />

            <Slider label="Renda Mensal Alvo" value={targetIncome} min={1_000} max={50_000} step={500}
              format={formatCurrency} onChange={setTargetIncome}
              hint="Renda desejada na aposentadoria" />

            {/* Quick summary */}
            <div className="border-t border-border/50 pt-3 grid grid-cols-2 gap-2">
              {[
                ["FIRE Target", formatCurrency(baseResult.fireTarget)],
                ["Tempo",       fmtYears(baseResult.yearsToFire)],
                ["Aporte total", formatCurrency(contribution + annualExtra / 12) + "/mês"],
                ["Retorno real", pct(realReturn, 1) + " aa"],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[9px] text-muted-foreground">{l}</p>
                  <p className="text-[11px] font-bold text-foreground tabular-nums">{v}</p>
                </div>
              ))}
            </div>

            {/* Salvar cenário ativo */}
            <button
              onClick={handleSave}
              className={cn(
                "w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold transition-all border",
                saveSuccess
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border-blue-500/20"
              )}>
              {saveSuccess
                ? <><CheckCircle2 className="h-3.5 w-3.5" />&nbsp;Cenário salvo e definido como ativo</>
                : <><BookmarkPlus className="h-3.5 w-3.5" />&nbsp;Salvar cenário</>}
            </button>
          </div>
        </div>

        {/* RIGHT — Tabs */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl border border-border bg-secondary/40 p-1 shrink-0">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-[11px] font-medium transition-all",
                  activeTab === t.key
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Dashboard ─────────────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div className="space-y-4">
              {/* FI Score + progress */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  <FIRing score={indicators.fiScore} level={fiLabel} size={130} />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Progresso até FIRE</p>
                      <p className="text-[28px] font-black tabular-nums text-foreground leading-none mt-0.5">
                        {pct(baseResult.firePercentage)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatCurrency(defaults.currentPatrimonio)} de {formatCurrency(baseResult.fireTarget)}
                      </p>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, baseResult.firePercentage)}%`,
                          background: `linear-gradient(to right, ${progressColor}CC, ${progressColor})`,
                        }} />
                    </div>
                    <div className="flex items-center gap-3">
                      {baseResult.willReachByTargetAge ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Atingirá FIRE antes dos {targetAge} anos
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                          <XCircle className="h-3.5 w-3.5" />
                          Meta não atingida até {targetAge} anos — patrimônio projetado: {formatCurrency(baseResult.patrimonioAtTargetAge)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 8 Metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Wallet,     color: "text-blue-400",    bg: "bg-blue-500/10",    label: "Patrimônio Atual",     value: formatCurrency(defaults.currentPatrimonio) },
                  { icon: Target,     color: "text-amber-400",   bg: "bg-amber-500/10",   label: "FIRE Target",          value: formatCurrency(baseResult.fireTarget) },
                  { icon: Clock,      color: "text-violet-400",  bg: "bg-violet-500/10",  label: "Tempo até FIRE",       value: fmtYears(baseResult.yearsToFire), sub: `Idade: ${fmtAge(baseResult.fireAge)}` },
                  { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Renda Passiva Atual",  value: formatCurrency(baseResult.currentPassiveIncome) + "/mês" },
                  { icon: PiggyBank,  color: "text-rose-400",    bg: "bg-rose-500/10",    label: "Taxa de Poupança",     value: pct(indicators.savingsRate) },
                  { icon: BarChart3,  color: "text-cyan-400",    bg: "bg-cyan-500/10",    label: "Patrimônio em 10 anos", value: formatCurrency(baseResult.projectedPatrimonio10y) },
                  { icon: Zap,        color: "text-orange-400",  bg: "bg-orange-500/10",  label: "Retirada Segura (SWR)", value: pct(swr * 100) },
                  { icon: LineChart,  color: "text-indigo-400",  bg: "bg-indigo-500/10",  label: "Renda Alvo",           value: formatCurrency(targetIncome) + "/mês" },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-card)]">
                    <div className={cn("mb-2 flex h-6 w-6 items-center justify-center rounded-lg", c.bg)}>
                      <c.icon className={cn("h-3 w-3", c.color)} />
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{c.label}</p>
                    <p className="mt-0.5 text-[14px] font-bold tabular-nums text-foreground leading-snug">{c.value}</p>
                    {c.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{c.sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Tab: Cenários ──────────────────────────────────────────────── */}
          {activeTab === "cenarios" && (
            <div className="space-y-4">
              <p className="text-[11px] text-muted-foreground px-1">
                Três cenários pré-calculados com base nos seus parâmetros atuais.
              </p>
              <div className="space-y-3">
                {scenarios.map(s => (
                  <ScenarioCard key={s.key} s={s} active={activeScenKey === s.key} onClick={() => setActiveScenKey(s.key)} />
                ))}
              </div>

              {/* Save */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">Salvar Cenário Atual</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Salva os parâmetros atuais no seu dispositivo</p>
                  </div>
                  <button onClick={handleSave}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all",
                      saveSuccess
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    )}>
                    {saveSuccess ? <CheckCircle2 className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                    {saveSuccess ? "Salvo!" : "Salvar"}
                  </button>
                </div>

                {savedScenarios.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Salvos ({savedScenarios.length})</p>
                    {savedScenarios.map(s => (
                      <div key={s.id} className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 transition-all",
                        activeScenId === s.id
                          ? "border-violet-500/40 bg-violet-500/10"
                          : "border-border/50 bg-secondary/30"
                      )}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            {activeScenId === s.id && (
                              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                            )}
                            <p className="text-[11px] font-medium text-foreground truncate">{s.name}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Target: {formatCurrency(s.result.fireTarget)} · {fmtYears(s.result.yearsToFire)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleLoadSaved(s)}
                          className={cn(
                            "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors whitespace-nowrap",
                            loadSuccess === s.id
                              ? "text-emerald-400 bg-emerald-500/10"
                              : activeScenId === s.id
                              ? "text-violet-400 bg-violet-500/10"
                              : "text-blue-400 hover:bg-blue-500/10"
                          )}>
                          {loadSuccess === s.id ? "✓ Ativo" : activeScenId === s.id ? "Ativo" : "Carregar"}
                        </button>
                        <button onClick={() => handleDeleteSaved(s.id)}
                          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Gráficos ──────────────────────────────────────────────── */}
          {activeTab === "graficos" && (
            <div className="space-y-4">
              {/* Chart 1: Patrimônio */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="text-[13px] font-semibold text-foreground mb-0.5">Evolução do Patrimônio</p>
                <p className="text-[10px] text-muted-foreground mb-2">Por cenário, em valores reais (descontada inflação)</p>
                <ChartLegend items={scenarios.map(s => ({ color: s.color, label: s.label }))} />
                <MultiLineChart series={patrimonioSeries} labels={projLabels}
                  targetLine={baseResult.fireTarget} targetLabel="FIRE Target" height={180} />
              </div>

              {/* Chart 2: Renda Passiva */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="text-[13px] font-semibold text-foreground mb-0.5">Renda Passiva Mensal</p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Retirada segura de {pct(swr * 100)} ao ano aplicada ao patrimônio projetado
                </p>
                <ChartLegend items={scenarios.map(s => ({ color: s.color, label: s.label }))} />
                <MultiLineChart series={incomeSeries} labels={projLabels}
                  targetLine={targetIncome} targetLabel="Meta" height={180} />
              </div>

              {/* Chart 3: Dividendos */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="text-[13px] font-semibold text-foreground mb-0.5">Dividendos Projetados</p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Baseado no yield atual da carteira — estimativa com crescimento proporcional ao patrimônio
                </p>
                <ChartLegend items={[{ color: "#F59E0B", label: "Dividendos mensais" }]} />
                <MultiLineChart series={divSeries} labels={projLabels} height={160} />
              </div>

              {/* Chart 4: Composição Patrimônio */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="text-[13px] font-semibold text-foreground mb-0.5">Composição — Aportes vs Juros</p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Laranja = aportes acumulados · Azul = ganho de juros (poder dos juros compostos)
                </p>
                <ChartLegend items={[
                  { color: "#F59E0B", label: "Aportes acumulados" },
                  { color: "#3B82F6", label: "Ganho de juros" },
                ]} />
                <StackedAreaChart projection={proj} height={180} />
              </div>
            </div>
          )}

          {/* ── Tab: Indicadores ───────────────────────────────────────────── */}
          {activeTab === "indicadores" && (
            <div className="space-y-4">
              {/* FI Score large */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-5">
                  <FIRing score={indicators.fiScore} level={fiLabel} size={110} />
                  <div className="flex-1">
                    <p className="text-[12px] font-semibold text-foreground mb-2">Níveis de FI Score</p>
                    {(["iniciante", "acumulando", "semi_fi", "fi", "fire"] as const).map(lvl => (
                      <div key={lvl} className="flex items-center gap-2 mb-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: FI_LEVEL_COLORS[lvl] }} />
                        <span className="text-[10px] text-muted-foreground w-20">{FI_LEVEL_LABELS[lvl]}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {lvl === "iniciante" ? "0–25%" : lvl === "acumulando" ? "25–50%" : lvl === "semi_fi" ? "50–75%" : lvl === "fi" ? "75–100%" : "≥ 100%"}
                        </span>
                        {indicators.fiLevel === lvl && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wide" style={{ color: FI_LEVEL_COLORS[lvl] }}>
                            ← você
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 5 Indicator cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: Trophy,
                    color: "text-amber-400", bg: "bg-amber-500/10",
                    label: "Probabilidade de Atingir FIRE",
                    value: `${indicators.probability}%`,
                    desc: `${scenarios.filter(s => s.result.yearsToFire <= 40).length} de 3 cenários atingem FIRE em até 40 anos`,
                  },
                  {
                    icon: Zap,
                    color: "text-violet-400", bg: "bg-violet-500/10",
                    label: "Tempo Economizado por Aporte Extra",
                    value: annualExtra > 0 ? `${indicators.timeSavedByExtra} meses` : "—",
                    desc: annualExtra > 0
                      ? `Aporte extra de ${formatCurrency(annualExtra)}/ano economiza ${(indicators.timeSavedByExtra / 12).toFixed(1)} anos`
                      : "Configure um aporte anual extra para ver o impacto",
                  },
                  {
                    icon: Target,
                    color: "text-rose-400", bg: "bg-rose-500/10",
                    label: "Quanto Falta para FIRE",
                    value: formatCurrency(indicators.remainingToTarget),
                    desc: `${pct(baseResult.firePercentage)} do caminho concluído`,
                  },
                  {
                    icon: Wallet,
                    color: "text-emerald-400", bg: "bg-emerald-500/10",
                    label: "Quanto Pode Gastar Hoje",
                    value: formatCurrency(indicators.safeMonthlySpend) + "/mês",
                    desc: `≈ ${formatCurrency(indicators.safeDailySpend)}/dia · baseado no seu patrimônio atual e SWR de ${pct(swr * 100)}`,
                  },
                  {
                    icon: BarChart3,
                    color: "text-blue-400", bg: "bg-blue-500/10",
                    label: "Patrimônio Líquido",
                    value: formatCurrency(indicators.netPatrimonio),
                    desc: `Patrimônio total − dívidas em cartão (${formatCurrency(data?.totalDebt ?? 0)})`,
                  },
                ].map(c => (
                  <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                    <div className={cn("mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl", c.bg)}>
                      <c.icon className={cn("h-4 w-4", c.color)} />
                    </div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
                    <p className="text-[20px] font-black tabular-nums text-foreground mt-1 leading-tight">{c.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{c.desc}</p>
                  </div>
                ))}
              </div>

              {/* Detail table */}
              <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-[12px] font-semibold text-foreground">Indicadores Detalhados — Cenário Base</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <tbody>
                      {[
                        ["Taxa de Poupança", pct(indicators.savingsRate)],
                        ["Retorno Real Anual", pct(indicators.realReturn, 2)],
                        ["Renda Passiva Atual", formatCurrency(indicators.safeMonthlySpend) + "/mês"],
                        ["Gasto Seguro Diário", formatCurrency(indicators.safeDailySpend) + "/dia"],
                        ["Patrimônio em 10 anos", formatCurrency(baseResult.projectedPatrimonio10y)],
                        ["Patrimônio em 20 anos", formatCurrency(baseResult.projectedPatrimonio20y)],
                        ["Patrimônio na Idade Alvo", formatCurrency(baseResult.patrimonioAtTargetAge)],
                        ["Atingirá FIRE até idade alvo?", baseResult.willReachByTargetAge ? "✓ Sim" : "✗ Não"],
                      ].map(([l, v]) => (
                        <tr key={l} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-2.5 text-muted-foreground">{l}</td>
                          <td className="px-4 py-2.5 font-semibold tabular-nums text-foreground text-right">{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
