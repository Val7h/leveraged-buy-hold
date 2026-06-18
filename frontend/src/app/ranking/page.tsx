"use client";

import AppShell from "@/components/layout/AppShell";
// RankingPage is a self-contained client component (plain .js) that consumes
// the backend endpoints /api/ranking, /api/market-bar and /api/ranking/universe.
import RankingPage from "@/components/RankingPage";

export default function RankingRoute() {
  return (
    <AppShell>
      <RankingPage />
    </AppShell>
  );
}
