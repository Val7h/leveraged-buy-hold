/**
 * Template: link de redefinicao de senha.
 */
import { button, callout, esc, renderLayout, textFooter } from "../_layout";
import type { EmailContent } from "./welcome";

export interface PasswordResetEmailInput {
  name: string;
  resetUrl: string;
  /** Tempo legivel ate expirar (ex: "1 hora", "60 minutos"). Default: "1 hora". */
  expiresIn?: string;
}

export function passwordResetEmail({
  name,
  resetUrl,
  expiresIn = "1 hora",
}: PasswordResetEmailInput): EmailContent {
  const firstName = name.trim().split(/\s+/)[0] || "investidor";
  const subject = "Redefinicao de senha — LBH System";
  const preheader = `Link valido por ${expiresIn}. Se nao foi voce, ignore este email.`;

  const html = renderLayout({
    preheader,
    bodyHtml: `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">Redefinicao de senha</h1>
      <p style="margin: 0 0 14px 0;">Ola, ${esc(firstName)}. Recebemos um pedido pra redefinir a senha da sua conta no LBH System. Clique no botao abaixo pra escolher uma nova senha:</p>

      ${button("Redefinir minha senha", resetUrl)}

      <p style="margin: 0 0 14px 0; font-size: 13px; color: #666;">Se o botao nao funcionar, copie e cole no navegador:<br/>
        <a href="${esc(resetUrl)}" style="color: #00a8a8; word-break: break-all;">${esc(resetUrl)}</a>
      </p>

      ${callout(`<strong>Este link expira em ${esc(expiresIn)}.</strong> Apos esse periodo, sera preciso solicitar um novo pedido de redefinicao.`)}

      ${callout(
        `<strong>Se nao foi voce que pediu</strong>, pode ignorar este email com tranquilidade — sua senha atual continua valida e nenhuma alteracao foi feita. Se desconfiar de acesso indevido, escreva pra <a href="mailto:seguranca@alavanca.com.br" style="color: #b45309;">seguranca@alavanca.com.br</a>.`,
        "warning"
      )}
    `,
  });

  const text = [
    `Ola, ${firstName}.`,
    "",
    "Recebemos um pedido pra redefinir a senha da sua conta no LBH System.",
    "",
    `Redefinir senha: ${resetUrl}`,
    "",
    `Este link expira em ${expiresIn}.`,
    "",
    "Se nao foi voce que pediu, ignore este email — sua senha atual continua valida. Em caso de suspeita de acesso indevido, escreva pra seguranca@alavanca.com.br.",
    textFooter(),
  ].join("\n");

  return { subject, html, text };
}
