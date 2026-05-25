import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leveraged Buy & Hold — Sistema Quantitativo",
  description: "Sistema de Buy & Hold Alavancado Adaptativo para investimentos defensivos de longo prazo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased">{children}</body>
    </html>
  );
}
