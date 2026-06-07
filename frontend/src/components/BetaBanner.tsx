"use client";
import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";

export default function BetaBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem("beta_banner_dismissed");
    if (!dismissed) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem("beta_banner_dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Zap size={14} className="text-warning flex-shrink-0" />
          <span className="text-text-primary">
            <strong className="text-warning">BETA</strong>
            <span className="hidden sm:inline"> — Modo demo. Auth e dados em validação.</span>
            <span className="sm:hidden"> — Modo demo.</span>
            {" "}
            <a href="mailto:suporte@lbhsystem.com" className="underline hover:text-warning transition-colors">
              Feedback
            </a>
          </span>
        </div>
        <button
          onClick={dismiss}
          className="text-text-muted hover:text-text-primary p-1 rounded transition-colors flex-shrink-0"
          aria-label="Fechar"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
