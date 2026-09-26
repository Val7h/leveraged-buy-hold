/**
 * Unit tests for lib/verdictCopy.ts (copia PT-BR centralizada do veredito).
 *
 * Testes escritos por leitura do codigo — refletem o comportamento ATUAL,
 * incluindo os literais acentuados exatamente como o arquivo os escreve
 * (em-dash "—", "segurança", "munição", "Ótima", "Preço", etc.).
 */
import { describe, it, expect } from 'vitest';
import {
  canonicalLeverage,
  capReason,
  plainVerdict,
} from '../verdictCopy';

// ──────────────────────────────────────────────────────────────────
// canonicalLeverage
// ──────────────────────────────────────────────────────────────────
describe('canonicalLeverage', () => {
  it('retorna o numero quando o asset tem alavancagem canonica', () => {
    expect(canonicalLeverage({ leverage: 3 })).toBe(3);
    expect(canonicalLeverage({ leverage: 1 })).toBe(1);
  });

  it('usa recommended_leverage como fallback quando leverage esta ausente', () => {
    expect(canonicalLeverage({ recommended_leverage: 2 })).toBe(2);
  });

  it('prefere leverage quando ambos os campos existem', () => {
    expect(canonicalLeverage({ leverage: 3, recommended_leverage: 2 })).toBe(3);
  });

  it('retorna null para asset vazio (sem campos de alavancagem)', () => {
    // Implementacao: leverage ?? recommended_leverage ?? null -> null.
    expect(canonicalLeverage({})).toBeNull();
  });

  it('retorna null para asset null/undefined', () => {
    expect(canonicalLeverage(null)).toBeNull();
    expect(canonicalLeverage(undefined)).toBeNull();
  });

  it('retorna null quando o valor nao e finito', () => {
    expect(canonicalLeverage({ leverage: 'abc' })).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────
// capReason
// ──────────────────────────────────────────────────────────────────
describe('capReason', () => {
  it.each([
    'gate', 'GATE', 'Gate',
    'beta', 'BETA',
    'gap', 'GAP',
    'sigma', 'SIGMA',
  ])("retorna 'travada por segurança' para binding '%s' (maiuscula ou minuscula)", (binding) => {
    expect(capReason({ leverage_teto_binding: binding })).toBe('travada por segurança');
  });

  it("retorna 'travada pela liquidez' para binding 'liquidez'", () => {
    expect(capReason({ leverage_teto_binding: 'liquidez' })).toBe('travada pela liquidez');
  });

  it("retorna frase contendo 'dado fino' quando quality_data_thin = true", () => {
    const r = capReason({ quality_data_thin: true });
    expect(r).toContain('dado fino');
    expect(r).toBe('por dado fino — dá pra mais quando confirmar');
  });

  it("retorna frase contendo 'dado fino' para binding 'regime'", () => {
    const r = capReason({ leverage_teto_binding: 'regime' });
    expect(r).toContain('dado fino');
    expect(r).toBe('por dado fino — dá pra mais quando confirmar');
  });

  it('retorna null sem binding e sem thin', () => {
    expect(capReason({})).toBeNull();
    expect(capReason({ quality_data_thin: false })).toBeNull();
    expect(capReason({ leverage_teto_binding: 'outro-motivo' })).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────
// plainVerdict
// ──────────────────────────────────────────────────────────────────
describe('plainVerdict', () => {
  it.each(['ESPECULATIVO', 'ESTICADO'])(
    "%s -> tone 'avoid' e texto contendo 'vista'",
    (verdict) => {
      const r = plainVerdict({ verdict });
      expect(r.tone).toBe('avoid');
      expect(r.text).toContain('vista');
      expect(r.text).toBe('Cara ou arriscada agora — se comprar, à vista (1x), sem alavancar.');
    },
  );

  it("RESERVA -> tone 'reserve'", () => {
    const r = plainVerdict({ verdict: 'RESERVA' });
    expect(r.tone).toBe('reserve');
    expect(r.text).toBe('Reserva/munição — fora de aporte agora.');
  });

  it("COMPRAR FORTE alavancado -> tone 'strong' e texto contendo o multiplo", () => {
    const r = plainVerdict({ verdict: 'COMPRAR FORTE', leverage: 3 });
    expect(r.tone).toBe('strong');
    expect(r.text).toContain('3x');
    expect(r.text).toBe('Barata e sólida — dá pra aportar alavancado até 3x.');
  });

  it("COMPRAR FORTE 1x com binding beta -> texto contem 'travada por segurança'", () => {
    const r = plainVerdict({
      verdict: 'COMPRAR FORTE',
      leverage: 1,
      leverage_teto_binding: 'beta',
    });
    expect(r.tone).toBe('strong');
    expect(r.text).toContain('travada por segurança');
    expect(r.text).toBe('Ótima agora, mas à vista (1x) (travada por segurança) — aporte sem alavancar.');
  });

  it("COMPRAR 1x com quality_data_thin -> texto contem 'dado fino'", () => {
    const r = plainVerdict({
      verdict: 'COMPRAR',
      leverage: 1,
      quality_data_thin: true,
    });
    expect(r.tone).toBe('buy');
    expect(r.text).toContain('dado fino');
    expect(r.text).toBe('Boa pra aportar, mas à vista (1x) (por dado fino — dá pra mais quando confirmar).');
  });

  it("JUSTO alavancado -> tone 'hold'", () => {
    const r = plainVerdict({ verdict: 'JUSTO', leverage: 2 });
    expect(r.tone).toBe('hold');
    expect(r.text).toBe(
      'Preço sem desconto, mas é defensiva e segura — dá pra alavancar até 2x mesmo sem estar barata (quase não cai forte).',
    );
  });

  it("verdict desconhecido -> texto 'Sem sinal claro agora'", () => {
    const r = plainVerdict({ verdict: 'DESCONHECIDO' });
    expect(r.tone).toBe('hold');
    expect(r.text).toBe('Sem sinal claro agora.');
  });

  it('asset sem verdict cai no default', () => {
    const r = plainVerdict({});
    expect(r.tone).toBe('hold');
    expect(r.text).toBe('Sem sinal claro agora.');
  });
});
