/**
 * Types — Credit Card Module
 * Sprint 5.2 / 5.2A (multi-moeda)
 */

import type { Institution } from "./financial-account";

// ── Credit Card ───────────────────────────────────────────────────────────────

export type CardBrand = "visa" | "mastercard" | "elo" | "amex" | "hipercard" | "other";

export interface CreditCard {
  id: string;
  user_id: string;
  institution_id: string | null;
  name: string;
  brand: CardBrand | null;
  last_four: string | null;
  credit_limit: number;
  available_limit: number;
  currency: string;
  closing_day: number;
  due_day: number;
  color: string | null;
  is_active: boolean;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Open Finance
  of_connection_id: string | null;
  of_account_id:    string | null;
  // joined
  institution?: Institution | null;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export interface CreditCardFormData {
  name: string;
  institution_id: string;
  brand: CardBrand | "";
  last_four: string;
  credit_limit: string;   // string para input, parseado antes de enviar
  currency: string;
  closing_day: string;
  due_day: string;
  color: string;
  is_active: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const CARD_BRAND_LABELS: Record<CardBrand, string> = {
  visa:       "Visa",
  mastercard: "Mastercard",
  elo:        "Elo",
  amex:       "American Express",
  hipercard:  "Hipercard",
  other:      "Outra",
};

export const CARD_COLORS = [
  "#1E293B",
  "#1D4ED8",
  "#7C3AED",
  "#0F766E",
  "#B45309",
  "#9F1239",
  "#15803D",
  "#C2410C",
  "#1E40AF",
  "#6D28D9",
  "#0369A1",
  "#374151",
] as const;

export const CARD_CURRENCIES = [
  { value: "BRL", label: "R$ - Real Brasileiro"    },
  { value: "USD", label: "$ - Dolar Americano"     },
  { value: "EUR", label: "EUR - Euro"              },
  { value: "GBP", label: "GBP - Libra Esterlina"  },
] as const;

export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: "Dia " + String(i + 1),
}));

// ── Service response ─────────────────────────────────────────────
export type { ServiceResult } from "./common";
