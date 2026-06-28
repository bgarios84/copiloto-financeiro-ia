"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LAYOUT } from "@/shared/constants/theme";

interface AppLayoutProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

/**
 * AppLayout
 *
 * Shell principal da aplicação.
 * Compõe: Sidebar (fixa, colapsável) + Header (sticky) + conteúdo + Footer.
 *
 * Responsividade:
 * - Mobile  (<lg): sidebar oculta, acessível via Sheet no Header
 * - Desktop (≥lg): sidebar fixa colapsável
 */
export function AppLayout({ children, defaultCollapsed = false }: AppLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const sidebarWidth = collapsed
    ? LAYOUT.sidebar.collapsed
    : LAYOUT.sidebar.width;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — hidden on mobile, fixed on desktop */}
      <div className="hidden lg:flex lg:flex-col lg:shrink-0" style={{ width: sidebarWidth }}>
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <Header
          sidebarCollapsed={collapsed}
          onSidebarToggle={() => setCollapsed((c) => !c)}
        />

        {/* Page content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            "px-4 py-6 sm:px-6 lg:px-8"
          )}
        >
          <div className="mx-auto w-full max-w-screen-xl">
            {children}
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
