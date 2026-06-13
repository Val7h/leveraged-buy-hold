"use client";

import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
import ConsentCheckbox, {
  buildConsentPayload,
  ConsentSnapshot,
} from "@/components/legal/ConsentCheckbox";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";


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
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [acceptCookies, setAcceptCookies] = useState(false); // opcional
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requiredOk = acceptTerms && acceptPrivacy && acceptRisk;

  const handleSubmit = async () => {
    if (!requiredOk || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const consents: ConsentSnapshot[] = [
      {
        documentType: "terms",
        version: LEGAL_VERSIONS.terms.version,
        acceptedAt: new Date().toISOString(),
      },
      {
        documentType: "privacy",
        version: LEGAL_VERSIONS.privacy.version,
        acceptedAt: new Date().toISOString(),
      },
      {
        documentType: "risk",
        version: LEGAL_VERSIONS.risk.version,
        acceptedAt: new Date().toISOString(),
      },
    ];
    if (acceptCookies) {
      consents.push({
        documentType: "cookies",
        version: LEGAL_VERSIONS.cookies.version,
        acceptedAt: new Date().toISOString(),
      });
    }

    try {
      const resp = await fetch("/api/v1/user/consent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildConsentPayload(consents)),
      });

      if (!resp.ok) {
        // LGPD Art. 8 §2: sem confirmacao server-side, NAO ha prova.
        // Bloqueamos o avanco para evitar consentimento "fantasma".
        setError(
          "Nao foi possivel registrar seu consentimento agora. Verifique sua conexao e tente novamente."
        );
        setIsSubmitting(false);
        return;
      }
    } catch {
      setError(
        "Falha ao registrar consentimento. Verifique sua conexao e tente novamente."
      );
      setIsSubmitting(false);
      return;
    }

    const redirect =
      onAccept ||
      onConfirm ||
      (() => {
        window.location.href = "/dashboard";
      });
    redirect();
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
            <h2 className="text-base font-bold text-text-primary">
              Aviso de Risco e Aceite Legal
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Leia antes de continuar
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Disclaimer CVM resumido */}
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
            <h3 className="font-semibold text-text-primary text-sm mb-2">
              Disclaimer CVM
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              O LBH System <strong>nao constitui recomendacao de investimento</strong>,
              analise ou consultoria. Material meramente educacional. Os
              responsaveis nao sao analistas CVM nem agentes autonomos.{" "}
              <a
                href="/disclaimer"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Ler disclaimer completo
              </a>
              .
            </p>
          </div>

          {/* Risco de alavancagem */}
          <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
            <h3 className="font-semibold text-text-primary text-sm mb-2">
              Risco de Alavancagem
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Estrategias com alavancagem (2x a 3,5x) podem amplificar perdas
              alem do capital alocado. Resultados passados nao garantem
              resultados futuros.
            </p>
          </div>

          {/* Checkboxes granulares */}
          <div className="space-y-2 pt-2 border-t border-border">
            <ConsentCheckbox
              id="consent-terms"
              documentType="terms"
              version={LEGAL_VERSIONS.terms.version}
              checked={acceptTerms}
              onChange={setAcceptTerms}
              label={
                <>
                  Li e aceito os{" "}
                  <a
                    href="/termos"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Termos de Uso
                  </a>{" "}
                  (v{LEGAL_VERSIONS.terms.version}).
                </>
              }
            />
            <ConsentCheckbox
              id="consent-privacy"
              documentType="privacy"
              version={LEGAL_VERSIONS.privacy.version}
              checked={acceptPrivacy}
              onChange={setAcceptPrivacy}
              label={
                <>
                  Li e aceito a{" "}
                  <a
                    href="/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Politica de Privacidade
                  </a>{" "}
                  (v{LEGAL_VERSIONS.privacy.version}).
                </>
              }
            />
            <ConsentCheckbox
              id="consent-risk"
              documentType="risk"
              version={LEGAL_VERSIONS.risk.version}
              checked={acceptRisk}
              onChange={setAcceptRisk}
              label={
                <>
                  Entendo os riscos de alavancagem e o{" "}
                  <a
                    href="/disclaimer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Disclaimer CVM
                  </a>
                  . Aceito total responsabilidade por eventuais perdas.
                </>
              }
            />
            <ConsentCheckbox
              id="consent-cookies"
              documentType="cookies"
              version={LEGAL_VERSIONS.cookies.version}
              required={false}
              checked={acceptCookies}
              onChange={setAcceptCookies}
              label={
                <>
                  (Opcional) Autorizo cookies analiticos para melhoria do
                  produto.
                </>
              }
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg p-3"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-surface border-t border-border p-5 rounded-b-xl space-y-2">
          <button
            onClick={handleSubmit}
            disabled={!requiredOk || isSubmitting}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
              requiredOk && !isSubmitting
                ? "bg-primary text-background hover:bg-primary/90 active:scale-[0.98]"
                : "bg-surface-2 text-text-muted cursor-not-allowed"
            }`}
          >
            {isSubmitting
              ? "Registrando consentimento..."
              : requiredOk
              ? "Aceitar e continuar"
              : "Aceite os 3 itens obrigatorios"}
          </button>
          <p className="text-[11px] text-text-muted text-center">
            Seu consentimento e registrado de forma auditavel (LGPD Art. 8 §2).
          </p>
        </div>
      </div>
    </div>
  );
};

export default RiskDisclaimerModal;
