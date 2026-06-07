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
  terms: { version: "1.0.0", updatedAt: "2026-06-07" },
  privacy: { version: "1.0.0", updatedAt: "2026-06-07" },
  risk: { version: "1.0.0", updatedAt: "2026-06-07" },
  cookies: { version: "1.0.0", updatedAt: "2026-06-07" },
  disclaimer: { version: "1.0.0", updatedAt: "2026-06-07" },
} as const;

export type LegalDocumentType = keyof typeof LEGAL_VERSIONS;

export const DPO_EMAIL = "dpo@lbh-system.com.br";
export const CONTROLLER_NAME = "LBH System (em estruturacao juridica)";
