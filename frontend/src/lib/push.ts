// Push notification helpers

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  return (await Notification.requestPermission()) === "granted";
}

export async function subscribePush(registration: ServiceWorkerRegistration): Promise<boolean> {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  if (!vapidKey) return false;
  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    const json = sub.toJSON();
    const keys = json.keys || {};
    await fetch("/api/v1/notifications/push", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
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
  await fetch("/api/v1/notifications/push", {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      p256dh: keys["p256dh"] || "",
      auth: keys["auth"] || "",
    }),
  });
  await sub.unsubscribe();
}
