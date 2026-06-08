/**
 * Template: confirmacao de pagamento de assinatura (Pro/Premium).
 */
import { brl, button, callout, dateBR, esc, renderLayout, textFooter } from "../_layout";
import type { EmailContent } from "./welcome";

export interface PaymentConfirmedEmailInput {
  name: string;
  /** Ex: "Pro Mensal", "Premium Anual". */
  planName: string;
  /** Valor pago em BRL (numero) ou string ja formatada (ex: "R$ 59,00"). */
  amount: number | string;
  /** Proxima cobranca (Date ou ISO string). */
  nextChargeAt: Date | string;
  manageUrl: string;
}

export function paymentConfirmedEmail({
  name,
  planName,
  amount,
  nextChargeAt,
  manageUrl,
}: PaymentConfirmedEmailInput): EmailContent {
  const firstName = name.trim().split(/\s+/)[0] || "investidor";
  const amountStr = typeof amount === "number" ? brl(amount) : amount;
  const nextDate = dateBR(nextChargeAt);
  const subject = `Pagamento confirmado — ${planName}`;
  const preheader = `Sua assinatura ${planName} esta ativa. Proxima cobranca em ${nextDate}.`;

  const html = renderLayout({
    preheader,
    bodyHtml: `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">Pagamento confirmado</h1>
      <p style="margin: 0 0 14px 0;">Ola, ${esc(firstName)}. Recebemos seu pagamento e sua assinatura esta ativa. Obrigado pela confianca no LBH System!</p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 16px 0; font-size: 14px; border: 1px solid #e1e5ea; border-radius: 6px;">
        <tr><td style="padding: 12px 16px; color: #666; width: 160px;">Plano</td><td style="padding: 12px 16px; font-weight: 600;">${esc(planName)}</td></tr>
        <tr><td style="padding: 12px 16px; color: #666; border-top: 1px solid #e1e5ea;">Valor pago</td><td style="padding: 12px 16px; font-weight: 600; border-top: 1px solid #e1e5ea;">${esc(amountStr)}</td></tr>
        <tr><td style="padding: 12px 16px; color: #666; border-top: 1px solid #e1e5ea;">Proxima cobranca</td><td style="padding: 12px 16px; border-top: 1px solid #e1e5ea;">${esc(nextDate)}</td></tr>
      </table>

      ${button("Gerenciar assinatura", manageUrl)}

      ${callout(
        `<strong>Nota Fiscal:</strong> sera emitida pelo nosso provedor de pagamentos e enviada em email separado em ate 5 dias uteis. Caso nao receba, escreva pra <a href="mailto:financeiro@alavanca.com.br" style="color: #0a4f4f;">financeiro@alavanca.com.br</a>.`
      )}

      <p style="margin: 18px 0 0 0; color: #666; font-size: 13px;">Voce pode atualizar metodo de pagamento, trocar de plano ou cancelar a qualquer momento na area "Gerenciar assinatura".</p>
    `,
  });

  const text = [
    `Pagamento confirmado — ${planName}`,
    "",
    `Ola, ${firstName}. Recebemos seu pagamento e sua assinatura esta ativa.`,
    "",
    `Plano: ${planName}`,
    `Valor pago: ${amountStr}`,
    `Proxima cobranca: ${nextDate}`,
    "",
    `Gerenciar assinatura: ${manageUrl}`,
    "",
    "Nota Fiscal: sera emitida pelo nosso provedor de pagamentos e enviada em email separado em ate 5 dias uteis. Caso nao receba, escreva pra financeiro@alavanca.com.br.",
    "",
    "Voce pode atualizar metodo de pagamento, trocar de plano ou cancelar a qualquer momento na area Gerenciar assinatura.",
    textFooter(),
  ].join("\n");

  return { subject, html, text };
}
