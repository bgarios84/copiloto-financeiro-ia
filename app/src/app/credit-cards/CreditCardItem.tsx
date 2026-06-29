"use client";

import * as React from "react";
import { Pencil, Trash2, Loader2, Calendar, AlertCircle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { CARD_BRAND_LABELS } from "@/types/credit-card";
import type { CreditCard } from "@/types/credit-card";

// ── Brand logo text ───────────────────────────────────────────────────────────

function BrandBadge({ brand }: { brand: CreditCard["brand"] }) {
  if (!brand) return null;
  return (
    <span className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80">
      {CARD_BRAND_LABELS[brand]}
    </span>
  );
}

// ── Usage bar ─────────────────────────────────────────────────────────────────

function LimitBar({ used, total }: { used: number; total: number }) {
  if (total <= 0) return null;
  const pct = Math.min(100, Math.round(((total - used) / total) * 100));
  // pct = % do limite JÁ USADO  (available_limit = quanto sobra)
  const usedPct = 100 - pct;

  const barColor =
    usedPct < 60 ? "bg-emerald-400" : usedPct < 85 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-white/60">Limite disponível</span>
        <span className="text-[10px] font-semibold text-white/80">{pct}%</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CreditCardItemProps {
  card: CreditCard;
  onEdit: (card: CreditCard) => void;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CreditCardItem({ card, onEdit, onDelete, deleting = false }: CreditCardItemProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const color = card.color ?? "#1E293B";

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(card.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }

  React.useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl p-5 transition-all duration-200",
        "shadow-lg hover:shadow-xl hover:-translate-y-0.5",
        !card.is_active && "opacity-60",
        deleting && "opacity-40 pointer-events-none"
      )}
      style={{
        background: `linear-gradient(135deg, ${color}ee 0%, ${color} 100%)`,
      }}
    >
      {/* Inactive badge */}
      {!card.is_active && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
          <AlertCircle className="h-3 w-3 text-white/70" />
          <span className="text-[10px] text-white/70">Inativo</span>
        </div>
      )}

      {/* Actions — hover */}
      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(card)}
          disabled={deleting}
          aria-label="Editar cartão"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleDeleteClick}
          disabled={deleting}
          aria-label={confirmDelete ? "Confirmar exclusão" : "Excluir cartão"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-sm transition-colors",
            confirmDelete
              ? "bg-rose-500/60 text-white hover:bg-rose-500/80"
              : "bg-white/10 text-white/80 hover:bg-white/20"
          )}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Top row: institution + brand */}
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-medium text-white/70">
          {card.institution?.name ?? "Sem instituição"}
        </p>
        <BrandBadge brand={card.brand} />
      </div>

      {/* Card name */}
      <p className="mt-3 text-[16px] font-bold text-white">
        {card.name}
      </p>

      {/* Last four */}
      {card.last_four && (
        <p className="mt-0.5 font-mono text-[13px] tracking-[0.2em] text-white/60">
          •••• •••• •••• {card.last_four}
        </p>
      )}

      {/* Limit bar */}
      <LimitBar used={card.credit_limit - card.available_limit} total={card.credit_limit} />

      {/* Bottom row */}
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-white/50">Limite total</p>
          <p className="text-[15px] font-bold text-white">
            {formatCurrency(card.credit_limit)}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/60">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Fecha dia {card.closing_day}
          </span>
          <span>Vence dia {card.due_day}</span>
        </div>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <p className="mt-2 text-[11px] text-white/80">
          Clique novamente para confirmar a exclusão.
        </p>
      )}
    </div>
  );
}
