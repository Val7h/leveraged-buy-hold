/**
 * Template: alerta de estrategia disparado pra um ativo.
 *
 * Conformidade CVM (Of-Circ CVM/SIN 04/2023): linguagem neutra, sem verbos imperativos.
 * Tipos de alerta validos: OPORTUNIDADE | DESFAVORAVEL | NEUTRO.
 */
import { button, callout, CVM_DISCLAIMER_HTML, CVM_DISCLAIMER_TEXT, esc, renderLayout, textFooter } from "../_layout";
import type { EmailContent } from "./welcome";

export type AlertType = "OPORTUNIDADE" | "DESFAVORAVEL" | "NEUTRO";

export interface AlertTriggeredEmailInput {
  name: string;
  ticker: string;
  alertType: AlertType;
  /** Valor relevante no momento do disparo (preco, indicador, score etc). */
  currentValue: string | number;
  dashboardUrl: string;
  /** Nome da estrategia que disparou (opcional, ajuda contexto). */
  strategyName?: string;
}

function labelFor(type: AlertType): { title: string; tone: "info" | "warning" } {
  switch (type) {
    case "OPORTUNIDADE":
      return { title: "Sinal classificado como OPORTUNIDADE", tone: "info" };
    case "DESFAVORAVEL":
      return { title: "Sinal classificado como DESFAVORAVEL", tone: "warning" };
    case "NEUTRO":
    default:
      return { title: "Sinal classificado como NEUTRO", tone: "info" };
  }
}

export function alertTriggeredEmail({
  name,
  ticker,
  alertType,
  currentValue,
  dashboardUrl,
  strategyName,
}: AlertTriggeredEmailInput): EmailContent {
  const firstName = name.trim().split(/\s+/)[0] || "investidor";
  const { title, tone } = labelFor(alertType);
  const tickerUpper = ticker.toUpperCase();
  const valueStr = typeof currentValue === "number" ? currentValue.toLocaleString("pt-BR") : currentValue;
  const subject = `[${alertType}] ${tickerUpper} — alerta LBH disparado`;
  const preheader = `${tickerUpper}: ${title.toLowerCase()} no valor de ${valueStr}.`;

  const strategyLine = strategyName
    ? `<tr><td style="padding: 6px 0; color: #666; width: 140px;">Estrategia</td><td style="padding: 6px 0; font-weight: 600;">${esc(strategyName)}</td></tr>`
    : "";

  const html = renderLayout({
    preheader,
    bodyHtml: `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">Alerta LBH — ${esc(tickerUpper)}</h1>
      <p style="margin: 0 0 14px 0;">Ola, ${esc(firstName)}. Um alerta configurado por voce foi disparado:</p>

      ${callout(`<strong>${esc(title)}</strong>`, tone)}

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 16px 0; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #666; width: 140px;">Ativo</td><td style="padding: 6px 0; font-weight: 600;">${esc(tickerUpper)}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Classificacao</td><td style="padding: 6px 0; font-weight: 600;">${esc(alertType)}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Valor de referencia</td><td style="padding: 6px 0; font-weight: 600;">${esc(valueStr)}</td></tr>
        ${strategyLine}
        <tr><td style="padding: 6px 0; color: #666;">Disparado em</td><td style="padding: 6px 0;">${esc(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }))}</td></tr>
      </table>

      ${button("Abrir no dashboard", dashboardUrl)}

      ${CVM_DISCLAIMER_HTML}
    `,
  });

  const text = [
    `Alerta LBH — ${tickerUpper}`,
    "",
    `Ola, ${firstName}. Um alerta configurado por voce foi disparado.`,
    "",
    title,
    "",
    `Ativo: ${tickerUpper}`,
    `Classificacao: ${alertType}`,
    `Valor de referencia: ${valueStr}`,
    strategyName ? `Estrategia: ${strategyName}` : "",
    `Disparado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    "",
    `Abrir no dashboard: ${dashboardUrl}`,
    "",
    CVM_DISCLAIMER_TEXT,
    textFooter(),
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}
