// LBH System — Service Worker (Push Notifications)
const CACHE_NAME = "lbh-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(clients.claim());
});

// Handle push events from server
self.addEventListener("push", (e) => {
  if (!e.data) return;
  const data = e.data.json();
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: data.tag || "lbh-notification",
    data: { url: data.url || "/notifications" },
    actions: [
      { action: "open", title: "Ver detalhes" },
      { action: "dismiss", title: "Dispensar" },
    ],
  };
  e.waitUntil(self.registration.showNotification(data.title || "LBH System", options));
});

// Handle notification click
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  if (e.action === "dismiss") return;

  const url = e.notification.data?.url || "/notifications";
  e.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
