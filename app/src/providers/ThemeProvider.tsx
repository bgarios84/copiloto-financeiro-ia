"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/**
 * ThemeProvider
 *
 * Wraps next-themes to enable Light/Dark/System switching.
 * Used in src/app/layout.tsx as a top-level provider.
 *
 * scriptProps: type="text/nextjs-data" is a non-executable MIME type that
 * makes React 19's isScriptDataBlock() return true, suppressing the
 * "script tag inside client component" console.error in dev mode.
 * FOUC prevention is handled by the inline script in layout.tsx instead.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={{ type: "text/nextjs-data" }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
