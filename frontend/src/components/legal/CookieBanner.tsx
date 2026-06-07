"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

const COOKIE_NAME = "lbh_cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 ano

interface CookieConsent {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  version: string;
  timestamp: string;
}

function readConsentCookie(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1]));
  } catch {
    return null;
  }
}

function writeConsentCookie(consent: CookieConsent) {
  // Nao podemos usar httpOnly do lado do cliente; o backend pode reemitir
  // se necessario. Mas usamos SameSite=Lax e Secure quando possivel.
  const value = encodeURIComponent(JSON.stringify(consent));
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  document.cookie = `${COOKIE_NAME}=${value}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/**
 * Banner LGPD-compliant para gestao de cookies (ANPD Guia 2022).
 *
 * Comportamento padrao = REJEITADO. Analytics e marketing so carregam
 * apos consent.analytics === true / consent.marketing === true via
 * useEffect dependente do estado.
 */
export default function CookieBanner() {
  const [needsConsent, setNeedsConsent] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsentCookie();
    setNeedsConsent(!existing);
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  // TODO(gerente): carregar Google Analytics / Meta Pixel SOMENTE quando
  // o useEffect abaixo detectar analytics=true / marketing=true.
  useEffect(() => {
    if (analytics) {
      // window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
    }
  }, [analytics]);

  const accept = (a: boolean, m: boolean) => {
    const consent: CookieConsent = {
      essential: true,
      analytics: a,
      marketing: m,
      version: LEGAL_VERSIONS.cookies.version,
      timestamp: new Date().toISOString(),
    };
    writeConsentCookie(consent);
    setAnalytics(a);
    setMarketing(m);
    setNeedsConsent(false);
  };

  if (!needsConsent) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface shadow-2xl"
    >
      <div className="max-w-4xl mx-auto p-4 sm:p-5">
        <h2
          id="cookie-banner-title"
          className="text-sm font-semibold text-text-primary mb-1"
        >
          Cookies e Privacidade
        </h2>
        <p
          id="cookie-banner-desc"
          className="text-xs text-text-secondary leading-relaxed mb-3"
        >
          Usamos cookies essenciais para o funcionamento da plataforma.
          Cookies analiticos e de marketing so sao ativados com seu
          consentimento.{" "}
          <Link
            href="/privacidade#cookies"
            className="underline text-primary hover:text-primary/80"
          >
            Saiba mais
          </Link>
          .
        </p>

        {showCustomize && (
          <div className="space-y-2 mb-3 p-3 rounded-lg bg-background border border-border">
            <label className="flex items-start gap-2 text-xs cursor-not-allowed opacity-70">
              <input type="checkbox" checked disabled />
              <span>
                <strong>Essenciais</strong> — necessarios para autenticacao e
                seguranca (sempre ativos).
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />
              <span>
                <strong>Analiticos</strong> — medicao agregada de uso para
                melhoria do produto.
              </span>
            </label>
            <label className="flex items-start gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
              <span>
                <strong>Marketing</strong> — atualmente nao utilizamos.
              </span>
            </label>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => accept(true, true)}
            className="px-4 py-2 rounded-lg bg-primary text-background font-semibold text-xs hover:bg-primary/90"
          >
            Aceitar todos
          </button>
          <button
            onClick={() => accept(false, false)}
            className="px-4 py-2 rounded-lg bg-surface-2 text-text-primary border border-border font-semibold text-xs hover:bg-background"
          >
            Rejeitar nao-essenciais
          </button>
          {!showCustomize ? (
            <button
              onClick={() => setShowCustomize(true)}
              className="px-4 py-2 rounded-lg bg-transparent text-text-secondary text-xs hover:text-text-primary"
            >
              Personalizar
            </button>
          ) : (
            <button
              onClick={() => accept(analytics, marketing)}
              className="px-4 py-2 rounded-lg bg-primary/80 text-background font-semibold text-xs hover:bg-primary"
            >
              Salvar preferencias
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
