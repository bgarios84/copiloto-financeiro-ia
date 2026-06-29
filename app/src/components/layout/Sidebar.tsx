"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  PieChart,
  Target,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  Bot,
  Sparkles,
  ChevronsUpDown,
  Building2,
  Calendar,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { LAYOUT } from "@/shared/constants/theme";

// ── Nav config ────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  isNew?: boolean;
}

const NAV_MAIN: NavItem[] = [
  { label: "Visao Geral",   href: "/dashboard",    icon: LayoutDashboard },
  { label: "Contas",        href: "/accounts",     icon: Building2       },
  { label: "Cartoes",       href: "/credit-cards", icon: CreditCard      },
  { label: "Transacoes",    href: "/transactions", icon: ArrowLeftRight  },
  { label: "Orcamentos",    href: "/budgets",      icon: PiggyBank       },
  { label: "Investimentos", href: "/investments",  icon: TrendingUp      },
  { label: "Patrimonio",    href: "/portfolio",    icon: PieChart        },
  { label: "Metas",         href: "/budget",       icon: Target          },
  { label: "Relatorios",    href: "/reports",      icon: FileText        },
];

const NAV_AI: NavItem[] = [
  { label: "Analises com IA", href: "/ai",       icon: Bot,      isNew: true },
  { label: "Planejamento",    href: "/planning", icon: Calendar, badge: "Novo" },
  { label: "Alertas",         href: "/alerts",   icon: Bell,     badge: "3"   },
];

const NAV_SYSTEM: NavItem[] = [
  { label: "Configuracoes", href: "/settings", icon: Settings },
];

// ── Props ─────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ── Main Component ────────────────────────────────────────────

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        style={{ width: collapsed ? LAYOUT.sidebar.collapsed : LAYOUT.sidebar.width }}
        className={cn(
          "relative flex h-full flex-col bg-sidebar text-sidebar-foreground",
          "border-r border-sidebar-border",
          "transition-[width] duration-300 ease-in-out overflow-hidden"
        )}
      >
        <div className={cn(
          "flex h-14 shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}>
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/25">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-[13px] font-semibold text-white tracking-tight truncate">
                  Copiloto Financeiro
                </span>
                <span className="text-[10px] text-sidebar-muted tracking-wide uppercase">
                  IA Beta
                </span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={onToggle}
              className={cn(
                "hidden lg:flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                "text-sidebar-muted transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              aria-label="Recolher sidebar"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={onToggle}
              className={cn(
                "hidden lg:flex h-6 w-6 items-center justify-center rounded-md",
                "text-sidebar-muted transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              aria-label="Expandir sidebar"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <ScrollArea className="flex-1 py-3">
          <div className="flex flex-col gap-5 px-2">
            <NavGroup label="Menu"         items={NAV_MAIN}   collapsed={collapsed} pathname={pathname} />
            <NavGroup label="Inteligencia" items={NAV_AI}     collapsed={collapsed} pathname={pathname} />
            <NavGroup label="Sistema"      items={NAV_SYSTEM} collapsed={collapsed} pathname={pathname} />
          </div>
        </ScrollArea>

        {!collapsed && (
          <div className="shrink-0 px-2 pb-2">
            <div className={cn(
              "rounded-xl border border-blue-500/20 p-3",
              "bg-gradient-to-br from-blue-500/10 to-violet-500/10"
            )}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                <p className="text-[12px] font-semibold text-sidebar-accent-foreground">
                  Plano Premium
                </p>
              </div>
              <p className="text-[10px] text-sidebar-muted mb-2.5">
                Aproveite todos os recursos
              </p>
              <button className={cn(
                "w-full rounded-lg py-1.5 text-[11px] font-semibold text-white",
                "bg-gradient-to-r from-blue-500 to-violet-600",
                "transition-opacity hover:opacity-90"
              )}>
                Gerenciar plano
              </button>
            </div>
          </div>
        )}

        <div className={cn(
          "shrink-0 border-t border-sidebar-border",
          collapsed ? "p-2" : "p-3"
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white mx-auto">
                  B
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-medium">Bernardo G.</p>
                <p className="text-xs text-muted-foreground">bgarios@gmail.com</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <button className={cn(
              "group flex w-full items-center gap-2.5 rounded-lg p-2",
              "transition-colors hover:bg-sidebar-accent"
            )}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                B
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[13px] font-medium text-sidebar-accent-foreground truncate">
                  Bernardo G.
                </p>
                <p className="text-[11px] text-sidebar-muted truncate">bgarios@gmail.com</p>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 text-sidebar-muted shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

// ── NavGroup ──────────────────────────────────────────────────

function NavGroup({
  label, items, collapsed, pathname,
}: {
  label: string;
  items: NavItem[];
  collapsed: boolean;
  pathname: string;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
          {label}
        </p>
      )}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>
    </div>
  );
}

// ── NavLink ───────────────────────────────────────────────────

function NavLink({
  item, collapsed, isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md text-[13px] font-medium",
        "transition-all duration-150",
        collapsed ? "w-8 justify-center px-0" : "px-2",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-blue-400" />
      )}
      <Icon className={cn(
        "shrink-0 transition-colors",
        collapsed ? "h-4 w-4" : "h-3.5 w-3.5",
        isActive
          ? "text-blue-400"
          : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
      )} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500/20 px-1.5 text-[10px] font-semibold text-blue-400">
          {item.badge}
        </span>
      )}
      {!collapsed && item.isNew && (
        <span className="ml-auto rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-400">
          Novo
        </span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>{item.label}</span>
          {item.badge && (
            <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400">
              {item.badge}
            </span>
          )}
          {item.isNew && (
            <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-400">
              Novo
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}
