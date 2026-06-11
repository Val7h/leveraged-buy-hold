import { NextResponse } from "next/server";

/**
 * GET /api/v1/_reset
 *
 * Endpoint de emergencia que retorna o header HTTP `Clear-Site-Data`.
 * O navegador ENTAO limpa AUTOMATICAMENTE (sem intervencao do usuario):
 *   - cache
 *   - cookies
 *   - storage (localStorage, sessionStorage, IndexedDB)
 *   - executionContexts (incluindo Service Workers)
 *
 * Apos limpar, redireciona para /. Isso resolve qualquer caso de SW antigo
 * cacheando chunks JS antigos ou estado inconsistente do localStorage.
 *
 * Uso: usuario acessa https://lbh-system.onrender.com/api/v1/_reset no browser.
 *
 * Spec: https://www.w3.org/TR/clear-site-data/
 * Suporte: Chrome, Firefox, Edge, Opera. Safari ignora silenciosamente.
 */
export async function GET() {
  const res = new NextResponse(
    `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Limpando…</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .spinner { width: 32px; height: 32px; border: 3px solid #00d8d8; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  p { font-size: 14px; color: #aaa; }
</style>
<script>
(async function () {
  // Belt and suspenders: tambem limpa via JS caso o browser nao honre Clear-Site-Data.
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
  setTimeout(function () { window.location.replace('/'); }, 1500);
})();
</script>
</head>
<body>
<div class="spinner"></div>
<p>Limpando cache e voltando à página inicial…</p>
</body>
</html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Header magico: navegador limpa TUDO automaticamente.
        "Clear-Site-Data": '"cache", "cookies", "storage", "executionContexts"',
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
  return res;
}
