/**
 * Logger estruturado — JSON em produção, legível em dev.
 * Compatível com Edge runtime (usa console, não process.stdout).
 */
const isProd = process.env.NODE_ENV === "production";

type Level = "info" | "warn" | "error";
type Meta = Record<string, unknown>;

function log(level: Level, message: string, meta?: Meta) {
  if (isProd) {
    const entry = JSON.stringify({
      level,
      message,
      ts: new Date().toISOString(),
      ...meta,
    });
    if (level === "error") console.error(entry);
    else if (level === "warn") console.warn(entry);
    else console.log(entry);
  } else {
    const tag = level === "error" ? "[ERR]" : level === "warn" ? "[WRN]" : "[INF]";
    const suffix = meta ? " " + JSON.stringify(meta) : "";
    if (level === "error") console.error(`${tag} ${message}${suffix}`);
    else if (level === "warn") console.warn(`${tag} ${message}${suffix}`);
    else console.log(`${tag} ${message}${suffix}`);
  }
}

export const logger = {
  info:  (msg: string, meta?: Meta) => log("info",  msg, meta),
  warn:  (msg: string, meta?: Meta) => log("warn",  msg, meta),
  error: (msg: string, meta?: Meta) => log("error", msg, meta),
};
