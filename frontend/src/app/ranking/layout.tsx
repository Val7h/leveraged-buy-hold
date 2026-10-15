import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ranking quantitativo",
  description:
    "Ranking de ativos pelos critérios do modelo LBH: qualidade, momento e teto simulado de alavancagem.",
  alternates: { canonical: "/ranking" },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
