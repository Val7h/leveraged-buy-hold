import type { Metadata } from "next";
import { LEGAL_VERSIONS, DPO_EMAIL } from "@/lib/legal/versions";

export const metadata: Metadata = {
  title: "Termos de Uso | LBH System",
  description:
    "Termos de Uso do LBH System: condicoes de uso, limitacao de responsabilidade, modo demo, vedacoes e foro.",
  robots: { index: true, follow: true },
};

export const dynamic = "force-static";

export default function TermosPage() {
  const v = LEGAL_VERSIONS.terms;
  return (
    <article
      className="prose prose-invert max-w-3xl mx-auto py-10 px-4"
      data-document-type="terms"
      data-document-version={v.version}
      data-document-updated={v.updatedAt}
    >
      <h1>Termos de Uso</h1>
      <p className="text-sm text-text-muted">
        Versao {v.version} — Atualizado em {v.updatedAt}
      </p>

      <section>
        <h2>1. Definicoes</h2>
        <ul>
          <li>
            <strong>Plataforma:</strong> o software LBH System, incluindo o site
            lbh-system.onrender.com, suas APIs e qualquer interface acessivel
            ao Usuario.
          </li>
          <li>
            <strong>Usuario:</strong> pessoa fisica ou juridica que acessa ou
            utiliza a Plataforma, com ou sem cadastro.
          </li>
          <li>
            <strong>Modo Demo:</strong> ambiente de demonstracao sem persistencia
            garantida, sem SLA e sem autenticacao real.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Objeto</h2>
        <p>
          A Plataforma e uma ferramenta educacional e informativa de estudo de
          estrategias quantitativas de investimento, incluindo backtest
          historico, simulacao Monte Carlo e gestao de watchlist. NAO presta
          servico de recomendacao, analise, consultoria ou gestao de valores
          mobiliarios. Veja o{" "}
          <a href="/disclaimer">Disclaimer CVM</a> completo.
        </p>
      </section>

      <section>
        <h2>3. Aceitacao</h2>
        <p>
          O uso da Plataforma implica aceitacao integral destes Termos. Caso
          nao concorde, o Usuario deve abster-se de utilizar a Plataforma. O
          aceite pode ser manifestado por marcacao expressa em formulario ou
          pelo uso continuado apos exibicao deste documento.
        </p>
      </section>

      <section>
        <h2>4. Cadastro e Conta</h2>
        <p>
          O Usuario e responsavel pela veracidade dos dados informados, pelo
          sigilo de suas credenciais e por toda atividade realizada em sua
          conta. Vedado compartilhar credenciais ou manter multiplas contas.
          O Usuario deve ter no minimo 18 anos.
        </p>
      </section>

      <section>
        <h2>5. Modo Demo (AS IS, sem garantias)</h2>
        <p>
          No Modo Demo, a Plataforma e fornecida{" "}
          <strong>&quot;no estado em que se encontra&quot;</strong> (AS IS), sem
          qualquer garantia de disponibilidade, persistencia de dados,
          precisao de calculos, atualidade de cotacoes ou aderencia a fins
          especificos. Nao existe SLA. Dados podem ser apagados a qualquer
          momento sem aviso previo.
        </p>
      </section>

      <section>
        <h2>6. Vedacoes</h2>
        <p>E vedado ao Usuario:</p>
        <ul>
          <li>Engenharia reversa, descompilacao ou tentativa de obter o codigo fonte.</li>
          <li>Scraping massivo, uso de bots ou sobrecarga das APIs.</li>
          <li>Manutencao de multiplas contas para burlar limites de plano.</li>
          <li>Revenda, sublicenciamento ou exploracao comercial nao autorizada.</li>
          <li>Uso para qualquer finalidade ilicita, fraudulenta ou que viole direitos de terceiros.</li>
          <li>Republicacao de sinais como se fossem recomendacoes proprias.</li>
        </ul>
      </section>

      <section>
        <h2>7. Propriedade Intelectual</h2>
        <p>
          Todo o codigo, design, marcas, layouts e conteudo proprio da
          Plataforma sao protegidos pelas Leis 9.279/96 e 9.610/98. Dados de
          mercado pertencem a seus provedores de origem (Yahoo Finance, B3 e
          outros). O Usuario recebe apenas licenca de uso pessoal, nao
          exclusiva, nao transferivel e revogavel.
        </p>
      </section>

      <section>
        <h2>8. Limitacao de Responsabilidade</h2>
        <p>
          <strong>
            A Plataforma NAO se responsabiliza por perdas decorrentes de
            decisoes de investimento do Usuario, oscilacoes de mercado, falhas
            de corretoras, indisponibilidade de servicos de terceiros, ataques
            ciberneticos, eventos de forca maior ou caso fortuito.
          </strong>
        </p>
        <p>
          Na maxima extensao permitida pela legislacao aplicavel, a
          responsabilidade total agregada da Plataforma perante o Usuario fica
          limitada ao maior dos seguintes valores: (i) R$ 100,00 (cem reais);
          ou (ii) o valor efetivamente pago pelo Usuario nos 12 meses
          imediatamente anteriores ao evento gerador. Excluem-se lucros
          cessantes, danos indiretos, perda de chance e danos reflexos.
        </p>
        <p>
          A limitacao acima nao se aplica a hipoteses de dolo ou direitos
          irrenunciaveis do consumidor (CDC Art. 51).
        </p>
      </section>

      <section>
        <h2>9. Indenizacao Reversa</h2>
        <p>
          O Usuario se compromete a indenizar a Plataforma por qualquer dano,
          custo ou despesa (incluindo honorarios advocaticios) decorrente do
          uso indevido da Plataforma, violacao destes Termos ou de direitos de
          terceiros.
        </p>
      </section>

      <section>
        <h2>10. Rescisao</h2>
        <p>
          O Usuario pode encerrar sua conta a qualquer momento via
          configuracoes ou solicitacao ao DPO ({DPO_EMAIL}). A Plataforma
          podera suspender ou encerrar contas em caso de violacao destes
          Termos, com aviso quando possivel.
        </p>
      </section>

      <section>
        <h2>11. Alteracoes</h2>
        <p>
          Estes Termos podem ser alterados a qualquer tempo. Alteracoes
          materiais serao comunicadas com antecedencia minima de 30 dias por
          aviso em tela ou e-mail. O uso continuado apos a vigencia da nova
          versao implica aceitacao.
        </p>
      </section>

      <section>
        <h2>12. Lei Aplicavel e Foro</h2>
        <p>
          Estes Termos sao regidos pelas leis da Republica Federativa do
          Brasil. Para Usuarios pessoa fisica consumidores, fica eleito o foro
          do domicilio do Usuario para dirimir controversias, nos termos do
          art. 101, I, do Codigo de Defesa do Consumidor. Para Usuarios
          paritarios (CC Art. 421-A), fica eleito o foro da Comarca de Sao
          Paulo/SP.
        </p>
      </section>

      <section>
        <h2>13. Contato</h2>
        <p>
          Encarregado de Protecao de Dados (DPO):{" "}
          <a href={`mailto:${DPO_EMAIL}`}>{DPO_EMAIL}</a>
        </p>
      </section>

      <p
        className="text-xs text-text-muted"
        data-version={v.version}
        data-updated={v.updatedAt}
      >
        Versao {v.version} — Ultima atualizacao: {v.updatedAt}.
      </p>
    </article>
  );
}
