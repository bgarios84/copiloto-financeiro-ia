import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NextFire",
    template: "%s | NextFire",
  },
  description: "Seu copiloto inteligente para gestao financeira pessoal e de investimentos.",
  keywords: ["financas", "investimentos", "IA", "orcamento", "portfolio", "FIRE"],
  icons: {
    icon: "/brand/nextfire-icon.png",
    shortcut: "/brand/nextfire-icon.png",
    apple: "/brand/nextfire-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)",  color: "#0D1117" },
  ],
};

// FOUC-prevention inline script for theme init.
// Mirrors next-themes config: attribute="class", storageKey="theme",
// defaultTheme="system", enableSystem, enableColorScheme.
// Rendered by a Server Component so React never re-renders it on the client,
// which avoids React 19's "script tag inside client component" warning.
// next-themes' own script is silenced via scriptProps in ThemeProvider.tsx.
const themeInitScript = [
  "(function(){",
  "try{",
  "var t=localStorage.getItem('theme')||'system';",
  "var r=t==='system'",
  "?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')",
  ":t;",
  "var d=document.documentElement;",
  "d.classList.remove('light','dark');",
  "d.classList.add(r);",
  "d.style.colorScheme=r;",
  "}catch(e){}",
  "})()",
].join("");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.variable}>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
