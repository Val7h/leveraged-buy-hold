import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL_VERSIONS, DPO_EMAIL, CONTROLLER_NAME } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Politica de Privacidade | LBH System",
  description:
    "Politica de Privacidade do LBH System em conformidade com a LGPD (Lei 13.709/2018): controlador, encarregado, finalidades, bases legais e direitos do titular.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-static";

export default function PrivacidadePage() {
  const v = LEGAL_VERSIONS.privacy;
  return (
    <article
      className="prose prose-invert max-w-3xl mx-auto py-10 px-4"
      data-document-type="privacy"
      data-document-version={v.version}
      data-document-updated={v.updatedAt}
    >
      <h1>Politica de Privacidade</h1>
      <p className="text-sm text-text-muted">
        Versao {v.version} — Atualizado em {v.updatedAt}
      </p>

      <section>
        <h2>1. Controlador e Encarregado (DPO)</h2>
        <p>
          <strong>Controlador:</strong> {CONTROLLER_NAME}.
          <br />
          <strong>Encarregado de Protecao de Dados (DPO):</strong>{" "}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>
        </p>
        <p>
          Esta politica esta em conformidade com a Lei 13.709/2018 (LGPD),
          Resolucao CD/ANPD 2/2022 e melhores praticas internacionais.
        </p>
      </section>

      <section>
        <h2>2. Dados que Tratamos</h2>
        <p>A tabela abaixo descreve cada tratamento conforme exige o Art. 9 da LGPD:</p>
        <div className="not-prose overflow-x-auto my-4">
          <table className="w-full text-xs border border-border">
            <thead className="bg-surface-2">
              <tr>
                <th className="p-2 text-left border border-border">Dado</th>
                <th className="p-2 text-left border border-border">Finalidade</th>
                <th className="p-2 text-left border border-border">Base Legal (LGPD Art. 7)</th>
                <th className="p-2 text-left border border-border">Retencao</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-border">E-mail e nome</td>
                <td className="p-2 border border-border">Autenticacao, comunicacao transacional</td>
                <td className="p-2 border border-border">V — Execucao de contrato</td>
                <td className="p-2 border border-border">Ate exclusao da conta</td>
              </tr>
              <tr>
                <td className="p-2 border border-border">Foto de perfil (OAuth Google)</td>
                <td className="p-2 border border-border">Personalizacao da interface</td>
                <td className="p-2 border border-border">V — Execucao de contrato</td>
                <td className="p-2 border border-border">Ate exclusao da conta</td>
              </tr>
              <tr>
                <td className="p-2 border border-border">Watchlist, backtests, simulacoes</td>
                <td className="p-2 border border-border">Prestacao do servico solicitado</td>
                <td className="p-2 border border-border">V — Execucao de contrato</td>
                <td className="p-2 border border-border">Ate exclusao do dado pelo titular</td>
              </tr>
              <tr>
                <td className="p-2 border border-border">Endereco IP, user-agent</td>
                <td className="p-2 border border-border">Seguranca, antifraude, logs de acesso</td>
                <td className="p-2 border border-border">II — Cumprimento de obrigacao legal (Marco Civil Art. 15)</td>
                <td className="p-2 border border-border">6 meses (logs de acesso)</td>
              </tr>
              <tr>
                <td className="p-2 border border-border">Registro de consentimento</td>
                <td className="p-2 border border-border">Comprovar aceite de termos (LGPD Art. 8 §2)</td>
                <td className="p-2 border border-border">II — Obrigacao legal</td>
                <td className="p-2 border border-border">5 anos apos termino da relacao</td>
              </tr>
              <tr>
                <td className="p-2 border border-border">Eventos de uso anonimizados</td>
                <td className="p-2 border border-border">Analytics e melhoria do produto</td>
                <td className="p-2 border border-border">IX — Legitimo interesse (com LIA documentada)</td>
                <td className="p-2 border border-border">24 meses agregados</td>
              </tr>
              <tr>
                <td className="p-2 border border-border">Dados de pagamento</td>
                <td className="p-2 border border-border">Processamento via gateway (Stripe/Asaas)</td>
                <td className="p-2 border border-border">V — Execucao de contrato</td>
                <td className="p-2 border border-border">Conforme legislacao fiscal (5 anos)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>3. Compartilhamento com Operadores</h2>
        <p>
          Compartilhamos dados estritamente necessarios com os seguintes
          operadores, todos sob contrato com clausulas de protecao adequadas
          (LGPD Art. 39):
        </p>
        <ul>
          <li>
            <strong>Google LLC</strong> (OAuth): autenticacao via Google Sign-In.
          </li>
          <li>
            <strong>Render Services Inc.</strong> (EUA): hospedagem de aplicacao
            e banco de dados.
          </li>
          <li>
            <strong>Yahoo Finance / B3 / provedores de mercado:</strong> apenas
            consultas anonimas a cotacoes (sem envio de dados pessoais).
          </li>
          <li>
            <strong>Provedor de e-mail transacional</strong> (a definir): envio
            de notificacoes e alertas.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Transferencia Internacional</h2>
        <p>
          A infraestrutura de hospedagem (Render) pode estar localizada nos
          Estados Unidos. A transferencia internacional ocorre com base em{" "}
          <strong>clausulas contratuais especificas</strong> do operador,
          conforme Art. 33, II, da LGPD, com salvaguardas equivalentes ao
          padrao brasileiro. O titular pode solicitar copia das salvaguardas
          ao DPO.
        </p>
      </section>

      <section>
        <h2>5. Cookies</h2>
        <p id="cookies">Utilizamos as seguintes categorias de cookies:</p>
        <ul>
          <li>
            <strong>Essenciais:</strong> sessao, autenticacao, CSRF. Nao
            requerem consentimento (estritamente necessarios).
          </li>
          <li>
            <strong>Analiticos:</strong> medicao de uso agregado. Requerem
            consentimento previo via banner.
          </li>
          <li>
            <strong>Marketing:</strong> nao utilizamos no momento.
          </li>
        </ul>
        <p>
          O Usuario pode gerenciar suas preferencias pelo banner de cookies
          exibido na primeira visita ou redefinir o consentimento limpando os
          cookies do navegador.
        </p>
      </section>

      <section>
        <h2>6. Seguranca</h2>
        <p>
          Adotamos medidas tecnicas e administrativas razoaveis para proteger
          os dados: criptografia em transito (TLS 1.2+), hash de senhas,
          controle de acesso baseado em papel, logs de auditoria e principio
          de minimizacao. Em caso de incidente de seguranca relevante, o
          titular e a ANPD serao comunicados conforme Art. 48 da LGPD.
        </p>
      </section>

      <section>
        <h2>7. Direitos do Titular</h2>
        <p>
          O titular pode exercer os direitos previstos no Art. 18 da LGPD
          (confirmacao, acesso, correcao, anonimizacao, portabilidade,
          eliminacao, informacao sobre compartilhamento, informacao sobre
          nao consentir e revogacao). Veja o procedimento em{" "}
          <Link href="/lgpd">/lgpd</Link>. Prazo de resposta: 15 dias (Art. 19
          §1).
        </p>
      </section>

      <section>
        <h2>8. Menores de Idade</h2>
        <p>
          A Plataforma e destinada a maiores de 18 anos. Nao tratamos
          conscientemente dados de criancas ou adolescentes. Caso identifique
          tratamento indevido, contate o DPO para exclusao imediata.
        </p>
      </section>

      <section>
        <h2>9. Alteracoes</h2>
        <p>
          Esta Politica pode ser atualizada. Alteracoes materiais serao
          comunicadas com antecedencia de 30 dias. O historico de versoes esta
          disponivel mediante solicitacao ao DPO.
        </p>
      </section>

      <section>
        <h2>10. Contato</h2>
        <p>
          DPO: <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>
          <br />
          Autoridade Nacional de Protecao de Dados (ANPD):{" "}
          <a
            href="https://www.gov.br/anpd"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.gov.br/anpd
          </a>
        </p>
      </section>

      <p className="text-xs text-text-muted">
        Versao {v.version} — Ultima atualizacao: {v.updatedAt}.
      </p>
    </article>
  );
}
