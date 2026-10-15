import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar ou criar conta",
  description:
    "Entre ou crie sua conta no LBH System para salvar estratégias, acompanhar ativos e usar o backtest.",
  alternates: { canonical: "/login" },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
