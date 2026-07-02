"use client";

/**
 * Sidebar — Sprint 12.10
 *
 * Nav agrupada por contexto (sem "Ações Rápidas"):
 *   Principal     → Hoje (/dashboard), FIRE (/fire)
 *   Financeiro    → Patrimônio (/wealth), Contas (/accounts), Cartões (/credit-cards),
 *                   Transações (/transactions), Investimentos (/investments)
 *   Planejamento  → Orçamentos (/budgets), Health Score (/health)
 *   Monitoramento → Timeline (/timeline)
 */

import * as React from "react";
import Link  from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  TrendingUp,
  CreditCard,
  Activity,
  HeartPulse,
  PiggyBank,
  Receipt,
  Settings,
  ChevronRight,
  ChevronLeft,
  Flame,
  Sparkles,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

// ── Types ──────────────────────────────────────────────────────

interface NavItem {
  label:  string;
  href:   string;
  icon:   React.ElementType;
  badge?: string | number;
  spark?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ── Nav config ─────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Principal",
    items: [
      { label: "Hoje", href: "/dashboard", icon: Home, spark: true },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Patrimônio",    href: "/wealth",       icon: Landmark   },
      { label: "Contas",        href: "/accounts",     icon: Wallet     },
      { label: "Cartões",       href: "/credit-cards", icon: CreditCard },
      { label: "Transações",    href: "/transactions", icon: Receipt    },
      { label: "Investimentos", href: "/investments",  icon: TrendingUp },
      { label: "Timeline",      href: "/timeline",     icon: Activity   },
    ],
  },
  {
    label: "Planejamento",
    items: [
      { label: "Orçamentos",  href: "/budgets", icon: PiggyBank },
      { label: "FIRE",        href: "/fire",    icon: Flame     },
    ],
  },
  {
    label: "Monitoramento",
    items: [
      { label: "Health Score",  href: "/health", icon: HeartPulse },
    ],
  },
];

// ── Props ──────────────────────────────────────────────────────

interface SidebarProps {
  collapsed:   boolean;
  onToggle:    () => void;
  alertCount?: number;
}

// ── Component ──────────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle, alertCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  // Injeta badge de alertas no item "Hoje"
  const groupsWithBadge: NavGroup[] = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.map(item =>
      item.label === "Hoje" && alertCount > 0
        ? { ...item, badge: alertCount }
        : item
    ),
  }));

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        style={{ width: collapsed ? "64px" : "220px" }}
        className={cn(
          "relative flex h-full flex-col",
          "bg-zinc-950 border-r border-zinc-800/60",
          "transition-[width] duration-300 ease-in-out overflow-hidden"
        )}
      >
        {/* ── Logo ── */}
        <div className={cn(
          "flex h-14 shrink-0 items-center border-b border-zinc-800/60",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}>
          <Link href="/dashboard" className="flex items-center min-w-0">
            {collapsed ? (
              /* Collapsed: flame icon only */
              <Image
                src="/brand/nextfire-icon.png"
                alt="NextFire"
                width={32}
                height={32}
                className="shrink-0 object-contain"
                priority
              />
            ) : (
              /* Expanded: full horizontal logo */
              <Image
                src="/brand/netfire-logo2.png"
                alt="NextFire"
                width={165}
                height={42}
                priority
                className="h-auto w-[165px] object-contain"
              />
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={onToggle}
              className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label="Recolher sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className="hidden lg:flex h-6 w-6 items-center justify-center rounded-md text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              aria-label="Expandir sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ── Navigation groups ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 flex flex-col gap-4">
          {groupsWithBadge.map((group) => (
            <div key={group.label}>
              {/* Rótulo do grupo — oculto quando sidebar está colapsada */}
              {!collapsed && (
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {group.label}
                </p>
              )}

              <nav className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  const linkEl = (
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                        collapsed ? "h-9 w-9 justify-center p-0" : "h-9 px-3",
                        isActive
                          ? "bg-violet-600 text-white shadow-sm shadow-violet-600/30"
                          : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100"
                      )}
                    >
                      <Icon className={cn(
                        "shrink-0",
                        collapsed ? "h-[18px] w-[18px]" : "h-4 w-4",
                        isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                      )} />
                      {!collapsed && (
                        <span className="flex-1 truncate">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <span className="ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500/20 px-1 text-[10px] font-semibold text-rose-400">
                          {item.badge}
                        </span>
                      )}
                      {!collapsed && item.spark && !isActive && (
                        <Sparkles className="h-3 w-3 text-violet-400 ml-auto shrink-0" />
                      )}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                        <TooltipContent side="right" className="flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="rounded-full bg-rose-500/20 px-1.5 text-[10px] font-semibold text-rose-400">
                              {item.badge}
                            </span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <React.Fragment key={item.href}>
                      {linkEl}
                    </React.Fragment>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* ── User Profile + Settings ── */}
        <div className="shrink-0 border-t border-zinc-800/60">
          {/* Configurações → /settings */}
          {!collapsed && (
            <Link
              href="/settings"
              className="flex items-center gap-2.5 px-4 py-3 text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Configurações</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
            </Link>
          )}

          {/* Avatar */}
          <div className={cn(
            "flex items-center gap-3 px-3 py-3",
            collapsed ? "justify-center" : ""
          )}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                    B
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">Bernardo</p>
                  <p className="text-xs text-zinc-400">bgarios@gmail.com</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-xs font-bold text-white">
                  B
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-zinc-100 truncate">Bernardo</p>
                  <span className="inline-flex items-center rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-violet-400">
                    Premium
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-zinc-700 shrink-0" />
              </>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
