import Link from "next/link";
import { DPO_EMAIL } from "@/lib/legal/versions";

/**
 * Footer legal persistente — Server Component.
 *
 * Renderiza links para todas as paginas legais obrigatorias mais um resumo
 * do disclaimer CVM. Requisito de CDC Art. 46 (clausulas previamente
 * apresentadas) e Resolucao CD/ANPD 2/2022 Art. 6 (transparencia).
 *
 * Importar em:
 *  - frontend/src/components/layout/AppShell.tsx (apos </main>)
 *  - frontend/src/app/page.tsx (landing — pode substituir o footer atual)
 */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer
      role="contentinfo"
      aria-label="Rodape com avisos legais"
      className="border-t border-border bg-surface mt-auto"
    >
      <div className="max-w-6xl mx-auto px-4 py-6 text-xs text-text-muted">
        <p className="mb-3 leading-relaxed">
          O LBH System <strong>nao constitui recomendacao de investimento</strong>,
          analise de valores mobiliarios, consultoria nem gestao. Material
          meramente educacional e informativo.{" "}
          <Link href="/disclaimer" className="underline hover:text-text-secondary">
            Leia o disclaimer completo
          </Link>
          .
        </p>
        <nav
          aria-label="Links legais"
          className="flex flex-wrap gap-x-4 gap-y-2"
        >
          <Link href="/termos" className="hover:text-text-secondary transition-colors">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="hover:text-text-secondary transition-colors">
            Privacidade
          </Link>
          <Link href="/lgpd" className="hover:text-text-secondary transition-colors">
            Direitos LGPD
          </Link>
          <Link href="/disclaimer" className="hover:text-text-secondary transition-colors">
            Disclaimer CVM
          </Link>
          <Link href="/pricing" className="hover:text-text-secondary transition-colors">
            Planos
          </Link>
          <a
            href={`mailto:${DPO_EMAIL}`}
            className="hover:text-text-secondary transition-colors"
          >
            Contato DPO
          </a>
        </nav>
        <p className="mt-4 text-[11px] opacity-70">
          (c) {year} LBH System — Versao em desenvolvimento (MVP).
        </p>
      </div>
    </footer>
  );
}
