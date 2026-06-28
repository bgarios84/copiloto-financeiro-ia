"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Route label map ───────────────────────────────────────────

const ROUTE_LABELS: Record<string, string> = {
  dashboard:    "Dashboard",
  transactions: "Transações",
  investments:  "Investimentos",
  portfolio:    "Portfólio",
  budget:       "Orçamento",
  reports:      "Relatórios",
  settings:     "Configurações",
  alerts:       "Alertas",
  ai:           "Copiloto IA",
};

function getLabel(segment: string): string {
  return ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1);
}

// ── Component ─────────────────────────────────────────────────

export function AppBreadcrumb() {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        {/* Home */}
        <li>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {segments.map((segment, index) => {
          const href = "/" + segments.slice(0, index + 1).join("/");
          const isLast = index === segments.length - 1;
          const label = getLabel(segment);

          return (
            <React.Fragment key={href}>
              <li aria-hidden>
                <ChevronRight className="h-3 w-3 opacity-40" />
              </li>
              <li>
                {isLast ? (
                  <span
                    aria-current="page"
                    className={cn(
                      "font-medium text-foreground",
                      "max-w-[160px] truncate block"
                    )}
                  >
                    {label}
                  </span>
                ) : (
                  <Link
                    href={href}
                    className="transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
