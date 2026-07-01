"use client";

/**
 * Sidebar — Redesign Sprint
 * Visual: dark premium, roxo como cor principal.
 * Nav: Hoje | Patrimônio | Investir | Planejar | Acompanhar | Alertas | Aprender
 * Quick Actions + User Profile + Configurações.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  TrendingUp,
  Target,
  Activity,
  Bell,
  BookOpen,
  Plus,
  Receipt,
  Flag,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronLeft,
  Flame,
  Sparkles,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

// ── Nav config ────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  spark?: boolean; // ✦ decoration for "Hoje"
}

interface QuickAction {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_MAIN: NavItem[] = [
  { label: "Hoje",        href: "/dashboard",    icon: Home,      spark: true },
  { label: "Patrimônio",  href: "/accounts",     icon: Wallet              },
  { label: "Investir",    href: "/investments",  icon: TrendingUp          },
  { label: "Planejar",    href: "/fire",         icon: Flame               },
  { label: "Acompanhar",  href: "/timeline",     icon: Activity            },
  { label: "Alertas",     href: "/settings/open-finance", icon: Bell       },
  { label: "Aprender",    href: "/budgets",              icon: BookOpen            },
];

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Adicionar conta",    href: "/accounts",      icon: Building2 },
  { label: "Registrar despesa",  href: "/transactions",  icon: Receipt   },
  { label: "Definir meta",       href: "/budgets",       icon: Flag      },
  { label: "Simular objetivo",   href: "/fire",          icon: BarChart3 },
];

// ── Props ─────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  alertCount?: number;
}

// ── Main Component ────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle, alertCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  // Inject alert count badge into Alertas nav item
  const navItems = NAV_MAIN.map(item =>
    item.label === "Alertas" && alertCount > 0
      ? { ...item, badge: alertCount }
      : item
  );

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
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-600/30">
              <span className="text-white font-bold text-sm select-none">C</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-[13px] font-semibold text-zinc-100 tracking-tight">Copiloto</span>
                <span className="text-[10px] text-zinc-500 tracking-wide">Financeiro IA</span>
              </div>
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

        {/* ── Navigation ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 flex flex-col gap-6">

          {/* Main nav */}
          <nav className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              const linkEl = (
                <Link
                  key={item.href}
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
                    collapsed ? "h-4.5 w-4.5" : "h-4 w-4",
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

              return linkEl;
            })}
          </nav>

          {/* Quick Actions */}
          {!collapsed && (
            <div>
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Ações Rápidas
              </p>
              <div className="flex flex-col gap-0.5">
                {QUICK_ACTIONS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <Link
                      key={a.href + a.label}
                      href={a.href}
                      className="flex items-center gap-2.5 rounded-lg h-8 px-3 text-[12px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
                    >
                      <Plus className="h-3 w-3 text-zinc-600 shrink-0" />
                      <span className="truncate">{a.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── User Profile ── */}
        <div className="shrink-0 border-t border-zinc-800/60">
          {/* Settings */}
          {!collapsed && (
            <Link
              href="/settings/open-finance"
              className="flex items-center gap-2.5 px-4 py-3 text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Configurações</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
            </Link>
          )}

          {/* Profile */}
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
