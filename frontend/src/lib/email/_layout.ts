/**
 * Helpers internos pra construcao dos templates de email.
 * Centraliza header/footer pra manter consistencia visual e compliance LGPD/CVM.
 *
 * Regras:
 * - HTML inline (sem <style> externo), max-width 600px, font >= 14px
 * - Cor primaria: #00d8d8
 * - Footer com endereco, links legais e aviso LGPD
 */

export const COLORS = {
  primary: "#00d8d8",
  primaryDark: "#00a8a8",
  text: "#1a1a1a",
  muted: "#666666",
  bg: "#f5f7f9",
  card: "#ffffff",
  border: "#e1e5ea",
  warning: "#b45309",
  warningBg: "#fef3c7",
} as const;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lbh-system.onrender.com";
const COMPANY_ADDRESS =
  process.env.COMPANY_ADDRESS || "LBH System — Endereco a definir, Sao Paulo, SP — Brasil";

export interface LayoutOptions {
  /** Conteudo HTML do corpo (ja com paragrafos, botoes etc). */
  bodyHtml: string;
  /** Pre-header opcional (texto curto exibido no preview do cliente). */
  preheader?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa texto pra interpolacao segura em HTML. Use sempre que injetar dado dinamico. */
export function esc(value: string | number): string {
  return escapeHtml(String(value));
}

/** Botao CTA inline. */
export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
    <tr>
      <td align="center" bgcolor="${COLORS.primary}" style="border-radius: 6px;">
        <a href="${esc(url)}" target="_blank" rel="noopener" style="display: inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 15px; font-weight: 600; color: #00181a; text-decoration: none;">${esc(label)}</a>
      </td>
    </tr>
  </table>`;
}

/** Bloco destacado pra disclaimers/avisos. */
export function callout(html: string, variant: "info" | "warning" = "info"): string {
  const bg = variant === "warning" ? COLORS.warningBg : "#e6fbfb";
  const fg = variant === "warning" ? COLORS.warning : "#0a4f4f";
  const border = variant === "warning" ? "#f59e0b" : COLORS.primary;
  return `<div style="margin: 16px 0; padding: 14px 16px; background: ${bg}; border-left: 4px solid ${border}; color: ${fg}; font-size: 14px; line-height: 1.5; border-radius: 4px;">${html}</div>`;
}

/** Disclaimer CVM padrao pra emails com sinal/alerta de ativo. */
export const CVM_DISCLAIMER_HTML = callout(
  `<strong>Aviso CVM:</strong> as informacoes deste alerta sao de carater meramente informativo e educacional, nao constituem recomendacao, oferta, consultoria ou analise de valores mobiliarios. Decisoes de investimento sao de sua exclusiva responsabilidade. Rentabilidade passada nao garante rentabilidade futura. Conforme Oficio-Circular CVM/SIN 04/2023.`,
  "warning"
);

export const CVM_DISCLAIMER_TEXT =
  "Aviso CVM: as informacoes deste alerta sao meramente informativas e educacionais, nao constituem recomendacao, oferta ou analise de valores mobiliarios. Decisoes de investimento sao de sua exclusiva responsabilidade. Rentabilidade passada nao garante futura. Conforme Oficio-Circular CVM/SIN 04/2023.";

/** Monta documento HTML completo pronto pra envio. */
export function renderLayout({ bodyHtml, preheader }: LayoutOptions): string {
  const preheaderHtml = preheader
    ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; visibility: hidden; mso-hide: all;">${esc(preheader)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>LBH System</title>
</head>
<body style="margin: 0; padding: 0; background: ${COLORS.bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: ${COLORS.text};">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${COLORS.bg};">
  <tr>
    <td align="center" style="padding: 24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
        <tr>
          <td style="padding: 8px 4px 16px 4px;">
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; font-size: 22px; font-weight: 800; letter-spacing: 2px; color: ${COLORS.primary};">LBH SYSTEM</div>
            <div style="font-size: 12px; color: ${COLORS.muted}; margin-top: 2px;">Leveraged Buy &amp; Hold — quantitativo no Brasil</div>
          </td>
        </tr>
        <tr>
          <td style="background: ${COLORS.card}; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 28px 28px 24px 28px; font-size: 15px; line-height: 1.6; color: ${COLORS.text};">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 8px; font-size: 12px; color: ${COLORS.muted}; line-height: 1.6;">
            <p style="margin: 0 0 8px 0;">${esc(COMPANY_ADDRESS)}</p>
            <p style="margin: 0 0 8px 0;">
              <a href="${APP_URL}/termos" style="color: ${COLORS.muted}; text-decoration: underline;">Termos de uso</a> &middot;
              <a href="${APP_URL}/privacidade" style="color: ${COLORS.muted}; text-decoration: underline;">Politica de privacidade</a> &middot;
              <a href="${APP_URL}/lgpd" style="color: ${COLORS.muted}; text-decoration: underline;">LGPD</a> &middot;
              <a href="${APP_URL}/conta/preferencias-email" style="color: ${COLORS.muted}; text-decoration: underline;">Cancelar inscricao</a>
            </p>
            <p style="margin: 0; font-size: 11px;">Voce recebe este email porque criou uma conta no LBH System. Em duvida, escreva pra <a href="mailto:contato@alavanca.com.br" style="color: ${COLORS.muted};">contato@alavanca.com.br</a>.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Footer plain-text reutilizavel pelos templates. */
export function textFooter(): string {
  return [
    "",
    "—",
    COMPANY_ADDRESS,
    `Termos: ${APP_URL}/termos`,
    `Privacidade: ${APP_URL}/privacidade`,
    `LGPD: ${APP_URL}/lgpd`,
    `Cancelar inscricao: ${APP_URL}/conta/preferencias-email`,
    "Voce recebe este email porque criou uma conta no LBH System.",
  ].join("\n");
}

/** Formatador BRL — usado em payment-confirmed. */
export function brl(value: number): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }
}

/** Formatador de data curta pt-BR. */
export function dateBR(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
