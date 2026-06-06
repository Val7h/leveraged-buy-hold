"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SharpePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect /sharpe to /sharpe-compare
    router.replace("/sharpe-compare");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-text-muted">Redirecionando...</p>
    </div>
  );
}
