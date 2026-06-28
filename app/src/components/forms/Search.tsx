"use client";

import * as React from "react";
import { Search as SearchIcon, X, Command } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  /** Keyboard shortcut hint displayed at the right, e.g. "⌘K" */
  shortcut?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Search — search input with clear button and optional keyboard shortcut hint.
 *
 * Usage:
 * ```tsx
 * <Search
 *   placeholder="Buscar transações..."
 *   value={query}
 *   onChange={setQuery}
 *   shortcut="⌘K"
 * />
 * ```
 */
export function Search({
  placeholder = "Pesquisar...",
  value,
  onChange,
  onClear,
  shortcut,
  className,
  autoFocus,
}: SearchProps) {
  const [internalValue, setInternalValue] = React.useState("");
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternalValue(e.target.value);
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    if (!controlled) setInternalValue("");
    onChange?.("");
    onClear?.();
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <SearchIcon className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-muted-foreground" />

      <input
        type="search"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          "h-9 w-full rounded-lg border border-border bg-secondary/60 pl-9 pr-3 py-2",
          "text-[13px] text-foreground placeholder:text-muted-foreground/60",
          "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring focus:bg-background",
          currentValue && "pr-8",
          shortcut && !currentValue && "pr-14"
        )}
      />

      {currentValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Limpar pesquisa"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : shortcut ? (
        <kbd className="absolute right-2.5 flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground/60 pointer-events-none">
          <Command className="h-2.5 w-2.5" />
          <span>{shortcut.replace("⌘", "")}</span>
        </kbd>
      ) : null}
    </div>
  );
}
