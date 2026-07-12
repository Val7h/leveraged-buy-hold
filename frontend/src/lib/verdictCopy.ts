/**
 * verdictCopy.ts
 *
 * Tradução ÚNICA e centralizada da apresentação de cada ativo para o
 * português de um investidor comum (leigo). O objetivo é eliminar o jargão
 * e resolver os paradoxos que confundiam o leitor na revisão de usuário —
 * principalmente "JUSTO + 3x" e "COMPRAR FORTE + 1x".
 *
 * Este helper é a fonte da verdade da cópia: é importado tanto pelo
 * RankingPage quanto pelo AssetCard, para que ambos falem a mesma língua e
 * mostrem exatamente a MESMA alavancagem canônica por ativo.
 */

export type Verdict =
  | 'COMPRAR FORTE'
  | 'COMPRAR'
  | 'JUSTO'
  | 'ESTICADO'
  | 'ESPECULATIVO'
  | 'RESERVA';

export type Confidence = 'ALTA' | 'MEDIA' | 'BAIXA';

export type Tone = 'buy' | 'strong' | 'hold' | 'avoid' | 'reserve';

/** Formato flexível — nem todos os campos vêm sempre preenchidos. */
export interface AssetLike {
  verdict?: Verdict | string | null;
  quality?: number | null;
  leverage?: number | null;
  recommended_leverage?: number | null;
  max_dd?: number | null;
  beta?: number | null;
  dividend_yield?: number | null;
  quality_data_thin?: boolean | null;
  confidence?: Confidence | string | null;
  ticker?: string | null;
  distance_ma200?: number | null;
  [key: string]: unknown;
}

/**
 * A ÚNICA alavancagem a mostrar por ativo. É a canônica por-ativo — NÃO é
 * Kelly nem alavancagem agregada de carteira.
 */
export function canonicalLeverage(a: AssetLike | any): number | null {
  if (!a) return null;
  const lev = a.leverage ?? a.recommended_leverage ?? null;
  if (lev === null || lev === undefined) return null;
  const n = Number(lev);
  return Number.isFinite(n) ? n : null;
}

/** Rótulo padrão para a alavancagem canônica. */
export function leverageLabel(): string {
  return 'Alavancagem sugerida';
}

/**
 * Linha de risco derivada do max_dd (queda máxima histórica).
 * Ex.: "Já caiu até 44% no passado". null quando não há dado.
 */
export function riskLine(a: AssetLike | any): string | null {
  if (!a) return null;
  const dd = a.max_dd;
  if (dd === null || dd === undefined) return null;
  const n = Number(dd);
  if (!Number.isFinite(n) || n === 0) return null;
  const pct = Math.round(Math.abs(n));
  return `Já caiu até ${pct}% no passado`;
}

/**
 * Uma frase curta em PT de investidor comum que junta SINAL + ALAVANCAGEM +
 * porquê, resolvendo os paradoxos. Usa canonicalLeverage; lev = canônica || 1.
 * Tolerância: lev > 1.05 conta como ">1".
 */
export function plainVerdict(a: AssetLike | any): { text: string; tone: Tone } {
  const verdict = a?.verdict ?? null;
  const lev = canonicalLeverage(a) ?? 1;
  const canLever = lev > 1.05;
  const levStr = (Number.isInteger(lev) ? lev.toString() : lev.toFixed(1));

  switch (verdict) {
    case 'ESPECULATIVO':
    case 'ESTICADO':
      return {
        tone: 'avoid',
        text: 'Cara ou arriscada agora — se comprar, à vista (1x), sem alavancar.',
      };

    case 'RESERVA':
      return {
        tone: 'reserve',
        text: 'Reserva/munição — fora de aporte agora.',
      };

    case 'COMPRAR FORTE':
      return canLever
        ? {
            tone: 'strong',
            text: `Barata e sólida — dá pra aportar alavancado até ${levStr}x.`,
          }
        : {
            tone: 'strong',
            text: 'Ótima agora, mas volátil ou ilíquida demais pra alavancar — aporte à vista (1x).',
          };

    case 'COMPRAR':
      return canLever
        ? {
            tone: 'buy',
            text: `Boa pra aportar agora, até ${levStr}x.`,
          }
        : {
            tone: 'buy',
            text: 'Boa pra aportar, mas à vista (1x) — não vale alavancar.',
          };

    case 'JUSTO':
      // Resolve o paradoxo JUSTO + 3x: preço sem desconto, mas defensiva.
      return canLever
        ? {
            tone: 'hold',
            text: `Preço sem desconto, mas é defensiva e segura — dá pra alavancar até ${levStr}x mesmo sem estar barata (quase não cai forte).`,
          }
        : {
            tone: 'hold',
            text: 'Preço sem desconto — se quiser, aporte à vista (1x) e espere ficar barata.',
          };

    default:
      return {
        tone: 'hold',
        text: 'Sem sinal claro agora.',
      };
  }
}
