"use client";

import * as React from "react";
import { AppLayout } from "@/components/layout/AppLayout";

interface AppShellProps {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
}

/**
 * AppShell — top-level layout wrapper with configurable initial sidebar state.
 * Thin wrapper over AppLayout that exposes a stable public API for pages.
 */
export function AppShell({ children, defaultCollapsed = false }: AppShellProps) {
  return (
    <AppLayout defaultCollapsed={defaultCollapsed}>
      {children}
    </AppLayout>
  );
}
