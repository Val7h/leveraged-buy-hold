/**
 * Helper de preferencias de email — LGPD compliance.
 *
 * Uso tipico antes de enviar email:
 *   import { shouldSendEmail } from "@/lib/email/preferences";
 *   if (await shouldSendEmail(userId, "marketing")) { ... }
 *
 * Notas LGPD:
 * - Emails transacionais (pagamento, password reset, seguranca) NAO podem ser desligados.
 *   Base legal: LGPD art. 7-V (execucao de contrato).
 * - Marketing exige opt-in explicito (default false).
 * - Alertas e product updates sao default-on mas podem ser desabilitados.
 */

import { prisma } from "@/lib/db";

export type EmailKind = "transactional" | "alerts" | "product_updates" | "marketing";

// Defaults aplicados quando o usuario ainda nao tem registro em email_preferences.
// Devem espelhar @default(...) do schema.prisma.
const DEFAULTS: Record<EmailKind, boolean> = {
  transactional: true,
  alerts: true,
  product_updates: true,
  marketing: false,
};

export async function shouldSendEmail(userId: string, kind: EmailKind): Promise<boolean> {
  // Transacional sempre passa — base legal LGPD art. 7-V, nao depende de consentimento.
  if (kind === "transactional") return true;

  try {
    const pref = await prisma.emailPreference.findUnique({
      where: { userId },
      select: {
        alerts: true,
        product_updates: true,
        marketing: true,
      },
    });

    // Sem registro → usa defaults conservadores (marketing off, resto on).
    if (!pref) return DEFAULTS[kind];

    switch (kind) {
      case "alerts":
        return pref.alerts;
      case "product_updates":
        return pref.product_updates;
      case "marketing":
        return pref.marketing;
      default:
        return DEFAULTS[kind];
    }
  } catch {
    // Falha de DB: nao enviar email opcional (privacidade > engajamento).
    // Transacional ja retornou true acima.
    return false;
  }
}
