// Validação de variáveis de ambiente críticas no startup (server-side only).
// Chamado em lib/db.ts e lib/auth.ts implicitamente via prisma/next-auth.
// Loga avisos sem derrubar o servidor — falhas silenciosas são piores que avisos.

const REQUIRED_SERVER = [
  "DATABASE_URL",
  "AUTH_SECRET",            // lib/auth.ts assina/verifica a sessão JWT com esta var
  "BACKEND_INTERNAL_URL",
  "BACKEND_INTERNAL_TOKEN",
] as const;

const OPTIONAL_SERVER = [
  "RESEND_API_KEY",
  "FINNHUB_API_KEY",
  "DIRECT_DATABASE_URL",
] as const;

export function validateEnv() {
  if (typeof window !== "undefined") return; // client-side: skip

  const missing = REQUIRED_SERVER.filter((k) => !process.env[k]);
  const unset   = OPTIONAL_SERVER.filter((k) => !process.env[k]);

  if (missing.length) {
    console.error(
      `[LBH] ⚠️  Env vars OBRIGATÓRIAS ausentes: ${missing.join(", ")}. ` +
      "Algumas funcionalidades podem falhar."
    );
  }
  if (unset.length) {
    console.warn(
      `[LBH] ℹ️  Env vars opcionais não configuradas: ${unset.join(", ")}.`
    );
  }
}

export const env = {
  backendUrl: process.env.BACKEND_INTERNAL_URL ?? "http://localhost:8001",
  backendToken: process.env.BACKEND_INTERNAL_TOKEN ?? "",
  finnhubKey: process.env.FINNHUB_API_KEY ?? "",
  resendKey: process.env.RESEND_API_KEY ?? "",
  isDev: process.env.NODE_ENV !== "production",
} as const;
