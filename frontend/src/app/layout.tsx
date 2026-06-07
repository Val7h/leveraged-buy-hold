import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/legal/CookieBanner";

export const metadata: Metadata = {
  title: { default: "LBH System — Buy & Hold Alavancado Adaptativo", template: "%s | LBH System" },
  description: "Sistema quantitativo para Buy & Hold alavancado adaptativo. Screening de ativos defensivos, backtest, simulador Monte Carlo. Modo demo gratuito.",
  keywords: ["buy and hold", "alavancagem", "ETF alavancado", "investimento quantitativo", "backtest", "kelly criterion", "screening de ações"],
  authors: [{ name: "LBH System" }],
  creator: "LBH System",
  metadataBase: new URL("https://lbh-system.onrender.com"),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://lbh-system.onrender.com",
    siteName: "LBH System",
    title: "LBH System — Investimento Quantitativo Alavancado",
    description: "Screening, backtest e simulador Monte Carlo para Buy & Hold alavancado. Modo demo grátis.",
    images: [{
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "LBH System — Dashboard quantitativo",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LBH System — Investimento Quantitativo Alavancado",
    description: "Screening, backtest e simulador Monte Carlo. Modo demo grátis.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
