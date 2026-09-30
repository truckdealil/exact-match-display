/**
 * OneSignal Web Push configuration. Set VITE_ONESIGNAL_APP_ID to activate.
 * Loading is lazy and browser-only so SSR is untouched.
 */

const APP_ID = import.meta.env["VITE_ONESIGNAL_APP_ID"] as string | undefined;

type OneSignalDeferred = Array<(os: unknown) => void | Promise<void>>;

declare global {
  interface Window {
    OneSignalDeferred?: OneSignalDeferred;
  }
}

let loaded = false;

export const isOneSignalConfigured = () => Boolean(APP_ID);

export async function initOneSignal(): Promise<boolean> {
  if (typeof window === "undefined" || !APP_ID || loaded) return loaded;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("OneSignal SDK failed to load"));
    document.head.appendChild(script);
  });

  window.OneSignalDeferred = window.OneSignalDeferred ?? [];
  window.OneSignalDeferred.push(async (os) => {
    await (os as { init: (o: Record<string, unknown>) => Promise<void> }).init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
  });

  loaded = true;
  return true;
}

/** Native browser permission request; works with or without OneSignal. */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export function currentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function showLocalNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/icons/icon-192.png" });
}
