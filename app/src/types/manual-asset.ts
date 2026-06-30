/**
 * Types — Manual Asset
 * Sprint 6.1 — Patrimônio Manual
 */

// ── Asset types ────────────────────────────────────────────────────────────────

export type AssetType =
  | "cash"
  | "real_estate"
  | "vehicle"
  | "fixed_income"
  | "stock"
  | "fii"
  | "crypto"
  | "other";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  cash:         "Dinheiro",
  real_estate:  "Imóvel",
  vehicle:      "Veículo",
  fixed_income: "Renda Fixa",
  stock:        "Ações",
  fii:          "FII",
  crypto:       "Cripto",
  other:        "Outro",
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  cash:         "💵",
  real_estate:  "🏠",
  vehicle:      "🚗",
  fixed_income: "📊",
  stock:        "📈",
  fii:          "🏢",
  crypto:       "₿",
  other:        "💎",
};

export const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  cash:         "#10b981",
  real_estate:  "#3b82f6",
  vehicle:      "#f59e0b",
  fixed_income: "#8b5cf6",
  stock:        "#ef4444",
  fii:          "#06b6d4",
  crypto:       "#f97316",
  other:        "#6b7280",
};

// ── Table row ──────────────────────────────────────────────────────────────────

export interface ManualAsset {
  id:                string;
  user_id:           string;
  name:              string;
  asset_type:        AssetType;
  current_value:     number;
  currency:          string;
  acquisition_value: number | null;
  acquisition_date:  string | null;   // "YYYY-MM-DD"
  custodian:         string | null;
  notes:             string | null;
  created_at:        string;
  updated_at:        string;
  deleted_at:        string | null;
}

// ── Form ───────────────────────────────────────────────────────────────────────

export interface ManualAssetFormData {
  name:              string;
  asset_type:        AssetType;
  current_value:     string;   // string para input controlado
  currency:          string;
  acquisition_value: string;   // string, vazio = NULL
  acquisition_date:  string;   // "YYYY-MM-DD", vazio = NULL
  custodian:         string;
  notes:             string;
}

// ── Aggregation ────────────────────────────────────────────────────────────────

export interface AssetByType {
  asset_type: AssetType;
  total:      number;
  count:      number;
  percentage: number;
}

// ── Shared ─────────────────────────────────────────────────────────────────────

export type { ServiceResult } from "./common";
