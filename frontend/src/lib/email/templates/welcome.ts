/**
 * Template: boas-vindas pos cadastro.
 */
import { button, esc, renderLayout, textFooter } from "../_layout";

export interface WelcomeEmailInput {
  name: string;
  loginUrl: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function welcomeEmail({ name, loginUrl }: WelcomeEmailInput): EmailContent {
  const firstName = name.trim().split(/\s+/)[0] || "investidor";
  const subject = `Bem-vindo ao LBH System, ${firstName}!`;
  const preheader = "Sua conta foi criada. Veja o primeiro passo pra montar sua estrategia.";

  const html = renderLayout({
    preheader,
    bodyHtml: `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">Boas-vindas, ${esc(firstName)}!</h1>
      <p style="margin: 0 0 14px 0;">Sua conta no <strong>LBH System</strong> esta pronta. Aqui voce roda backtests de estrategias de Leveraged Buy &amp; Hold com dados reais do mercado brasileiro, monta portfolios e acompanha sinais quantitativos.</p>

      ${button("Acessar minha conta", loginUrl)}

      <h2 style="margin: 24px 0 8px 0; font-size: 16px;">Dica pra comecar</h2>
      <p style="margin: 0 0 14px 0;">Comece simples: escolha <strong>1 ativo</strong> (por exemplo BOVA11 ou IVVB11), rode um backtest de 5 anos e compare com a estrategia <em>buy &amp; hold</em> pura. Voce vai ver na pratica o efeito da alavancagem controlada — sem precisar configurar nada complexo.</p>

      <p style="margin: 0 0 14px 0;">No plano <strong>Free</strong> voce ja faz tudo isso. Se gostar, libera ate 10 estrategias simultaneas com o <strong>Pro</strong> (14 dias gratis, sem cartao).</p>

      <p style="margin: 18px 0 0 0; color: #666; font-size: 13px;">Qualquer duvida, basta responder este email — a gente le tudo.</p>
    `,
  });

  const text = [
    `Boas-vindas, ${firstName}!`,
    "",
    "Sua conta no LBH System esta pronta. Aqui voce roda backtests de estrategias de Leveraged Buy & Hold com dados reais do mercado brasileiro, monta portfolios e acompanha sinais quantitativos.",
    "",
    `Acessar: ${loginUrl}`,
    "",
    "Dica pra comecar:",
    "Escolha 1 ativo (por exemplo BOVA11 ou IVVB11), rode um backtest de 5 anos e compare com buy & hold puro. Voce vai ver na pratica o efeito da alavancagem controlada.",
    "",
    "No plano Free voce ja faz tudo isso. Se gostar, libera ate 10 estrategias com o Pro (14 dias gratis, sem cartao).",
    "",
    "Qualquer duvida, basta responder este email.",
    textFooter(),
  ].join("\n");

  return { subject, html, text };
}
