import { NextResponse } from "next/server";

/**
 * GET /api/reset
 *
 * Endpoint de emergencia que limpa cache, cookies, storage e Service Workers
 * automaticamente via header HTTP Clear-Site-Data (W3C).
 *
 * Estrategia de redirect em 3 camadas (resiliencia maxima):
 *  1. window.location.replace via JS (imediato)
 *  2. Meta refresh HTML (fallback em 2s, funciona sem JS)
 *  3. Botao manual visivel "Voltar agora" (escape do limbo)
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Limpando…</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="2; url=/">
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
  .spinner { width: 32px; height: 32px; border: 3px solid #00d8d8; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  p { font-size: 14px; color: #aaa; margin: 4px 0; max-width: 320px; }
  a.btn { margin-top: 24px; display: inline-block; padding: 10px 20px; background: #00d8d8; color: #0a0a0a; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; }
  a.btn:hover { background: #00b8b8; }
  .hint { font-size: 11px; color: #666; margin-top: 16px; }
</style>
<script>
(async function () {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) { try { await r.unregister(); } catch (_) {} }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) { try { await caches.delete(k); } catch (_) {} }
    }
    localStorage.clear();
    sessionStorage.clear();
  } catch (_) {}
  // Redirect IMEDIATO via JS. Se falhar, meta refresh pega em 2s.
  // Se ambos falharem, usuario clica no botao manual.
  window.location.replace('/');
})();
</script>
</head>
<body>
<div class="spinner"></div>
<p><strong>Limpando cache e estado…</strong></p>
<p>Você será redirecionado em segundos.</p>
<a class="btn" href="/">Voltar agora</a>
<p class="hint">Se nada acontecer, clique no botão acima.</p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Clear-Site-Data": '"cache", "cookies", "storage", "executionContexts"',
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
