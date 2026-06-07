import type { Metadata } from "next";
import { LEGAL_VERSIONS } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Disclaimer CVM | LBH System",
  description:
    "Aviso legal: o LBH System nao constitui recomendacao de investimento, oferta, analise de valores mobiliarios ou consultoria. Material meramente educacional.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-static";

export default function DisclaimerPage() {
  const v = LEGAL_VERSIONS.disclaimer;
  return (
    <article
      className="prose prose-invert max-w-3xl mx-auto py-10 px-4"
      data-document-type="disclaimer"
      data-document-version={v.version}
      data-document-updated={v.updatedAt}
    >
      <h1>Disclaimer CVM</h1>
      <p className="text-sm text-text-muted">
        Versao {v.version} — Atualizado em {v.updatedAt}
      </p>

      <section>
        <h2>Aviso Categorico</h2>
        <p>
          <strong>
            O LBH System NAO constitui recomendacao de investimento, oferta,
            analise de valores mobiliarios ou consultoria.
          </strong>{" "}
          Os responsaveis pela plataforma NAO sao Analistas de Valores Mobiliarios
          (Resolucao CVM 20/2021) nem Agentes Autonomos de Investimento
          (Resolucao CVM 178/2023). O conteudo aqui disponibilizado e meramente
          educacional e informativo.
        </p>
        <p>
          <strong>
            Decisoes de investimento sao de exclusiva e integral responsabilidade
            do usuario.
          </strong>{" "}
          Rentabilidade passada nao garante rentabilidade futura. Alavancagem
          amplifica perdas e pode resultar em perda superior ao capital investido.
        </p>
      </section>

      <section>
        <h2>O que o LBH System NAO faz</h2>
        <ul>
          <li>NAO recomenda compra ou venda de ativos especificos.</li>
          <li>NAO faz gestao de carteira de terceiros.</li>
          <li>NAO presta consultoria de valores mobiliarios.</li>
          <li>NAO emite relatorios de analise para tomada de decisao alheia.</li>
          <li>NAO capta recursos do publico.</li>
          <li>NAO promete rentabilidade, retorno garantido ou desempenho futuro.</li>
        </ul>
      </section>

      <section>
        <h2>O que o LBH System E</h2>
        <p>
          Uma ferramenta computacional de natureza educacional e informativa
          para estudo de estrategias quantitativas, backtest historico e
          simulacao de cenarios. O usuario opera por conta propria, em sua
          propria corretora, com seus proprios recursos, sob exclusiva
          responsabilidade.
        </p>
      </section>

      <section>
        <h2>Riscos da Alavancagem</h2>
        <p>
          Estrategias com alavancagem (2x a 3,5x ou superior) podem amplificar
          perdas alem do capital alocado. Margin call pode forcar liquidacao
          de posicoes em momento desfavoravel. Juros e custos operacionais
          incidem diariamente. A estrategia pode falhar em condicoes adversas
          de mercado, incluindo gaps, circuit breakers e eventos de cauda.
        </p>
      </section>

      <section>
        <h2>Modo Demo e Dados Simulados</h2>
        <p>
          Em modo demo (NEXT_PUBLIC_DEMO_MODE), todos os dados, sinais,
          backtests e metricas sao simulacoes para fins de demonstracao da
          interface. NAO refletem operacoes reais e NAO devem ser interpretados
          como sinais ou recomendacoes.
        </p>
      </section>

      <section>
        <h2>Procure Profissionais Habilitados</h2>
        <p>
          Antes de tomar qualquer decisao de investimento, consulte um
          profissional habilitado (analista CVM, consultor CVM ou agente
          autonomo registrado). Verifique a habilitacao em{" "}
          <a
            href="https://www.gov.br/cvm/pt-br"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.gov.br/cvm
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Base Normativa</h2>
        <ul>
          <li>Lei 6.385/1976 (Lei do Mercado de Capitais), Art. 27-C.</li>
          <li>Resolucao CVM 20/2021 (Analistas de Valores Mobiliarios).</li>
          <li>Resolucao CVM 178/2023 (Consultores e Agentes Autonomos).</li>
          <li>Oficio-Circular CVM/SMI/SIN 04/2023.</li>
        </ul>
      </section>

      <p className="text-xs text-text-muted">
        Ao continuar utilizando o LBH System, voce declara estar ciente e de
        acordo com este disclaimer.
      </p>
    </article>
  );
}
