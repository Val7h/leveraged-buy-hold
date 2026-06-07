// Descrições de funcionalidades para tooltips
export const TOOLTIPS = {
  // Dashboard Metrics
  "market-state": "Estado atual do mercado baseado em RSI, MM200 e topo de 52 semanas do SPY",
  "market-multiplier": "Multiplicador dinâmico de entrada: 2x em topo, 3x normal, 4x em capitulação",
  "rsi-spy": "Índice de Força Relativa do SPY (semanal) - Abaixo de 38 = zona de compra",
  "distance-ma200": "Distância percentual do SPY à sua média móvel de 200 dias",
  "patrimonio": "Valor total do seu portfólio em reais",
  "exposicao": "Percentual do patrimônio investido em ativos",
  "dividend-yield": "Rendimento de dividendos anualizados das suas posições",
  "var-95": "Perda máxima esperada em 95% dos cenários (próximos 30 dias)",
  "drawdown": "Queda percentual máxima do seu patrimônio desde o pico",
  "sharpe": "Retorno ajustado ao risco (quanto retorno por unidade de risco)",
  "cagr": "Retorno anualizado composto da sua carteira",
  "desalavancagem": "Alavancagem média ponderada de todas suas posições",

  // Screening
  "quality-score": "Qualidade do ativo: beta baixo, drawdown baixo, dividendos altos, Sharpe, volatilidade",
  "opportunity-score": "Oportunidade de entrada: RSI semanal baixo, posição acima/abaixo das Bandas de Bollinger",
  "composite-score": "Score composto: média ponderada de Qualidade (60%) e Oportunidade (40%)",
  "entry-signal": "Sinal técnico do modelo (OPORTUNIDADE/NEUTRO/DESFAVORÁVEL) calculado a partir de RSI semanal + estado do mercado. NÃO é recomendação de compra/venda.",
  "kelly-criterion": "Alavancagem sugerida pelo modelo de Kelly Criterion a partir de heurísticas de win-rate. Cenário matemático, não recomendação operacional.",

  // Backtest
  "backtest-cagr": "Retorno anualizado composto da estratégia no período testado",
  "backtest-drawdown": "Queda máxima experimentada durante o backteste",
  "backtest-sharpe": "Qualidade do retorno ajustado ao risco da estratégia",
  "win-rate": "Percentual de operações que tiveram ganho",

  // Sharpe Compare
  "sharpe-rank": "Ranking de ativos por retorno ajustado ao risco desde 2015",
  "sharpe-survival": "Ativos que sobreviveram vs. liquidados no crash de março/2020",

  // Simulator
  "monte-carlo": "Simula 1.000 cenários futuros com volatilidade e correlações históricas",
  "confidence-95": "Faixa de valores esperados com 95% de confiança",

  // Alerts
  "price-alert": "Alerta quando o preço atinge um nível definido",
  "rsi-alert": "Alerta quando RSI semanal cruza valores críticos (entrada/saída)",
  "signal-alert": "Alerta quando o modelo identifica novo cenário de OPORTUNIDADE",
  "score-alert": "Alerta quando o score do ativo atinge um nível mínimo",
  "drawdown-alert": "Alerta quando a queda acumulada excede um limite",

  // Positions
  "leverage-recommendation": "Alavancagem sugerida pelo modelo Kelly Criterion (heurística estatística — não é recomendação operacional)",
  "stop-loss": "Nível de preço onde a posição será encerrada (proteção)",
  "position-size": "Tamanho ideal da posição pelo Kelly Criterion",
};
