/**
 * Types — Financial Account Module
 * Sprint 5.1
 */

// ── Institution ───────────────────────────────────────────────────────────────

export interface Institution {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  color: string | null;
  is_active: boolean;
}

// ── Financial Account ─────────────────────────────────────────────────────────

export type AccountType = "checking" | "savings" | "investment" | "wallet" | "cash";

export interface FinancialAccount {
  id: string;
  user_id: string;
  institution_id: string | null;
  name: string;
  type: AccountType;
  currency: string;
  balance: number;
  balance_updated_at: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  is_manual: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // joined
  institution?: Institution | null;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export interface AccountFormData {
  name: string;
  institution_id: string;
  type: AccountType;
  balance: string;        // string para input, parseado antes de enviar
  currency: string;
  color: string;
  icon: string;
  notes: string;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking:   "Conta Corrente",
  savings:    "Poupança",
  investment: "Investimento",
  wallet:     "Carteira Digital",
  cash:       "Dinheiro",
};

export const ACCOUNT_COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EF4444", // red
  "#F97316", // orange
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#6366F1", // indigo
  "#14B8A6", // teal
  "#94A3B8", // slate
] as const;

export const ACCOUNT_ICONS = [
  { value: "wallet",      label: "Carteira"     },
  { value: "landmark",    label: "Banco"        },
  { value: "credit-card", label: "Cartão"       },
  { value: "piggy-bank",  label: "Poupança"     },
  { value: "trending-up", label: "Investimento" },
  { value: "coins",       label: "Dinheiro"     },
  { value: "building-2",  label: "Instituição"  },
  { value: "briefcase",   label: "Negócio"      },
] as const;

export const CURRENCIES = [
  { value: "BRL", label: "R$ — Real Brasileiro"    },
  { value: "USD", label: "$ — Dólar Americano"     },
  { value: "EUR", label: "€ — Euro"                },
  { value: "GBP", label: "£ — Libra Esterlina"     },
  { value: "BTC", label: "₿ — Bitcoin"             },
] as const;

// ── Service response ──────────────────────────────────────────────────────────

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };
