// Push notification helpers

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function subscribePush(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    const token = localStorage.getItem("access_token");
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // In production set a real VAPID public key via env var
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    });
    const json = sub.toJSON();
    const keys = json.keys || {};
    await fetch(`${API_URL}/api/v1/notifications/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: keys["p256dh"] || "",
        auth: keys["auth"] || "",
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribePush(registration: ServiceWorkerRegistration): Promise<void> {
  const sub = await registration.pushManager.getSubscription();
  if (!sub) return;
  const json = sub.toJSON();
  const keys = json.keys || {};
  const token = localStorage.getItem("access_token");
  await fetch(`${API_URL}/api/v1/notifications/push/unsubscribe`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: keys["p256dh"] || "",
      auth: keys["auth"] || "",
    }),
  });
  await sub.unsubscribe();
}
