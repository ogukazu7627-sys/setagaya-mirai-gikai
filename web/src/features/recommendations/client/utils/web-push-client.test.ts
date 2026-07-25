// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableWebPush, getPushSupport } from "./web-push-client";

const originalServiceWorker = Object.getOwnPropertyDescriptor(
  navigator,
  "serviceWorker"
);
const originalNotification = Object.getOwnPropertyDescriptor(
  window,
  "Notification"
);
const originalPushManager = Object.getOwnPropertyDescriptor(
  window,
  "PushManager"
);

afterEach(() => {
  vi.restoreAllMocks();
  restoreProperty(navigator, "serviceWorker", originalServiceWorker);
  restoreProperty(window, "Notification", originalNotification);
  restoreProperty(window, "PushManager", originalPushManager);
});

describe("web push client", () => {
  it("does not request permission during feature detection", () => {
    const requestPermission = vi.fn();
    installBrowserPushMocks({ requestPermission });
    expect(getPushSupport()).toEqual({ supported: true });
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("requests permission and subscribes only inside the explicit enable action", async () => {
    const requestPermission = vi.fn().mockResolvedValue("granted");
    const subscribe = vi.fn().mockResolvedValue({
      endpoint: "https://push.example.test/subscription",
      toJSON: () => ({
        endpoint: "https://push.example.test/subscription",
        keys: { p256dh: "p".repeat(32), auth: "a".repeat(16) },
      }),
      unsubscribe: vi.fn(),
    });
    installBrowserPushMocks({ requestPermission, subscribe });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    expect(requestPermission).not.toHaveBeenCalled();
    await enableWebPush({
      installationId: "11111111-1111-4111-8111-111111111111",
      vapidPublicKey: "AQID",
    });

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({ method: "POST" })
    );
  });
});

function installBrowserPushMocks({
  requestPermission,
  subscribe = vi.fn(),
}: {
  requestPermission: ReturnType<typeof vi.fn>;
  subscribe?: ReturnType<typeof vi.fn>;
}) {
  Object.defineProperty(window, "PushManager", {
    configurable: true,
    value: class PushManager {},
  });
  Object.defineProperty(window, "Notification", {
    configurable: true,
    value: {
      permission: "default",
      requestPermission,
    },
  });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      register: vi.fn().mockResolvedValue({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe,
        },
      }),
    },
  });
}

function restoreProperty(
  target: object,
  key: PropertyKey,
  descriptor: PropertyDescriptor | undefined
) {
  if (descriptor) {
    Object.defineProperty(target, key, descriptor);
  } else {
    Reflect.deleteProperty(target, key);
  }
}
