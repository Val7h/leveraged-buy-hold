/**
 * Template: alerta de SOBREVIVÊNCIA disparado (stop ancorado no PM ou liquidação se aproximando).
 *
 * A Camada Sentinela existe para a SOBREVIVÊNCIA (princípio nº1 previdenciário: sobreviver = tudo),
 * NÃO para day-trade. Estes e-mails só saem em severidade crítica (stop -20/-30, folga de
 * liquidação < 15%) — o canal escala com a gravidade.
 *
 * Conformidade CVM (Of-Circ CVM/SIN 04/2023): linguagem neutra/informativa, sem ordem de operação.
 */
import { button, callout, CVM_DISCLAIMER_HTML, CVM_DISCLAIMER_TEXT, esc, renderLayout, textFooter } from "../_layout";
import type { EmailContent } from "./welcome";

export type SurvivalAlertKind = "stop_pm" | "liq_near";

export interface SurvivalAlertEmailInput {
  name: string;
  ticker: string;
  kind: SurvivalAlertKind;
  /** Frase pronta descrevendo o gatilho (ex.: "caiu -20% do PM real da posição"). */
  headline: string;
  /** Ação sugerida (informativa, não-imperativa) — ex.: "avaliar reduzir fração e abater dívida". */
  suggestion: string;
  currentPrice: number | string;
  dashboardUrl: string;
}

export function survivalAlertEmail({
  name,
  ticker,
  kind,
  headline,
  suggestion,
  currentPrice,
  dashboardUrl,
}: SurvivalAlertEmailInput): EmailContent {
  const firstName = name.trim().split(/\s+/)[0] || "investidor";
  const tickerUpper = ticker.toUpperCase();
  const title =
    kind === "liq_near"
      ? "Folga de liquidação encolhendo"
      : "Stop escalonado ancorado no PM acionado";
  const valueStr =
    typeof currentPrice === "number" ? currentPrice.toLocaleString("pt-BR") : String(currentPrice);
  const subject = `[SOBREVIVÊNCIA] ${tickerUpper} — ${title}`;
  const preheader = `${tickerUpper}: ${headline}`;

  const html = renderLayout({
    preheader,
    bodyHtml: `
      <h1 style="margin: 0 0 12px 0; font-size: 22px; line-height: 1.3;">Sentinela LBH — ${esc(tickerUpper)}</h1>
      <p style="margin: 0 0 14px 0;">Ola, ${esc(firstName)}. Um marco de sobrevivencia da sua posicao foi alcancado:</p>

      ${callout(`<strong>${esc(title)}</strong><br/>${esc(headline)}`, "warning")}

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin: 16px 0; font-size: 14px;">
        <tr><td style="padding: 6px 0; color: #666; width: 150px;">Ativo</td><td style="padding: 6px 0; font-weight: 600;">${esc(tickerUpper)}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Preco atual</td><td style="padding: 6px 0; font-weight: 600;">${esc(valueStr)}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Leitura sugerida</td><td style="padding: 6px 0;">${esc(suggestion)}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">Detectado em</td><td style="padding: 6px 0;">${esc(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }))}</td></tr>
      </table>

      ${button("Abrir no dashboard", dashboardUrl)}

      ${CVM_DISCLAIMER_HTML}
    `,
  });

  const text = [
    `Sentinela LBH — ${tickerUpper}`,
    "",
    `Ola, ${firstName}. Um marco de sobrevivencia da sua posicao foi alcancado.`,
    "",
    title,
    headline,
    "",
    `Ativo: ${tickerUpper}`,
    `Preco atual: ${valueStr}`,
    `Leitura sugerida: ${suggestion}`,
    `Detectado em: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
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
