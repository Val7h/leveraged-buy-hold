import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos e preços",
  description:
    "Planos Free e Pro do LBH System: backtest, comparação de estratégias e sinais quantitativos em reais. Cancele quando quiser.",
  alternates: { canonical: "/pricing" },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
