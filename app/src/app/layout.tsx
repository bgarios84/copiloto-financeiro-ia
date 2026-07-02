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
  description: "Seu copiloto inteligente para gestão financeira pessoal e de investimentos.",
  keywords: ["finanças", "investimentos", "IA", "orçamento", "portfólio", "FIRE"],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.variable}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
