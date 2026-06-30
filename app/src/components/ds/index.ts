/**
 * Design System — Copiloto Financeiro IA
 * Sprint 10.2 — Premium dark-only token constants
 *
 * Usage:
 *   import { DS } from "@/components/ds";
 *   <div className={DS.CARD}>...</div>
 *
 * All tokens are explicit dark zinc classes — no `dark:` prefixes, no CSS variables.
 * This guarantees a consistent premium dark look regardless of system theme.
 */

// ── Cards ──────────────────────────────────────────────────────────────────────

export const CARD        = "rounded-xl border border-zinc-800 bg-zinc-900/60 p-4";
export const CARD_HOVER  = "rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 transition-colors hover:bg-zinc-900/80 hover:border-zinc-700";

// ── Modal ──────────────────────────────────────────────────────────────────────

export const MODAL_OVERLAY = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm";
export const MODAL_PANEL   = "rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto";
export const MODAL_HEADER  = "flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10";
export const MODAL_TITLE   = "text-[15px] font-bold text-zinc-100";
export const MODAL_BODY    = "px-5 py-5 space-y-5";
export const MODAL_FOOTER  = "flex gap-3 pt-1";

// ── Table ──────────────────────────────────────────────────────────────────────

export const TABLE_WRAPPER    = "rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden";
export const TABLE_HEADER_ROW = "border-b border-zinc-800 bg-zinc-800/60";
export const TABLE_TH         = "px-3 py-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider";
export const TABLE_TH_LEFT    = "px-4 py-3 text-left text-[11px] font-semibold text-zinc-500 uppercase tracking-wider";
export const TABLE_TH_RIGHT   = "px-3 py-3 text-right text-[11px] font-semibold text-zinc-500 uppercase tracking-wider";
export const TABLE_ROW        = "group border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors";
export const TABLE_TD         = "px-3 py-3 text-[13px] text-zinc-400";
export const TABLE_TD_MAIN    = "px-4 py-3 text-[13px] font-semibold text-zinc-100";

// ── Buttons ────────────────────────────────────────────────────────────────────

export const BTN_PRIMARY   = "flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const BTN_PRIMARY_LG = "flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
export const BTN_SECONDARY = "flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 text-[13px] font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50";
export const BTN_GHOST     = "flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-400 text-[13px] hover:text-zinc-200 hover:bg-zinc-800 transition-colors";
export const BTN_DANGER    = "flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-[13px] font-medium hover:bg-red-500/30 transition-colors";
export const BTN_ICON      = "p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors";
export const BTN_ICON_DANGER_CONFIRM = "p-1.5 rounded-lg bg-red-500/20 text-red-400 transition-colors";
export const BTN_ICON_DANGER_IDLE    = "p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition-colors";

// ── Form inputs ────────────────────────────────────────────────────────────────

export const INPUT = "w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 text-[13px] placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition";
export const LABEL = "block text-[12px] font-medium text-zinc-400 mb-1";
export const SELECT = "w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition appearance-none";
export const TEXTAREA = "w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 text-[13px] placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60 transition resize-none";
export const SEARCH_INPUT = "h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800/60 pl-9 pr-4 py-2 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/60 transition-colors";

// ── Alerts / Feedback ──────────────────────────────────────────────────────────

export const ALERT_ERROR   = "flex items-center gap-2 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-[13px] text-red-400";
export const ALERT_WARNING = "flex items-center gap-2 px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-500/10 text-[13px] text-amber-400";
export const ALERT_SUCCESS = "flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-[13px] text-emerald-400";
export const ALERT_INFO    = "flex items-center gap-2 px-3 py-2.5 rounded-lg border border-blue-500/25 bg-blue-500/10 text-[12px] text-blue-400";

// ── Empty state ────────────────────────────────────────────────────────────────

export const EMPTY_WRAPPER  = "flex flex-col items-center justify-center py-16 text-center rounded-xl border border-zinc-800 bg-zinc-900/40";
export const EMPTY_ICON_BOX = "mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800";
export const EMPTY_TITLE    = "text-[14px] font-medium text-zinc-300";
export const EMPTY_DESC     = "mt-1 text-[12px] text-zinc-500";

// ── Badges ─────────────────────────────────────────────────────────────────────

export const BADGE_DEFAULT = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-800 text-zinc-400";
export const BADGE_BLUE    = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/15 text-blue-400";
export const BADGE_GREEN   = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-400";
export const BADGE_AMBER   = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400";
export const BADGE_RED     = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-400";
export const BADGE_VIOLET  = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-500/15 text-violet-400";

// ── Typography ─────────────────────────────────────────────────────────────────

export const PAGE_TITLE    = "text-[22px] font-bold text-zinc-100";
export const PAGE_SUBTITLE = "mt-0.5 text-[13px] text-zinc-500";
export const SECTION_TITLE = "text-[13px] font-semibold text-zinc-300";
export const TEXT_MUTED    = "text-[13px] text-zinc-500";
export const TEXT_BODY     = "text-[13px] text-zinc-300";

// ── Divider ────────────────────────────────────────────────────────────────────

export const DIVIDER = "border-t border-zinc-800";

// ── Spinner ────────────────────────────────────────────────────────────────────

export const SPINNER = "h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500";

// ── Namespace export ───────────────────────────────────────────────────────────

export const DS = {
  CARD, CARD_HOVER,
  MODAL_OVERLAY, MODAL_PANEL, MODAL_HEADER, MODAL_TITLE, MODAL_BODY, MODAL_FOOTER,
  TABLE_WRAPPER, TABLE_HEADER_ROW, TABLE_TH, TABLE_TH_LEFT, TABLE_TH_RIGHT,
  TABLE_ROW, TABLE_TD, TABLE_TD_MAIN,
  BTN_PRIMARY, BTN_PRIMARY_LG, BTN_SECONDARY, BTN_GHOST, BTN_DANGER,
  BTN_ICON, BTN_ICON_DANGER_CONFIRM, BTN_ICON_DANGER_IDLE,
  INPUT, LABEL, SELECT, TEXTAREA, SEARCH_INPUT,
  ALERT_ERROR, ALERT_WARNING, ALERT_SUCCESS, ALERT_INFO,
  EMPTY_WRAPPER, EMPTY_ICON_BOX, EMPTY_TITLE, EMPTY_DESC,
  BADGE_DEFAULT, BADGE_BLUE, BADGE_GREEN, BADGE_AMBER, BADGE_RED, BADGE_VIOLET,
  PAGE_TITLE, PAGE_SUBTITLE, SECTION_TITLE, TEXT_MUTED, TEXT_BODY,
  DIVIDER, SPINNER,
} as const;
