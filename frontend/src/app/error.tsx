"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[LBH] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full card text-center py-12">
        <div className="w-12 h-12 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-danger" />
        </div>
        <h2 className="text-base font-semibold text-text-primary mb-2">
          Algo deu errado
        </h2>
        <p className="text-sm text-text-secondary mb-6">
          Ocorreu um erro inesperado. Se o problema persistir, recarregue a página.
        </p>
        <button
          onClick={reset}
          className="btn-primary mx-auto flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Tentar novamente
        </button>
        {error.digest && (
          <p className="text-[10px] text-text-muted mt-4 font-mono">
            Ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
