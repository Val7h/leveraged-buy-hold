/**
 * Template: confirmacao de cancelamento de assinatura.
 */
import { button, callout, dateBR, esc, renderLayout, textFooter } from "../_layout";
import type { EmailContent } from "./welcome";

export interface SubscriptionCanceledEmailInput {
  name: string;
  /** Data ate quando o acesso pago permanece ativo (Date ou ISO string). */
  accessUntil: Date | string;
  reactivateUrl: string;
}

export function subscriptionCanceledEmail({
  name,
  accessUntil,
  reactivateUrl,
}: SubscriptionCanceledEmailInput): EmailContent {
  const firstName = name.trim().split(/\s+/)[0] || "investidor";
  const untilStr = dateBR(accessUntil);
  const subject = "Cancelamento confirmado — LBH System";
  const preheader = `Seu acesso permanece ativo ate ${untilStr}.`;

  const html = renderLayout({
    preheader,
    bodyHtml: `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">Cancelamento confirmado</h1>
      <p style="margin: 0 0 14px 0;">Ola, ${esc(firstName)}. Confirmamos o cancelamento da sua assinatura paga no LBH System. Nenhuma nova cobranca sera realizada.</p>

      ${callout(`<strong>Seu acesso aos recursos pagos permanece ativo ate ${esc(untilStr)}.</strong> Apos essa data, sua conta passa automaticamente pro plano Free — seus dados, portfolios e historicos continuam preservados.`)}

      <p style="margin: 0 0 14px 0;">Sentiremos sua falta! Se mudou de ideia ou quer experimentar de novo no futuro, e so reativar:</p>

      ${button("Reative quando quiser", reactivateUrl)}

      <p style="margin: 18px 0 0 0; color: #666; font-size: 13px;">Pode nos ajudar respondendo em uma frase: o que faltou? Sua resposta vai direto pra equipe de produto e ajuda a melhorar o LBH.</p>
    `,
  });

  const text = [
    "Cancelamento confirmado",
    "",
    `Ola, ${firstName}. Confirmamos o cancelamento da sua assinatura paga no LBH System. Nenhuma nova cobranca sera realizada.`,
    "",
    `Seu acesso aos recursos pagos permanece ativo ate ${untilStr}. Apos essa data, sua conta passa automaticamente pro plano Free — seus dados, portfolios e historicos continuam preservados.`,
    "",
    `Reative quando quiser: ${reactivateUrl}`,
    "",
    "Se puder, responda este email em uma frase contando o que faltou. Sua resposta vai direto pra equipe de produto.",
    textFooter(),
  ].join("\n");

  return { subject, html, text };
}
