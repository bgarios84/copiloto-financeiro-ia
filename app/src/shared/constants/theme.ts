/**
 * Design Tokens — Copiloto Financeiro IA
 *
 * Arquivo único de constantes de tema.
 * Use estes tokens em vez de valores hardcoded.
 * Os valores CSS correspondentes estão em src/app/globals.css
 */

// ── Colors ──────────────────────────────────────────────────

export const COLORS = {
  // Brand
  primary: {
    light: "#1E40AF",
    dark: "#3B82F6",
    foreground: "#FFFFFF",
  },
  accent: {
    light: "#10B981",
    dark: "#34D399",
    foreground: "#FFFFFF",
  },

  // Backgrounds
  background: {
    light: "#FAFAFA",
    dark: "#0A0F1E",
  },
  card: {
    light: "#FFFFFF",
    dark: "#0F172A",
  },
  sidebar: {
    light: "#0F172A",
    dark: "#080D1A",
  },
  muted: {
    light: "#F1F5F9",
    dark: "#1E293B",
  },

  // Foregrounds
  foreground: {
    light: "#0F172A",
    dark: "#E2E8F0",
  },
  mutedForeground: {
    light: "#64748B",
    dark: "#94A3B8",
  },

  // Semantic
  semantic: {
    success: { light: "#10B981", dark: "#34D399" },
    warning: { light: "#F59E0B", dark: "#FCD34D" },
    error:   { light: "#EF4444", dark: "#F87171" },
    info:    { light: "#3B82F6", dark: "#60A5FA" },
  },

  // Borders
  border: {
    light: "#E2E8F0",
    dark: "#1E293B",
  },
} as const;

// ── Typography ───────────────────────────────────────────────

export const TYPOGRAPHY = {
  fontFamily: {
    sans: "Inter, ui-sans-serif, system-ui, sans-serif",
    mono: 'ui-monospace, "Cascadia Code", monospace',
  },

  fontSize: {
    xs:   "0.75rem",   // 12px
    sm:   "0.875rem",  // 14px
    base: "1rem",      // 16px
    lg:   "1.125rem",  // 18px
    xl:   "1.25rem",   // 20px
    "2xl": "1.5rem",   // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem",  // 36px
    "5xl": "3rem",     // 48px
  },

  fontWeight: {
    regular:   "400",
    medium:    "500",
    semibold:  "600",
    bold:      "700",
    extrabold: "800",
  },

  lineHeight: {
    tight:   "1.25",
    snug:    "1.375",
    normal:  "1.5",
    relaxed: "1.625",
    loose:   "2",
  },
} as const;

// ── Spacing (4px grid) ───────────────────────────────────────

export const SPACING = {
  px:    "1px",
  0:     "0",
  0.5:   "0.125rem",  // 2px
  1:     "0.25rem",   // 4px
  1.5:   "0.375rem",  // 6px
  2:     "0.5rem",    // 8px
  2.5:   "0.625rem",  // 10px
  3:     "0.75rem",   // 12px
  3.5:   "0.875rem",  // 14px
  4:     "1rem",      // 16px
  5:     "1.25rem",   // 20px
  6:     "1.5rem",    // 24px
  7:     "1.75rem",   // 28px
  8:     "2rem",      // 32px
  10:    "2.5rem",    // 40px
  12:    "3rem",      // 48px
  16:    "4rem",      // 64px
  20:    "5rem",      // 80px
  24:    "6rem",      // 96px
  32:    "8rem",      // 128px
} as const;

// ── Border Radius ────────────────────────────────────────────

export const RADIUS = {
  none: "0",
  xs:   "0.125rem",  // 2px
  sm:   "0.25rem",   // 4px
  md:   "0.375rem",  // 6px
  lg:   "0.5rem",    // 8px
  xl:   "0.75rem",   // 12px
  "2xl": "1rem",     // 16px
  "3xl": "1.5rem",   // 24px
  full: "9999px",
} as const;

// ── Shadows ──────────────────────────────────────────────────

export const SHADOWS = {
  xs:   "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm:   "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md:   "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg:   "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl:   "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
  none: "none",
} as const;

// ── Layout ───────────────────────────────────────────────────

export const LAYOUT = {
  sidebar: {
    width:     "16rem",   // 256px
    collapsed: "4rem",    // 64px
  },
  header: {
    height: "3.5rem",     // 56px
  },
  footer: {
    height: "3rem",       // 48px
  },
  content: {
    maxWidth: "90rem",    // 1440px
    padding:  "1.5rem",  // 24px
  },
} as const;

// ── Breakpoints ──────────────────────────────────────────────

export const BREAKPOINTS = {
  sm:  "640px",
  md:  "768px",
  lg:  "1024px",
  xl:  "1280px",
  "2xl": "1536px",
} as const;

// ── Animation ────────────────────────────────────────────────

export const ANIMATION = {
  duration: {
    fast:   "150ms",
    normal: "200ms",
    slow:   "300ms",
    slower: "500ms",
  },
  easing: {
    default:  "cubic-bezier(0.4, 0, 0.2, 1)",
    in:       "cubic-bezier(0.4, 0, 1, 1)",
    out:      "cubic-bezier(0, 0, 0.2, 1)",
    inOut:    "cubic-bezier(0.4, 0, 0.2, 1)",
  },
} as const;

// ── Z-index ──────────────────────────────────────────────────

export const Z_INDEX = {
  base:    0,
  raised:  10,
  dropdown: 100,
  sticky:  200,
  overlay: 300,
  modal:   400,
  toast:   500,
  tooltip: 600,
} as const;
