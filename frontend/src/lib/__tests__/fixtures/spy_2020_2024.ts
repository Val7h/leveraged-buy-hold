/**
 * Fixture deterministica de fechamentos diarios simulando SPY 2020-2024.
 *
 * Gerada via random walk com seed fixa (LCG) para garantir reprodutibilidade
 * cross-platform (Math.random nao e deterministico). Aproximadamente 5 anos
 * de trading days (252 * 5 = 1260, usamos 1259 para baterminar com a janela
 * util de calculo).
 *
 * Caracteristicas estatisticas alvo (calibradas via seed=42):
 *  - Drift diario ~ 0.04% (~10% a.a.)
 *  - Vol diaria ~ 1.15% (~18% a.a. anualizada)
 *  - Preco inicial: 300
 *
 * NAO usar fora de testes — nao representa dados reais do SPY.
 */
export const SPY_CLOSES: number[] = (() => {
  const arr: number[] = [300];
  let seed = 42;
  const rand = () => {
    // Linear Congruential Generator (Numerical Recipes constants).
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 1; i < 1259; i++) {
    // Retorno diario ~ U(-0.02, 0.02) + drift 0.04%.
    const r = (rand() - 0.5) * 0.04 + 0.0004;
    arr.push(arr[i - 1] * (1 + r));
  }
  return arr;
})();

/** Sequencia monotonica crescente — RSI deve saturar em 100. */
export const MONOTONIC_UP: number[] = Array.from(
  { length: 30 },
  (_, i) => 100 + i * 1.5,
);

/** Sequencia monotonica decrescente — RSI deve cair abaixo de 30. */
export const MONOTONIC_DOWN: number[] = Array.from(
  { length: 30 },
  (_, i) => 200 - i * 1.5,
);

/** Sequencia constante — vol deve ser 0. */
export const FLAT: number[] = Array.from({ length: 30 }, () => 100);
