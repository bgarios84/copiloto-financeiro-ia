"use client";

import * as React from "react";
import { Plus, Search, CreditCard } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { EmptyState } from "@/components/feedback/EmptyState";
import { deleteCard } from "@/services/credit-card";
import { CreditCardItem } from "./CreditCardItem";
import { CreditCardFormModal } from "./CreditCardFormModal";
import type { CreditCard as CreditCardType } from "@/types/credit-card";
import type { Institution } from "@/types/financial-account";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CreditCardsClientProps {
  initialCards: CreditCardType[];
  institutions: Institution[];
}

// ── Summary card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: "blue" | "violet" | "emerald";
}) {
  const colors = {
    blue:    "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    violet:  "from-violet-500/10 to-violet-600/5 border-violet-500/20",
    emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
  };
  const textColors = {
    blue:    "text-blue-600 dark:text-blue-400",
    violet:  "text-violet-600 dark:text-violet-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className={cn("rounded-xl border bg-gradient-to-br p-4", colors[color])}>
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-[20px] font-bold tabular-nums", textColors[color])}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function CreditCardsClient({ initialCards, institutions }: CreditCardsClientProps) {
  const [cards, setCards] = React.useState<CreditCardType[]>(initialCards);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<CreditCardType | null>(null);
  const [deletingIds, setDeletingIds] = React.useState<Set<string>>(new Set());
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  // ── Derived ──────────────────────────────────────────────────────────────

  const activeCards = cards.filter((c) => c.is_active);
  const totalLimit = activeCards.reduce((s, c) => s + c.credit_limit, 0);
  const totalAvailable = activeCards.reduce((s, c) => s + c.available_limit, 0);

  const filtered = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.institution?.name.toLowerCase().includes(q) ||
        (c.brand ?? "").toLowerCase().includes(q) ||
        (c.last_four ?? "").includes(q)
    );
  }, [cards, search]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCard(null);
    setModalOpen(true);
  }

  function openEdit(card: CreditCardType) {
    setEditingCard(card);
    setModalOpen(true);
  }

  function handleSuccess(card: CreditCardType) {
    setCards((prev) => {
      const idx = prev.findIndex((c) => c.id === card.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = card;
        return next;
      }
      return [...prev, card];
    });
    setGlobalError(null);
  }

  async function handleDelete(id: string) {
    setDeletingIds((s) => new Set(s).add(id));
    setGlobalError(null);
    const result = await deleteCard(id);
    if (result.error) {
      setGlobalError(result.error);
    } else {
      setCards((prev) => prev.filter((c) => c.id !== id));
    }
    setDeletingIds((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-foreground">Cartões de Crédito</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {cards.length === 0
              ? "Adicione seu primeiro cartão."
              : `${cards.length} cartão${cards.length > 1 ? "ões" : ""} cadastrado${cards.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={openCreate}
          className={cn(
            "flex h-9 shrink-0 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white",
            "bg-gradient-to-r from-blue-500 to-violet-600 transition-opacity hover:opacity-90"
          )}
        >
          <Plus className="h-4 w-4" />
          Novo cartão
        </button>
      </div>

      {/* Summary */}
      {cards.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Cartões ativos"
            value={String(activeCards.length)}
            sub={`de ${cards.length} cadastrado${cards.length > 1 ? "s" : ""}`}
            color="blue"
          />
          <SummaryCard
            label="Limite total"
            value={formatCurrency(totalLimit)}
            color="violet"
          />
          <SummaryCard
            label="Limite disponível"
            value={formatCurrency(totalAvailable)}
            sub={totalLimit > 0 ? `${Math.round((totalAvailable / totalLimit) * 100)}% livre` : undefined}
            color="emerald"
          />
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          <span>{globalError}</span>
          <button onClick={() => setGlobalError(null)} className="ml-3 font-medium underline underline-offset-2">
            Fechar
          </button>
        </div>
      )}

      {/* Search */}
      {cards.length > 0 && (
        <div className="mb-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, banco, bandeira ou dígitos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-background pl-9 pr-4 py-2",
              "text-[13px] text-foreground placeholder:text-muted-foreground/60",
              "focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring transition-colors"
            )}
          />
        </div>
      )}

      {/* Content */}
      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhum cartão cadastrado"
          description="Adicione seus cartões de crédito para acompanhar limites, faturas e gastos."
          action={{ label: "Adicionar cartão", onClick: openCreate }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum cartão encontrado"
          description={`Nenhum resultado para "${search}".`}
          action={{ label: "Limpar busca", onClick: () => setSearch("") }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((card) => (
            <CreditCardItem
              key={card.id}
              card={card}
              onEdit={openEdit}
              onDelete={handleDelete}
              deleting={deletingIds.has(card.id)}
            />
          ))}
        </div>
      )}

      <CreditCardFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
        institutions={institutions}
        card={editingCard}
      />
    </>
  );
}
