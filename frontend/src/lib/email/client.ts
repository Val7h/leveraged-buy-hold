/**
 * Cliente de email transacional (Resend).
 *
 * - Com RESEND_API_KEY: envia via fetch direto pra https://api.resend.com/emails
 * - Sem RESEND_API_KEY (dev/local): modo stub, loga payload e retorna id sintético
 *
 * Nao usamos @resend/sdk pra evitar dependencia extra; fetch nativo basta.
 */
import { logger } from "@/lib/logger";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Override opcional do remetente (caso contrario usa EMAIL_FROM ou default). */
  from?: string;
  /** Reply-To opcional. */
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const DEFAULT_FROM = "LBH System <noreply@alavanca.com.br>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

function resolveFrom(override?: string): string {
  if (override && override.trim().length > 0) return override;
  const envFrom = process.env.EMAIL_FROM;
  if (envFrom && envFrom.trim().length > 0) return envFrom;
  return DEFAULT_FROM;
}

function stubId(): string {
  // crypto.randomUUID disponivel em Node 19+ e Edge runtime
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `stub-${uuid}`;
}

/**
 * Envia email transacional. Em ambiente sem RESEND_API_KEY opera em modo stub
 * (loga payload e retorna sucesso sintetico) — util pra dev/testes locais.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { to, subject, html, text, from, replyTo } = input;
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = resolveFrom(from);
  const recipients = Array.isArray(to) ? to : [to];

  if (!apiKey || apiKey.trim().length === 0) {
    const id = stubId();
    logger.info("email.stub_mode", {
      reason: "RESEND_API_KEY ausente",
      id,
      from: fromAddress,
      to: recipients,
      subject,
      textPreview: text.slice(0, 120),
    });
    return { ok: true, id };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    const raw = await res.text();
    let parsed: unknown = null;
    try {
      parsed = raw.length > 0 ? JSON.parse(raw) : null;
    } catch {
      parsed = raw;
    }

    if (!res.ok) {
      const message =
        (parsed && typeof parsed === "object" && parsed !== null && "message" in parsed
          ? String((parsed as { message?: unknown }).message)
          : `HTTP ${res.status}`) || `HTTP ${res.status}`;
      logger.error("email.send_failed", {
        status: res.status,
        to: recipients,
        subject,
        body: parsed,
      });
      return { ok: false, error: message };
    }

    const id =
      parsed && typeof parsed === "object" && parsed !== null && "id" in parsed
        ? String((parsed as { id?: unknown }).id)
        : undefined;

    logger.info("email.sent", { id, to: recipients, subject });
    return { ok: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    logger.error("email.exception", { to: recipients, subject, error: message });
    return { ok: false, error: message };
  }
}
