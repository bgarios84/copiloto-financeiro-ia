"use client";

import * as React from "react";
import { Menu, Moon, Sun, Monitor, Bell, Search, Command } from "lucide-react";
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

// ── Search trigger ────────────────────────────────────────────

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

// ── User Avatar ───────────────────────────────────────────────

function UserAvatar() {
  return (
    <button
      aria-label="Perfil do usuário"
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold",
        "bg-gradient-to-br from-blue-500 to-violet-600 text-white",
        "ring-2 ring-border transition-all hover:ring-primary/40"
      )}
    >
      B
    </button>
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

        {/* Divider */}
        <div className="mx-1 hidden sm:block h-4 w-px bg-border" />

        <NotificationBell />
        <ThemeToggle />

        {/* Divider */}
        <div className="mx-1 h-4 w-px bg-border" />

        <UserAvatar />
      </div>
    </header>
  );
}
