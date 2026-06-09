// LBH System — Service Worker KILL SWITCH
//
// IMPORTANTE: este arquivo SUBSTITUI qualquer SW anterior (incluindo versoes
// antigas que tinham fetch handler e estavam servindo 503 para chunks JS).
// Quando o browser do usuario detectar este novo sw.js, ele dispara
// install -> activate -> e o codigo abaixo desregistra a si mesmo e limpa
// todos os caches, voltando o site ao funcionamento normal.

self.addEventListener("install", (event) => {
  // Pula a fase de waiting e ativa imediatamente.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Limpa TODOS os caches deste Service Worker.
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((n) => caches.delete(n)));

        // Toma controle de todas as abas abertas imediatamente.
        await self.clients.claim();

        // Desregistra a si mesmo — proxima request vai direto para o servidor.
        await self.registration.unregister();

        // Forca reload de todas as abas para limpar o estado.
        const allClients = await self.clients.matchAll({ type: "window" });
        for (const client of allClients) {
          client.navigate(client.url);
        }
      } catch {
        // Se algo falhar, melhor nao deixar o SW funcionando — auto-unregister
        try { await self.registration.unregister(); } catch {}
      }
    })()
  );
});

// Sem fetch handler. Sem push handler. Este SW so existe pra se autodestruir.
