import "server-only";

import type { PushSubscription } from "web-push";

type WebPushLibrary = Pick<
  typeof import("web-push"),
  "sendNotification" | "setVapidDetails"
>;

export type WebPushSender = {
  send(subscription: PushSubscription, payload: string): Promise<void>;
};

let vapidConfigured = false;

export const defaultWebPushSender: WebPushSender = {
  async send(subscription, payload) {
    const loaded = await import("web-push");
    const webPush = resolveWebPushLibrary(loaded);
    configureVapid(webPush);
    await webPush.sendNotification(subscription, payload, {
      TTL: 60 * 60,
      urgency: "normal",
    });
  },
};

function configureVapid(webPush: WebPushLibrary) {
  if (vapidConfigured) {
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID environment variables are required");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

function resolveWebPushLibrary(loaded: unknown): WebPushLibrary {
  const module = loaded as {
    default?: WebPushLibrary;
    sendNotification?: WebPushLibrary["sendNotification"];
    setVapidDetails?: WebPushLibrary["setVapidDetails"];
  };
  const candidate = module.default ?? module;
  if (
    typeof candidate.sendNotification !== "function" ||
    typeof candidate.setVapidDetails !== "function"
  ) {
    throw new Error("web-push module could not be initialized");
  }
  return candidate as WebPushLibrary;
}
