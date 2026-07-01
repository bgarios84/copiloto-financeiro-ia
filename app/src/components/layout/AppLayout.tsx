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
  /** Se true, oculta o Header e o Footer (para o dashboard que tem seu próprio cabeçalho). */
  hideChrome?: boolean;
  /** Número de alertas danger para exibir no badge da sidebar. */
  alertCount?: number;
}

/**
 * AppLayout — Shell principal da aplicação.
 * Sidebar (fixa, colapsável) + opcional Header/Footer + conteúdo.
 */
export function AppLayout({
  children,
  defaultCollapsed = false,
  hideChrome = false,
  alertCount = 0,
}: AppLayoutProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const sidebarWidth = collapsed ? LAYOUT.sidebar.collapsed : LAYOUT.sidebar.width;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      {/* Sidebar — hidden on mobile, fixed on desktop */}
      <div className="hidden lg:flex lg:flex-col lg:shrink-0" style={{ width: sidebarWidth }}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          alertCount={alertCount}
        />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header — only shown outside dashboard */}
        {!hideChrome && (
          <Header
            sidebarCollapsed={collapsed}
            onSidebarToggle={() => setCollapsed((c) => !c)}
          />
        )}

        {/* Page content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            hideChrome
              ? "px-4 py-6 sm:px-6 lg:px-8"
              : "px-4 py-6 sm:px-6 lg:px-8"
          )}
        >
          <div className="mx-auto w-full max-w-screen-2xl">
            {children}
          </div>
        </main>

        {/* Footer */}
        {!hideChrome && <Footer />}
      </div>
    </div>
  );
}
