"use client";

import React, { useState } from "react";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface RiskDisclaimerModalProps {
  onConfirm?: () => void;
  onAccept?: () => void;
  isOpen?: boolean;
}

const RiskDisclaimerModal: React.FC<RiskDisclaimerModalProps> = ({
  onConfirm,
  onAccept,
  isOpen = true,
}) => {
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const allChecked = acceptRisk && acceptTerms;

  const handleSubmit = async () => {
    if (!allChecked) return;
    setIsSubmitting(true);

    // Redireciona imediatamente — consent é salvo em background
    const redirect = onAccept || onConfirm || (() => { window.location.href = "/dashboard"; });
    redirect();

    // POST em background, não bloqueia o usuário
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      await fetch(`${API_URL}/api/v1/user/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          acceptRisk: true,
          acceptTerms: true,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Falha silenciosa — o usuário já foi redirecionado
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border p-5 flex items-center gap-3 rounded-t-xl">
          <div className="w-9 h-9 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-warning" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Aviso de Risco — Leia antes de continuar</h2>
            <p className="text-xs text-text-muted mt-0.5">Plataforma de investimentos alavancados</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">

          {/* Risk box */}
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
            <h3 className="font-semibold text-text-primary text-sm mb-2">Risco de Alavancagem</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Esta plataforma utiliza estratégias com alavancagem de 2x a 3,5x sobre o portfólio.
              Alavancagem amplifica tanto os ganhos quanto as perdas. Resultados passados não
              garantem resultados futuros.
            </p>
          </div>

          {/* Risks list */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Principais riscos:</h3>
            <ul className="text-xs text-text-secondary space-y-1.5 list-none">
              {[
                "Margin calls podem forçar liquidação de posições",
                "Juros incidem diariamente sobre valores alavancados",
                "Volatilidade do mercado pode gerar perdas rápidas",
                "A estratégia pode não funcionar em todas as condições",
                "Falhas técnicas ou da corretora podem afetar as operações",
              ].map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-warning mt-0.5 flex-shrink-0">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Qualification */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-xs text-text-secondary">
              <span className="text-primary font-semibold">Use esta plataforma somente se</span> você
              compreende os riscos envolvidos, possui capital suficiente para absorver perdas e tem
              experiência com investimentos alavancados.
            </p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-surface-2 transition-colors">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  id="check-risk"
                  type="checkbox"
                  checked={acceptRisk}
                  onChange={(e) => setAcceptRisk(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  acceptRisk ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                }`}>
                  {acceptRisk && <CheckCircle2 className="w-4 h-4 text-background" />}
                </div>
              </div>
              <span className="text-xs text-text-secondary leading-relaxed">
                Entendo os riscos de alavancagem e aceito total responsabilidade por eventuais perdas.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group p-2 rounded-lg hover:bg-surface-2 transition-colors">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  id="check-terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  acceptTerms ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                }`}>
                  {acceptTerms && <CheckCircle2 className="w-4 h-4 text-background" />}
                </div>
              </div>
              <span className="text-xs text-text-secondary leading-relaxed">
                Li e aceito os{" "}
                <a href="/legal/termos" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Termos de Uso
                </a>{" "}e a{" "}
                <a href="/legal/risco" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Política de Risco
                </a>.
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-5 rounded-b-xl space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!allChecked || isSubmitting}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
              allChecked && !isSubmitting
                ? "bg-primary text-background hover:bg-primary/90 active:scale-[0.98]"
                : "bg-surface-2 text-text-muted cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Processando..." : allChecked ? "Entendi, quero continuar →" : "Aceite ambos os itens para continuar"}
          </button>
          <p className="text-[11px] text-text-muted text-center">
            Seu consentimento é registrado para fins de conformidade regulatória.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskDisclaimerModal;
