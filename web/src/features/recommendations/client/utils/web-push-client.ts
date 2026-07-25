import { RecommendationClientError } from "./recommendation-api-client";

export type PushSupport =
  | { supported: true }
  | { supported: false; reason: "unsupported" | "denied" };

export function getPushSupport(): PushSupport {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return { supported: false, reason: "unsupported" };
  }
  if (Notification.permission === "denied") {
    return { supported: false, reason: "denied" };
  }
  return { supported: true };
}

export async function enableWebPush(input: {
  installationId: string;
  vapidPublicKey: string;
}): Promise<void> {
  const support = getPushSupport();
  if (!support.supported) {
    throw new Error("Push notifications are unavailable");
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted");
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  let subscription = await registration.pushManager.getSubscription();
  let created = false;
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(input.vapidPublicKey),
    });
    created = true;
  }

  try {
    await requestPushApi("/api/push/subscribe", {
      installationId: input.installationId,
      subscription: subscription.toJSON(),
    });
  } catch (error) {
    if (created) {
      await subscription.unsubscribe().catch(() => false);
    }
    throw error;
  }
}

export async function disableWebPush(installationId: string): Promise<void> {
  let endpoint: string | undefined;
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager?.getSubscription();
    if (subscription) {
      endpoint = subscription.endpoint;
      await subscription.unsubscribe();
    }
  }
  await requestPushApi("/api/push/unsubscribe", {
    installationId,
    endpoint,
  });
}

async function requestPushApi(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: string;
      code?: string;
    } | null;
    throw new RecommendationClientError(
      result?.error ?? "通知設定を変更できません",
      result?.code ?? "push-failed",
      response.status
    );
  }
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}
