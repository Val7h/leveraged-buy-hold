import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leveraged Buy & Hold — Sistema Quantitativo",
  description: "Sistema de Buy & Hold Alavancado Adaptativo para investimentos defensivos de longo prazo",
};

// Render every route per-request. The dashboard pages are client components that
// call useSearchParams(); without this, Next tries to statically prerender them
// and the build fails ("useSearchParams() should be wrapped in a suspense boundary").
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="bg-background text-text-primary antialiased">{children}</body>
    </html>
  );
}
