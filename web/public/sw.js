"use strict";

const RECOMMENDATION_PATH = "/#today-recommendations";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event.data);
  if (!payload) {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icons/pwa/icon_android_192.png",
      badge: "/icons/pwa/icon_android_192.png",
      tag: `daily-recommendations-${payload.date}`,
      renotify: false,
      data: { path: RECOMMENDATION_PATH },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(openRecommendationPage());
});

function parsePushPayload(data) {
  if (!data) {
    return null;
  }

  try {
    const payload = data.json();
    if (
      typeof payload !== "object" ||
      payload === null ||
      payload.title !== "今日のあなたへのおすすめ" ||
      typeof payload.body !== "string" ||
      payload.body.length === 0 ||
      payload.body.length > 300 ||
      typeof payload.date !== "string" ||
      !DATE_PATTERN.test(payload.date)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

async function openRecommendationPage() {
  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of windowClients) {
    if (new URL(client.url).origin === self.location.origin) {
      if ("navigate" in client) {
        await client.navigate(RECOMMENDATION_PATH);
      }
      return client.focus();
    }
  }
  return self.clients.openWindow(RECOMMENDATION_PATH);
}
