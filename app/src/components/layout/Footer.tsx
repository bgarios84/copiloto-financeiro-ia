import * as React from "react";
import { LAYOUT } from "@/shared/constants/theme";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      style={{ height: LAYOUT.footer.height }}
      className="flex w-full shrink-0 items-center justify-between border-t border-border bg-background/80 px-5"
    >
      <span className="text-[11px] text-muted-foreground/60">
        © {year} Copiloto Financeiro IA
      </span>
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-[11px] text-muted-foreground/40">
          Dados simulados · Não constitui aconselhamento financeiro
        </span>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          v0.1.0-beta
        </span>
      </div>
    </footer>
  );
}
