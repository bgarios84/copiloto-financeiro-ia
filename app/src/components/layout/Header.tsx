"use client";

import * as React from "react";
import { Menu, Moon, Sun, Monitor, Bell, Search, Command, LogOut, User, ChevronDown } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppBreadcrumb } from "@/components/layout/AppBreadcrumb";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { LAYOUT } from "@/shared/constants/theme";
import { logout } from "@/lib/auth/actions";

// ── Theme Toggle ──────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8" />;

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const label =
    theme === "light" ? "Modo claro" :
    theme === "dark"  ? "Modo escuro" : "Modo sistema";

  return (
    <button
      onClick={cycleTheme}
      title={label}
      aria-label="Alternar tema"
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg",
        "text-muted-foreground transition-colors",
        "hover:bg-secondary hover:text-foreground"
      )}
    >
      {theme === "light"  && <Sun className="h-4 w-4" />}
      {theme === "dark"   && <Moon className="h-4 w-4" />}
      {theme === "system" && <Monitor className="h-4 w-4" />}
    </button>
  );
}

// ── Search Trigger ────────────────────────────────────────────

function SearchTrigger() {
  return (
    <button
      aria-label="Pesquisar"
      className={cn(
        "hidden sm:flex items-center gap-2 rounded-lg border border-border",
        "bg-secondary/60 px-3 h-8 text-sm text-muted-foreground",
        "transition-colors hover:bg-secondary hover:text-foreground",
        "w-48 xl:w-64"
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-left text-[13px]">Pesquisar...</span>
      <kbd className="hidden xl:flex items-center gap-0.5 text-[10px] font-medium opacity-60">
        <Command className="h-2.5 w-2.5" />
        <span>K</span>
      </kbd>
    </button>
  );
}

// ── Notifications ─────────────────────────────────────────────

function NotificationBell() {
  return (
    <button
      aria-label="Notificações"
      className={cn(
        "relative flex h-8 w-8 items-center justify-center rounded-lg",
        "text-muted-foreground transition-colors",
        "hover:bg-secondary hover:text-foreground"
      )}
    >
      <Bell className="h-4 w-4" />
      <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">
        3
      </span>
    </button>
  );
}

// ── User Menu ─────────────────────────────────────────────────

function UserMenu() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  // Fechar ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Fechar com Escape
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Avatar trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-1.5 py-1",
          "transition-colors hover:bg-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        )}
      >
        <div className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold",
          "bg-gradient-to-br from-blue-500 to-violet-600 text-white",
          "ring-2 ring-border"
        )}>
          B
        </div>
        <ChevronDown className={cn(
          "hidden sm:block h-3 w-3 text-muted-foreground transition-transform duration-150",
          open && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "w-52 rounded-xl border border-border bg-card",
            "shadow-lg shadow-black/10",
            "py-1 overflow-hidden",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
          )}
        >
          {/* User info */}
          <div className="px-3 py-2.5 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-xs font-bold text-white">
                B
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">
                  Bernardo G.
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  bgarios@gmail.com
                </p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              role="menuitem"
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2",
                "text-[13px] text-muted-foreground",
                "transition-colors hover:bg-secondary hover:text-foreground"
              )}
              onClick={() => setOpen(false)}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>Meu perfil</span>
            </button>
          </div>

          {/* Divider + Logout */}
          <div className="border-t border-border py-1">
            <form action={logout}>
              <button
                type="submit"
                role="menuitem"
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2",
                  "text-[13px] text-destructive",
                  "transition-colors hover:bg-destructive/10"
                )}
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                <span>Sair</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────

interface HeaderProps {
  sidebarCollapsed: boolean;
  onSidebarToggle: () => void;
}

export function Header({ sidebarCollapsed, onSidebarToggle }: HeaderProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  return (
    <header
      style={{ height: LAYOUT.header.height }}
      className={cn(
        "sticky top-0 z-40 flex w-full items-center gap-3",
        "border-b border-border bg-background/80 px-4",
        "backdrop-blur-md supports-[backdrop-filter]:bg-background/70"
      )}
    >
      {/* Mobile: hamburger */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-60 border-r border-sidebar-border bg-sidebar">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegação</SheetTitle>
          </SheetHeader>
          <Sidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop: sidebar toggle */}
      <button
        onClick={onSidebarToggle}
        className={cn(
          "hidden lg:flex h-8 w-8 items-center justify-center rounded-lg",
          "text-muted-foreground transition-colors",
          "hover:bg-secondary hover:text-foreground"
        )}
        aria-label={sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"}
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Breadcrumb */}
      <div className="flex-1 min-w-0">
        <AppBreadcrumb />
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-1.5 ml-auto">
        <SearchTrigger />

        <div className="mx-1 hidden sm:block h-4 w-px bg-border" />

        <NotificationBell />
        <ThemeToggle />

        <div className="mx-1 h-4 w-px bg-border" />

        <UserMenu />
      </div>
    </header>
  );
}
