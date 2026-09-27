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
  return 'Teto simulado de alavancagem';
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
// POR QUE a alavancagem foi capada — a distinção mais acionável p/ a doutrina (parecer do par):
// teto por SEGURANÇA (o risco do ativo te liquidaria → aceite) vs por DADO/regime (poderia dar
// mais quando o dado/regime confirmar → empurre). Retorna a razão curta ou null (sem cap relevante).
export function capReason(a: AssetLike | any): string | null {
  const bind = (a?.leverage_teto_binding ?? '').toString().toLowerCase();
  const thin = a?.quality_data_thin === true;
  if (['gate', 'beta', 'gap', 'sigma'].includes(bind)) return 'travada por segurança';
  if (bind === 'liquidez') return 'travada pela liquidez';
  if (thin || bind === 'regime') return 'por dado limitado — o teto pode subir quando os dados confirmarem';
  return null;
}

/**
 * Rótulo de EXIBIÇÃO do veredito (descaracterização CVM 27/09): o payload
 * interno continua 'COMPRAR FORTE'/'COMPRAR' (contrato com o motor), mas a
 * TELA mostra classificação objetiva, sem verbo de recomendação.
 */
export function verdictLabel(v?: string | null): string {
  switch (v) {
    case 'COMPRAR FORTE': return 'OPORTUNIDADE FORTE';
    case 'COMPRAR': return 'OPORTUNIDADE';
    case 'JUSTO': return 'NEUTRO';
    case 'ESTICADO': return 'ESTICADO';
    case 'ESPECULATIVO': return 'ESPECULATIVO';
    case 'RESERVA': return 'RESERVA';
    default: return v ?? '—';
  }
}

export function plainVerdict(a: AssetLike | any): { text: string; tone: Tone } {
  const verdict = a?.verdict ?? null;
  const lev = canonicalLeverage(a) ?? 1;
  const canLever = lev > 1.05;
  const levStr = (Number.isInteger(lev) ? lev.toString() : lev.toFixed(1));
  const why = capReason(a);
  const whySuffix = why ? ` (${why})` : '';

  switch (verdict) {
    case 'ESPECULATIVO':
    case 'ESTICADO':
      return {
        tone: 'avoid',
        text: 'Classificação desfavorável: preço esticado ou risco elevado pelos critérios do modelo — sem margem de segurança no momento.',
      };

    case 'RESERVA':
      return {
        tone: 'reserve',
        text: 'Classificação: reserva de proteção — fora da zona de oportunidade do modelo.',
      };

    case 'COMPRAR FORTE':
      return canLever
        ? {
            tone: 'strong',
            text: `Oportunidade forte pelos critérios do modelo: preço descontado e fundamentos sólidos. Nas simulações históricas, posições assim suportaram até ${levStr}x sem liquidação.`,
          }
        : {
            tone: 'strong',
            text: `Oportunidade forte pelos critérios do modelo, com teto simulado de 1x${whySuffix}.`,
          };

    case 'COMPRAR':
      return canLever
        ? {
            tone: 'buy',
            text: `Oportunidade pelos critérios do modelo — teto simulado de sobrevivência: ${levStr}x.`,
          }
        : {
            tone: 'buy',
            text: `Oportunidade pelos critérios do modelo, com teto simulado de 1x${whySuffix}.`,
          };

    case 'JUSTO':
      // Resolve o paradoxo JUSTO + 3x: preço sem desconto, mas defensiva.
      return canLever
        ? {
            tone: 'hold',
            text: `Preço sem desconto; perfil defensivo com histórico de quedas raso — teto simulado de sobrevivência: ${levStr}x.`,
          }
        : {
            tone: 'hold',
            text: `Preço sem desconto — fora da zona de oportunidade; teto simulado de 1x${whySuffix}.`,
          };

    default:
      return {
        tone: 'hold',
        text: 'Sem classificação clara no momento.',
      };
  }
}
