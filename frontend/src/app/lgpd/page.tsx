import type { Metadata } from "next";
import { LEGAL_VERSIONS, DPO_EMAIL } from "@/lib/legal/versions";
import LgpdRequestForm from "./LgpdRequestForm";

export const metadata: Metadata = {
  title: "Direitos do Titular (LGPD) | LBH System",
  description:
    "Canal oficial para exercicio dos direitos do titular previstos no Art. 18 da LGPD: acesso, correcao, eliminacao, portabilidade e revogacao.",
  robots: { index: true, follow: true },
};

const RIGHTS = [
  {
    title: "Confirmacao da existencia de tratamento",
    desc: "Saber se tratamos seus dados pessoais.",
  },
  {
    title: "Acesso aos dados",
    desc: "Receber copia dos dados pessoais que mantemos sobre voce.",
  },
  {
    title: "Correcao",
    desc: "Pedir correcao de dados incompletos, inexatos ou desatualizados.",
  },
  {
    title: "Anonimizacao, bloqueio ou eliminacao",
    desc: "De dados desnecessarios, excessivos ou tratados em desconformidade com a LGPD.",
  },
  {
    title: "Portabilidade",
    desc: "Receber seus dados em formato estruturado e interoperavel para envio a outro fornecedor.",
  },
  {
    title: "Eliminacao apos consentimento",
    desc: "Pedir eliminacao dos dados tratados com base no seu consentimento.",
  },
  {
    title: "Informacao sobre compartilhamento",
    desc: "Saber com quais entidades publicas e privadas seus dados sao compartilhados.",
  },
  {
    title: "Informacao sobre consequencias de nao consentir",
    desc: "Conhecer o impacto de recusar consentimento para tratamentos opcionais.",
  },
  {
    title: "Revogacao do consentimento",
    desc: "Retirar o consentimento a qualquer momento para tratamentos baseados no Art. 7, I.",
  },
];

export default function LgpdPage() {
  const v = LEGAL_VERSIONS.privacy;
  return (
    <article className="prose prose-invert max-w-3xl mx-auto py-10 px-4">
      <h1>Direitos do Titular — LGPD</h1>
      <p className="text-sm text-text-muted">
        Politica de Privacidade vigente: versao {v.version} ({v.updatedAt})
      </p>

      <section>
        <h2>Seus 9 direitos garantidos pelo Art. 18 da LGPD</h2>
        <ol>
          {RIGHTS.map((r) => (
            <li key={r.title}>
              <strong>{r.title}.</strong> {r.desc}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Como exercer seus direitos</h2>
        <p>
          Utilize o formulario abaixo OU envie e-mail diretamente ao nosso
          Encarregado de Protecao de Dados (DPO):{" "}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>.
        </p>
        <p>
          <strong>Prazo de resposta:</strong> ate 15 dias corridos a partir do
          recebimento da solicitacao (LGPD Art. 19 §1). Em casos complexos,
          podemos informar prazo adicional justificado.
        </p>
        <p>
          <strong>Nao exigimos cadastro previo</strong> para exercicio de
          direitos. Caso necessario, podemos solicitar informacoes para
          confirmacao da sua identidade, com o objetivo unico de evitar
          divulgacao indevida a terceiros (LGPD Art. 18 §1).
        </p>
      </section>

      <LgpdRequestForm />

      <section>
        <h2>Recurso a ANPD</h2>
        <p>
          Se nossa resposta nao for satisfatoria, voce pode peticionar
          diretamente a Autoridade Nacional de Protecao de Dados:{" "}
          <a
            href="https://www.gov.br/anpd"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.gov.br/anpd
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Base normativa</h2>
        <ul>
          <li>Lei 13.709/2018 (LGPD), Arts. 17, 18, 19 e 20.</li>
          <li>Resolucao CD/ANPD 2/2022.</li>
          <li>Guia ANPD sobre Direitos dos Titulares (2023).</li>
        </ul>
      </section>
    </article>
  );
}
