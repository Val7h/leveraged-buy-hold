/**
 * Controle de versao dos documentos legais.
 *
 * IMPORTANTE: ao alterar o texto de qualquer documento legal, bump
 * a versao aqui. O backend usa essa versao para registrar o consent_log
 * imutavel (LGPD Art. 8 §2 — onus da prova do consentimento).
 *
 * Padrao SemVer:
 *  - MAJOR: mudanca material (foro, limitacoes, finalidades de tratamento)
 *  - MINOR: nova secao ou direito adicionado
 *  - PATCH: correcoes de redacao sem efeito juridico
 */
export const LEGAL_VERSIONS = {
  // 1.1.0 (26/09/2026): nova secao 5-A Planos Pagos e Pagamento (renovacao,
  // cancelamento, arrependimento CDC 49, reajuste, inadimplencia) + identidade
  // legal real (Lemon Tech) no rodape/controller.
  terms: { version: "1.1.0", updatedAt: "2026-09-26" },
  // 1.0.1 (26/09/2026): gateway de pagamento corrigido Asaas -> Stripe.
  privacy: { version: "1.0.1", updatedAt: "2026-09-26" },
  risk: { version: "1.0.0", updatedAt: "2026-06-07" },
  cookies: { version: "1.0.0", updatedAt: "2026-06-07" },
  disclaimer: { version: "1.0.0", updatedAt: "2026-06-07" },
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const DPO_EMAIL = "dpo@lbh-system.com.br";

// Identidade legal REAL (Decreto 7.962/2013 exige razao social, CNPJ, endereco
// e contato em comercio eletronico). Dados conferidos na Receita (consulta
// publica) em 29/06/2026; cofre juridico do dono é a fonte.
export const CONTROLLER_NAME =
  "RENATA ESTRELA SILVA GUIMARAES (Lemon Tech) — CNPJ 47.918.130/0001-71";
export const CONTROLLER_CNPJ = "47.918.130/0001-71";
export const CONTROLLER_TRADE_NAME = "Lemon Tech";
export const CONTROLLER_ADDRESS =
  "Av. Elpidio de Almeida, 1077, Sala 04 — Catole, Campina Grande/PB, CEP 58410-215";
